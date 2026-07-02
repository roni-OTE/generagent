import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ANALYSIS_SYSTEM_PROMPT } from "@/lib/bot/prompts";
import { recordUsage } from "@/lib/quota";
import { logEvent } from "@/lib/events";
import { askClaudeJson, LlmError } from "@/lib/llm";

export const runtime = "nodejs";
// Analysis generates up to 8k tokens — 60s was killing the function mid-generation
// and leaving users stuck on "מסיים את האפיון…". Fluid compute allows 300s.
export const maxDuration = 300;

type Analysis = {
  agent_name: string;
  agent_description: string;
  archetype: string;
  persona_match: string;
  core_capabilities: string[];
  required_connectors: string[];
  intro_message_he?: string;
  system_prompt_he: string;
  first_tasks_he: string[];
  guardrails_he: string[];
  target_platform: "claude-code" | "codex" | "both";
  install_difficulty: "easy" | "medium" | "advanced";
  confidence: number;
};

// JSON extraction + retry + prefill + streaming live in @/lib/llm — do not re-implement here.
// (maxTokens 8000 > 4000 → askClaudeJson automatically streams to survive long generations.)

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { consultation_id } = await req.json();
  if (!consultation_id) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { data: consultation } = await supabase
    .from("consultations")
    .select("*")
    .eq("id", consultation_id)
    .eq("user_id", user.id)
    .single();

  if (!consultation) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Idempotency: if already completed (double-click, second tab, auto-retry on
  // page load), return the existing result instead of generating a duplicate.
  if (consultation.status === "completed" && consultation.analysis_json) {
    const { data: existingPkg } = await supabase
      .from("packages")
      .select("id")
      .eq("consultation_id", consultation_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return NextResponse.json({
      analysis: consultation.analysis_json,
      package_id: existingPkg?.id ?? null,
    });
  }

  const { data: msgs } = await supabase
    .from("messages")
    .select("role, content")
    .eq("consultation_id", consultation_id)
    .order("created_at", { ascending: true });

  const transcript = (msgs ?? [])
    .map((m) => `[${m.role}]: ${m.content}`)
    .join("\n\n");

  let analysis: Analysis;
  try {
    const result = await askClaudeJson<Analysis>({
      system: ANALYSIS_SYSTEM_PROMPT,
      messages: [{ role: "user", content: `transcript:\n\n${transcript}\n\nתפיק את האפיון.` }],
      maxTokens: 8000,
    });
    analysis = result.data;
    await recordUsage(supabase, user.id, result.usage.inputTokens, result.usage.outputTokens);
  } catch (e: unknown) {
    console.error("[finalize] failed", e);
    const code = e instanceof LlmError ? e.code : "unknown";
    await logEvent({
      source: "consult.finalize",
      code,
      message: e instanceof Error ? e.message.slice(0, 300) : "unknown",
      meta: { consultation_id, user_id: user.id },
    });
    return NextResponse.json(
      { error: code, detail: e instanceof Error ? e.message.slice(0, 200) : "unknown" },
      { status: 500 }
    );
  }

  await supabase
    .from("consultations")
    .update({
      status: "completed",
      phase: "done",
      completed_at: new Date().toISOString(),
      analysis_json: analysis,
      confidence: analysis.confidence,
      updated_at: new Date().toISOString(),
    })
    .eq("id", consultation_id);

  const targetPlatforms =
    analysis.target_platform === "both"
      ? ["claude-code", "codex"]
      : [analysis.target_platform];

  // Guard against duplicate packages if two finalize calls raced past the
  // idempotency check (e.g. double tab + retry).
  const { data: racedPkg } = await supabase
    .from("packages")
    .select("id")
    .eq("consultation_id", consultation_id)
    .limit(1)
    .maybeSingle();
  if (racedPkg) {
    return NextResponse.json({ analysis, package_id: racedPkg.id });
  }

  const { data: pkg } = await supabase
    .from("packages")
    .insert({
      user_id: user.id,
      consultation_id,
      name: analysis.agent_name,
      description: analysis.agent_description,
      archetype: analysis.archetype,
      target_platform: targetPlatforms,
      manifest_json: analysis,
      required_connectors: analysis.required_connectors ?? [],
      is_template_clone: false,
    })
    .select("id")
    .single();

  if (pkg) {
    await supabase.rpc("increment_custom_agents", { p_user_id: user.id }).then(
      () => undefined,
      () => undefined
    );
  }

  return NextResponse.json({ analysis, package_id: pkg?.id ?? null });
}
