import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { REVISION_SYSTEM_PROMPT } from "@/lib/bot/prompts";
import { getQuotaStatus, recordUsage } from "@/lib/quota";
import { logEvent } from "@/lib/events";
import { askClaudeJson, LlmError } from "@/lib/llm";

export const runtime = "nodejs";
// Revision regenerates the full analysis (up to 8k tokens) — same headroom as finalize.
export const maxDuration = 300;

// Next.js route files may only export route fields — keep this local.
const MAX_REVISIONS = 3;

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

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { consultation_id, revision_request } = await req.json();
  if (
    !consultation_id ||
    typeof revision_request !== "string" ||
    revision_request.trim().length < 3
  ) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const request = revision_request.trim().slice(0, 2000);

  const { data: consultation } = await supabase
    .from("consultations")
    .select("*")
    .eq("id", consultation_id)
    .eq("user_id", user.id)
    .single();

  if (!consultation) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (consultation.status !== "completed" || !consultation.analysis_json) {
    return NextResponse.json({ error: "not_completed" }, { status: 409 });
  }

  // Revision cap: user revision requests are stored as messages created after
  // completion — count them instead of adding a schema column.
  const { count: revisionsUsed } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("consultation_id", consultation_id)
    .eq("role", "user")
    .gt("created_at", consultation.completed_at);
  if ((revisionsUsed ?? 0) >= MAX_REVISIONS) {
    return NextResponse.json(
      {
        error: "revision_cap_reached",
        message: `אפשר לדייק עד ${MAX_REVISIONS} פעמים לכל סוכן. לשינוי גדול יותר — התחל שיחה חדשה עם נועם.`,
      },
      { status: 429 }
    );
  }

  // Quota gate (period-level; a revision is one heavy LLM call)
  const quota = await getQuotaStatus(supabase, user.id);
  if (quota?.blocked) {
    return NextResponse.json(
      {
        error: "quota_exceeded",
        message: `נגמר לך הקצב החודשי (${quota.limit.toLocaleString()} טוקנים). יתאפס בעוד ${quota.reset_in_days} ימים.`,
      },
      { status: 429 }
    );
  }

  const current = consultation.analysis_json as Analysis;

  let analysis: Analysis;
  try {
    const result = await askClaudeJson<Analysis>({
      system: REVISION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `האפיון הנוכחי:\n\n${JSON.stringify(current, null, 2)}\n\nבקשת הדיוק של המשתמש:\n"""\n${request}\n"""\n\nהחזר את ה-JSON המעודכן במלואו.`,
        },
      ],
      maxTokens: 8000,
    });
    analysis = result.data;
    await recordUsage(supabase, user.id, result.usage.inputTokens, result.usage.outputTokens);
  } catch (e: unknown) {
    console.error("[revise] failed", e);
    const code = e instanceof LlmError ? e.code : "unknown";
    await logEvent({
      source: "consult.revise",
      code,
      message: e instanceof Error ? e.message.slice(0, 300) : "unknown",
      meta: { consultation_id, user_id: user.id },
    });
    return NextResponse.json(
      { error: code, detail: e instanceof Error ? e.message.slice(0, 200) : "unknown" },
      { status: 500 }
    );
  }

  // Defensive: a revision must never wipe required fields. Fall back to the
  // previous value for anything the model dropped.
  analysis = {
    ...current,
    ...analysis,
    core_capabilities: analysis.core_capabilities?.length ? analysis.core_capabilities : current.core_capabilities,
    first_tasks_he: analysis.first_tasks_he?.length ? analysis.first_tasks_he : current.first_tasks_he,
    guardrails_he: analysis.guardrails_he ?? current.guardrails_he,
    required_connectors: analysis.required_connectors ?? current.required_connectors,
    system_prompt_he: analysis.system_prompt_he || current.system_prompt_he,
  };

  await supabase
    .from("consultations")
    .update({
      analysis_json: analysis,
      confidence: analysis.confidence,
      updated_at: new Date().toISOString(),
    })
    .eq("id", consultation_id);

  // The install script (/api/install/[id]) serves packages.manifest_json first —
  // the package MUST be updated too, or the user installs the stale agent.
  const targetPlatforms =
    analysis.target_platform === "both" ? ["claude-code", "codex"] : [analysis.target_platform];
  await supabase
    .from("packages")
    .update({
      name: analysis.agent_name,
      description: analysis.agent_description,
      archetype: analysis.archetype,
      target_platform: targetPlatforms,
      manifest_json: analysis,
      required_connectors: analysis.required_connectors ?? [],
    })
    .eq("consultation_id", consultation_id)
    .eq("user_id", user.id);

  // Record the revision in the transcript (also drives the revision cap above).
  await supabase.from("messages").insert([
    { consultation_id, role: "user", content: `[בקשת דיוק] ${request}` },
    {
      consultation_id,
      // messages.role CHECK allows only 'bot' | 'user' | 'system'
      role: "bot",
      content: `[האפיון עודכן] ${analysis.agent_name} — הדיוק בוצע לפי הבקשה.`,
    },
  ]);

  await logEvent({
    level: "info",
    source: "consult.revise",
    code: "ok",
    message: "revision applied",
    meta: { consultation_id, user_id: user.id, revision_number: (revisionsUsed ?? 0) + 1 },
  });

  return NextResponse.json({
    analysis,
    revisions_left: MAX_REVISIONS - (revisionsUsed ?? 0) - 1,
  });
}
