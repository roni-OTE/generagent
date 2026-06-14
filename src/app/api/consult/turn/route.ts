import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, BOT_MODEL } from "@/lib/anthropic";
import { buildBotSystemPrompt } from "@/lib/bot/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_QUESTIONS = 15;
const MIN_QUESTIONS = 7;

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

function extractJson(text: string): BotTurn {
  const trimmed = text.trim();
  // 1. fenced ```json ... ```
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1]) as BotTurn; } catch {}
  }
  // 2. first { ... last }
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last > first) {
    try { return JSON.parse(trimmed.slice(first, last + 1)) as BotTurn; } catch {}
  }
  // 3. raw parse
  return JSON.parse(trimmed) as BotTurn;
}

async function callBot(args: {
  systemPrompt: string;
  history: { role: "user" | "assistant"; content: string }[];
}): Promise<BotTurn> {
  const anthropic = getAnthropic();
  let lastRaw = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const resp = await anthropic.messages.create({
      model: BOT_MODEL,
      max_tokens: 900,
      temperature: 0.3,
      system:
        args.systemPrompt +
        (attempt > 0
          ? "\n\n⚠️ ניסיון קודם לא היה JSON תקין. החזר **רק** JSON, מתחיל ב-{ ומסתיים ב-}, ללא טקסט נוסף, ללא code-fence."
          : ""),
      messages: [
        ...args.history,
        // Prefill the assistant turn with "{" to force JSON-mode behavior
        { role: "assistant" as const, content: "{" },
      ],
    });
    const textBlock = resp.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") continue;
    // Prepend the "{" we prefilled
    lastRaw = "{" + textBlock.text;
    try {
      return extractJson(lastRaw);
    } catch {
      // try again
    }
  }
  throw new Error("parse_failed: " + lastRaw.slice(0, 200));
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { consultation_id, user_answer } = await req.json();
  if (!consultation_id || typeof user_answer !== "string") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { data: consultation } = await supabase
    .from("consultations")
    .select("*")
    .eq("id", consultation_id)
    .eq("user_id", user.id)
    .single();

  if (!consultation) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (consultation.status !== "in_progress") {
    return NextResponse.json({ error: "not_in_progress" }, { status: 409 });
  }

  // Load profile to know name
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  // Prior context across consultations
  const { data: prevConsults } = await supabase
    .from("consultations")
    .select("id, detected_persona, analysis_json, completed_at")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .neq("id", consultation_id)
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
        occupation_summary: null,
        existing_agents: existingPackages ?? [],
        previous_consultations_count: prevConsults?.length ?? 0,
      }
    : null;

  await supabase.from("messages").insert({
    consultation_id,
    role: "user",
    content: user_answer,
  });

  const { data: msgs } = await supabase
    .from("messages")
    .select("role, content, question_id, micro_explanation")
    .eq("consultation_id", consultation_id)
    .order("created_at", { ascending: true });

  const history = (msgs ?? []).map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("assistant" as const),
    content: m.role === "user"
      ? m.content
      : JSON.stringify({
          question_id: m.question_id,
          micro_explanation: m.micro_explanation,
          question: m.content,
        }),
  }));

  const nextCount = (consultation.question_count ?? 0) + 1;
  const forceClose = nextCount >= MAX_QUESTIONS;
  const minReached = nextCount >= MIN_QUESTIONS;

  const suffixHint = forceClose
    ? "\n\nשים לב — הגעת ל-15 שאלות. סיים עכשיו, החזר phase='done' ו-should_continue=false."
    : minReached
      ? "\n\nאם confidence ≥ 0.85 אתה יכול לסיים. אחרת המשך."
      : `\n\nשים לב — שאלה ${nextCount} מתוך מינימום ${MIN_QUESTIONS}. **אסור** עדיין לסיים. חייב להחזיר should_continue=true ו-phase != 'done'. תמשיך לשאול ולהעמיק.`;

  let turn: BotTurn;
  try {
    turn = await callBot({
      systemPrompt: buildBotSystemPrompt({ userName: profile?.display_name ?? null, prior }) + suffixHint,
      history,
    });
  } catch (e: unknown) {
    // Soft recovery: return a friendly turn instead of 500 so chat keeps going
    const fallbackTurn: BotTurn = {
      phase: (consultation.phase as BotTurn["phase"]) ?? "discovery",
      question_id: "q-retry",
      micro_explanation: "רגע — לא הבנתי את עצמי. תן לי לנסות שוב.",
      question: "סליחה, פספסתי משהו. תוכל לחזור על מה שאמרת עכשיו? אני רוצה להבין בדיוק.",
      detected_persona: consultation.detected_persona ?? null,
      confidence: Number(consultation.confidence ?? 0),
      should_continue: true,
      internal_notes: "parse_failed soft-recover: " + (e instanceof Error ? e.message.slice(0, 120) : "unknown"),
    };
    turn = fallbackTurn;
  }

  // Capture name from bot's response and update profile
  if (turn.captured_name && typeof turn.captured_name === "string" && turn.captured_name.trim().length > 0) {
    const cleanName = turn.captured_name.trim().slice(0, 60);
    await supabase
      .from("profiles")
      .update({ display_name: cleanName, updated_at: new Date().toISOString() })
      .eq("id", user.id);
  }

  // Hard guard: never close before MIN_QUESTIONS. Bot's "done" before minimum is ignored.
  const botWantsClose = turn.phase === "done" || !turn.should_continue;
  const shouldClose = forceClose || (minReached && botWantsClose);

  // If the bot wanted to close prematurely, override the turn fields so the UI keeps the chat open.
  if (botWantsClose && !shouldClose) {
    turn.phase = consultation.phase === "discovery" ? "discovery" : (turn.phase === "done" ? "deep_dive" : turn.phase);
    turn.should_continue = true;
  }

  await supabase.from("messages").insert({
    consultation_id,
    role: "bot",
    content: turn.question,
    question_id: turn.question_id,
    micro_explanation: turn.micro_explanation,
  });

  await supabase
    .from("consultations")
    .update({
      phase: shouldClose ? "done" : turn.phase,
      question_count: nextCount,
      confidence: turn.confidence,
      detected_persona: turn.detected_persona,
      status: shouldClose ? "analyzing" : "in_progress",
      updated_at: new Date().toISOString(),
    })
    .eq("id", consultation_id);

  return NextResponse.json({ turn, done: shouldClose, question_count: nextCount });
}
