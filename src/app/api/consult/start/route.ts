import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildBotSystemPrompt } from "@/lib/bot/prompts";
import { getQuotaStatus, recordUsage } from "@/lib/quota";
import { logEvent } from "@/lib/events";
import { askClaudeJson, LlmError } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 60;

type BotTurn = {
  phase: "discovery" | "deep_dive" | "refinement" | "done";
  question_id: string;
  micro_explanation: string;
  question: string;
  captured_name?: string | null;
  detected_persona: string | null;
  confidence: number;
  should_continue: boolean;
  internal_notes: string;
};

// JSON extraction + retry + prefill live in @/lib/llm — do not re-implement here.

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // Quota gate
  const quota = await getQuotaStatus(supabase, user.id);
  if (quota?.blocked) {
    return NextResponse.json(
      {
        error: "quota_exceeded",
        message: `הגעת למקסימום הטוקנים החודשי שלך (${quota.limit.toLocaleString()}). יתאפס בעוד ${quota.reset_in_days} ימים, או שדרג ל-Pro.`,
        reset_in_days: quota.reset_in_days,
      },
      { status: 429 }
    );
  }

  let body: { source_template_id?: string | null } = {};
  try { body = await req.json(); } catch {}

  // Load profile to know the user's display name
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", user.id)
    .single();

  // Build prior-context from completed consultations + existing agents
  const { data: prevConsults } = await supabase
    .from("consultations")
    .select("id, detected_persona, analysis_json, completed_at")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(5);

  const { data: existingPackages } = await supabase
    .from("packages")
    .select("name, archetype")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(8);

  const latestAnalysis = (prevConsults?.[0]?.analysis_json ?? null) as
    | { persona_match?: string }
    | null;
  const prior = (prevConsults && prevConsults.length > 0) || (existingPackages && existingPackages.length > 0)
    ? {
        detected_persona: prevConsults?.[0]?.detected_persona ?? latestAnalysis?.persona_match ?? null,
        occupation_summary: null, // never re-use agent_description as user's role — that's the agent's role
        existing_agents: existingPackages ?? [],
        previous_consultations_count: prevConsults?.length ?? 0,
      }
    : null;

  const { data: consultation, error: cErr } = await supabase
    .from("consultations")
    .insert({
      user_id: user.id,
      status: "in_progress",
      phase: "discovery",
      source_template_id: body.source_template_id ?? null,
    })
    .select()
    .single();

  if (cErr || !consultation) {
    return NextResponse.json({ error: cErr?.message ?? "create_failed" }, { status: 500 });
  }

  const systemPrompt = buildBotSystemPrompt({ userName: profile?.display_name ?? null, prior });

  let turn: BotTurn | null = null;
  let lastErr = "";
  let lastErrCode = "start_failed";
  try {
    const result = await askClaudeJson<BotTurn>({
      system: systemPrompt,
      messages: [{ role: "user", content: "התחל את הייעוץ. השאלה הראשונה." }],
      maxTokens: 800,
    });
    turn = result.data;
    await recordUsage(supabase, user.id, result.usage.inputTokens, result.usage.outputTokens);
  } catch (e: unknown) {
    lastErr = e instanceof Error ? e.message.slice(0, 300) : "unknown";
    if (e instanceof LlmError) lastErrCode = e.code;
  }

  if (!turn) {
    await logEvent({
      source: "consult.start",
      code: lastErrCode,
      message: lastErr,
      meta: { user_id: user.id },
    });
    // Don't leave an orphaned empty consultation behind — it clutters the sidebar
    // and opens to a dead chat.
    await supabase.from("consultations").delete().eq("id", consultation.id);
    return NextResponse.json(
      { error: "start_failed", message: "לא הצלחתי לפתוח שיחה כרגע. נסה שוב בעוד רגע.", detail: lastErr },
      { status: 500 }
    );
  }

  await supabase.from("messages").insert({
    consultation_id: consultation.id,
    role: "bot",
    content: turn.question,
    question_id: turn.question_id,
    micro_explanation: turn.micro_explanation,
  });

  await supabase
    .from("consultations")
    .update({
      phase: turn.phase === "done" ? "done" : turn.phase,
      question_count: 1,
      confidence: turn.confidence,
      detected_persona: turn.detected_persona,
      updated_at: new Date().toISOString(),
    })
    .eq("id", consultation.id);

  return NextResponse.json({ consultation_id: consultation.id, turn });
}
