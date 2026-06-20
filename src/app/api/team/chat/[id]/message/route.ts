import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, BOT_MODEL } from "@/lib/anthropic";
import { TEAM_AGENTS, ONBOARDING_GLOSSARY_RULE } from "@/lib/team/agents";

export const runtime = "nodejs";
export const maxDuration = 60;

type AnyMsg = {
  role: "user" | "agent" | "tool";
  content: string;
};

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("plan, display_name").eq("id", user.id).single();
  if (me?.plan !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { text?: string };
  const userText = (body.text ?? "").trim().slice(0, 4000);
  if (!userText) return NextResponse.json({ error: "empty" }, { status: 400 });

  // Load chat + verify ownership
  const { data: chat } = await supabase
    .from("team_agent_chats")
    .select("id, agent_handle, user_id, title")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!chat) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const agent = TEAM_AGENTS.find((a) => a.handle === chat.agent_handle);
  if (!agent) return NextResponse.json({ error: "bad_agent" }, { status: 500 });

  // Save user message
  await supabase.from("team_agent_messages").insert({
    chat_id: chat.id,
    role: "user",
    content: userText,
  });

  // Load conversation history
  const { data: prevMsgs } = await supabase
    .from("team_agent_messages")
    .select("role, content")
    .eq("chat_id", chat.id)
    .order("created_at", { ascending: true });

  const history: { role: "user" | "assistant"; content: string }[] = (prevMsgs ?? [])
    .filter((m) => m.role !== "tool")
    .map((m: AnyMsg) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

  const founderName = me.display_name || "רוני";
  const system =
    agent.system_prompt +
    ONBOARDING_GLOSSARY_RULE +
    `\n\nאת/ה משוחח/ת ישירות עם ${founderName}, מייסד GenerAgent, באמצעות פלטפורמת הצוות הפנימית. ענה/עני בעברית, בטון של ${agent.name}. הודעות קצרות-בינוניות (2-6 משפטים). אל תשתמש ב-JSON — זה צ׳אט רגיל.`;

  let agentText = "";
  let usageIn = 0;
  let usageOut = 0;
  try {
    const anthropic = getAnthropic();
    const resp = await anthropic.messages.create({
      model: BOT_MODEL,
      max_tokens: 1000,
      temperature: 0.5,
      system,
      messages: history,
    });
    usageIn = resp.usage?.input_tokens ?? 0;
    usageOut = resp.usage?.output_tokens ?? 0;
    const tb = resp.content.find((b) => b.type === "text");
    agentText = (tb && tb.type === "text") ? tb.text.trim() : "";
  } catch (e) {
    agentText = "סליחה, משהו השתבש בצד שלי. אפשר לנסות שוב?";
    console.error("[team chat] anthropic error", e);
  }

  // Save agent reply
  const { data: agentMsg } = await supabase
    .from("team_agent_messages")
    .insert({
      chat_id: chat.id,
      role: "agent",
      content: agentText,
    })
    .select("id, created_at")
    .single();

  // Auto-title from first user message if missing
  if (!chat.title) {
    const title = userText.slice(0, 80);
    await supabase.from("team_agent_chats").update({ title, updated_at: new Date().toISOString() }).eq("id", chat.id);
  } else {
    await supabase.from("team_agent_chats").update({ updated_at: new Date().toISOString() }).eq("id", chat.id);
  }

  return NextResponse.json({
    ok: true,
    agent_reply: { id: agentMsg?.id, content: agentText, created_at: agentMsg?.created_at },
    usage: { input: usageIn, output: usageOut },
  });
}
