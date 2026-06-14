import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, BOT_MODEL } from "@/lib/anthropic";
import { buildBotSystemPrompt } from "@/lib/bot/prompts";

export const runtime = "nodejs";

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
    | { persona_match?: string; agent_description?: string }
    | null;
  const prior = (prevConsults && prevConsults.length > 0) || (existingPackages && existingPackages.length > 0)
    ? {
        detected_persona: prevConsults?.[0]?.detected_persona ?? latestAnalysis?.persona_match ?? null,
        occupation_summary: latestAnalysis?.agent_description ?? null,
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

  const anthropic = getAnthropic();
  const resp = await anthropic.messages.create({
    model: BOT_MODEL,
    max_tokens: 800,
    system: buildBotSystemPrompt({ userName: profile?.display_name ?? null, prior }),
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
