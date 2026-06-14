import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, BOT_MODEL } from "@/lib/anthropic";
import { ANALYSIS_SYSTEM_PROMPT } from "@/lib/bot/prompts";

export const runtime = "nodejs";

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

function extractJson<T>(text: string): T {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1]) as T; } catch {}
  }
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last > first) {
    try { return JSON.parse(trimmed.slice(first, last + 1)) as T; } catch {}
  }
  return JSON.parse(trimmed) as T;
}

async function callAnalyst(args: {
  system: string;
  userMessage: string;
}): Promise<Analysis> {
  const anthropic = getAnthropic();
  let lastRaw = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const resp = await anthropic.messages.create({
      model: BOT_MODEL,
      max_tokens: 3000,
      temperature: 0.3,
      system:
        args.system +
        (attempt > 0
          ? "\n\n⚠️ ניסיון קודם לא היה JSON תקין. החזר **רק** JSON, מתחיל ב-{ ומסתיים ב-}, ללא טקסט נוסף, ללא code-fence."
          : ""),
      messages: [
        { role: "user" as const, content: args.userMessage },
        { role: "assistant" as const, content: "{" },
      ],
    });
    const textBlock = resp.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") continue;
    lastRaw = "{" + textBlock.text;
    try {
      return extractJson<Analysis>(lastRaw);
    } catch {
      // try again
    }
  }
  throw new Error("analyst_parse_failed: " + lastRaw.slice(0, 200));
}

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
    analysis = await callAnalyst({
      system: ANALYSIS_SYSTEM_PROMPT,
      userMessage: `transcript:\n\n${transcript}\n\nתפיק את האפיון.`,
    });
  } catch (e: unknown) {
    console.error("[finalize] parse failed after retries", e);
    return NextResponse.json(
      { error: "parse_failed", detail: e instanceof Error ? e.message.slice(0, 200) : "unknown" },
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
