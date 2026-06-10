import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, BOT_MODEL } from "@/lib/anthropic";
import { BOT_SYSTEM_PROMPT } from "@/lib/bot/prompts";

export const runtime = "nodejs";

type BotTurn = {
  phase: "discovery" | "deep_dive" | "refinement" | "done";
  question_id: string;
  micro_explanation: string;
  question: string;
  detected_persona: string | null;
  confidence: number;
  should_continue: boolean;
  internal_notes: string;
};

function extractJson(text: string): BotTurn {
  const trimmed = text.trim();
  // Strip code fences if present
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenceMatch ? fenceMatch[1] : trimmed;
  return JSON.parse(candidate) as BotTurn;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let body: { source_template_id?: string | null } = {};
  try { body = await req.json(); } catch {}

  // Create consultation row
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

  // Call Claude for first turn
  const anthropic = getAnthropic();
  const resp = await anthropic.messages.create({
    model: BOT_MODEL,
    max_tokens: 800,
    system: BOT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: "התחל את הייעוץ. השאלה הראשונה." }],
  });

  const textBlock = resp.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return NextResponse.json({ error: "no_text_response" }, { status: 500 });
  }

  let turn: BotTurn;
  try {
    turn = extractJson(textBlock.text);
  } catch {
    return NextResponse.json({ error: "parse_failed", raw: textBlock.text }, { status: 500 });
  }

  // Persist bot message
  await supabase.from("messages").insert({
    consultation_id: consultation.id,
    role: "bot",
    content: turn.question,
    question_id: turn.question_id,
    micro_explanation: turn.micro_explanation,
  });

  // Update consultation counters
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

  return NextResponse.json({
    consultation_id: consultation.id,
    turn,
  });
}
