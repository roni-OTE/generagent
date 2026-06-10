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
  system_prompt_he: string;
  first_tasks_he: string[];
  guardrails_he: string[];
  target_platform: "claude-code" | "codex" | "both";
  install_difficulty: "easy" | "medium" | "advanced";
  confidence: number;
};

function extractJson(text: string): Analysis {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenceMatch ? fenceMatch[1] : trimmed;
  return JSON.parse(candidate) as Analysis;
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

  const anthropic = getAnthropic();
  const resp = await anthropic.messages.create({
    model: BOT_MODEL,
    max_tokens: 2000,
    system: ANALYSIS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: `transcript:\n\n${transcript}\n\nתפיק את האפיון.` }],
  });

  const textBlock = resp.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return NextResponse.json({ error: "no_text_response" }, { status: 500 });
  }

  let analysis: Analysis;
  try {
    analysis = extractJson(textBlock.text);
  } catch {
    return NextResponse.json({ error: "parse_failed", raw: textBlock.text }, { status: 500 });
  }

  // Update consultation
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

  return NextResponse.json({ analysis });
}
