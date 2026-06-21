import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, BOT_MODEL } from "@/lib/anthropic";
import { TEAM_AGENTS, ONBOARDING_GLOSSARY_RULE } from "@/lib/team/agents";
import {
  getToolsForAgent,
  executeTool,
  toAnthropicTools,
  ANTI_HALLUCINATION_RULE,
} from "@/lib/team/tools";

export const runtime = "nodejs";
export const maxDuration = 60;

type AnyMsg = { role: "user" | "agent" | "tool"; content: string };

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

  const { data: chat } = await supabase
    .from("team_agent_chats")
    .select("id, agent_handle, user_id, title")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!chat) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const agent = TEAM_AGENTS.find((a) => a.handle === chat.agent_handle);
  if (!agent) return NextResponse.json({ error: "bad_agent" }, { status: 500 });

  await supabase.from("team_agent_messages").insert({
    chat_id: chat.id,
    role: "user",
    content: userText,
  });

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
  const tools = getToolsForAgent(agent.handle);
  const system =
    agent.system_prompt +
    ONBOARDING_GLOSSARY_RULE +
    ANTI_HALLUCINATION_RULE +
    `\n\nאת/ה משוחח/ת ישירות עם ${founderName}, מייסד GenerAgent, בצ׳אט חי. ענה בעברית, בטון של ${agent.name}. הודעות קצרות-בינוניות.\n\nיש לך כלים שיכולים לבדוק נתונים אמיתיים מהמערכת — **השתמש בהם** במקום לנחש. תמיד בתחילת שיחה חדשה (או כשנשאלת על העבר) — קרא את הזיכרון שלך עם read_my_memory. בסוף שיחה משמעותית, שמור בזיכרון את מה שלמדת עם save_to_memory.`;

  const anthropic = getAnthropic();
  const anthropicTools = tools.length > 0 ? toAnthropicTools(tools) : undefined;

  let finalText = "";
  let toolCallsLog: { name: string; input: unknown; result: unknown }[] = [];

  try {
    // Conversation loop — up to 5 tool roundtrips
    type AnthropicMsg = { role: "user" | "assistant"; content: string | unknown[] };
    const conversation: AnthropicMsg[] = history.map((m) => ({ role: m.role, content: m.content }));

    for (let step = 0; step < 5; step++) {
      const resp = await anthropic.messages.create({
        model: BOT_MODEL,
        max_tokens: 1200,
        temperature: 0.5,
        system,
        ...(anthropicTools ? { tools: anthropicTools } : {}),
        messages: conversation as never,
      });

      // Check for tool use
      const toolUseBlocks = resp.content.filter((b) => b.type === "tool_use");
      const textBlocks = resp.content.filter((b) => b.type === "text");

      if (toolUseBlocks.length === 0) {
        // Final text response
        finalText = textBlocks
          .map((b) => (b.type === "text" ? b.text : ""))
          .join("\n")
          .trim();
        break;
      }

      // Execute tools and feed back
      conversation.push({ role: "assistant", content: resp.content as unknown[] });
      const toolResults: unknown[] = [];
      for (const tu of toolUseBlocks) {
        if (tu.type !== "tool_use") continue;
        const toolName = tu.name;
        const toolInput = (tu.input as Record<string, unknown>) ?? {};
        let result: unknown;
        try {
          result = await executeTool(toolName, toolInput, {
            agentHandle: agent.handle,
            chatId: chat.id,
          });
        } catch (e) {
          result = { error: e instanceof Error ? e.message : "tool_error" };
        }
        toolCallsLog.push({ name: toolName, input: toolInput, result });
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: JSON.stringify(result).slice(0, 4000),
        });
      }
      conversation.push({ role: "user", content: toolResults });
    }

    if (!finalText) {
      finalText = "(לא הגיע לתשובה סופית — יתכן שהיו יותר מדי tool calls)";
    }
  } catch (e) {
    finalText = "סליחה, משהו השתבש בצד שלי. אפשר לנסות שוב?";
    console.error("[team chat] anthropic error", e);
  }

  // Save tool calls log if any
  if (toolCallsLog.length > 0) {
    for (const tc of toolCallsLog) {
      await supabase.from("team_agent_messages").insert({
        chat_id: chat.id,
        role: "tool",
        content: `${tc.name}(${JSON.stringify(tc.input).slice(0, 200)})`,
        tool_name: tc.name,
        tool_args: tc.input as object,
        tool_result: tc.result as object,
      });
    }
  }

  const { data: agentMsg } = await supabase
    .from("team_agent_messages")
    .insert({
      chat_id: chat.id,
      role: "agent",
      content: finalText,
    })
    .select("id, created_at")
    .single();

  if (!chat.title) {
    const title = userText.slice(0, 80);
    await supabase.from("team_agent_chats").update({ title, updated_at: new Date().toISOString() }).eq("id", chat.id);
  } else {
    await supabase.from("team_agent_chats").update({ updated_at: new Date().toISOString() }).eq("id", chat.id);
  }

  return NextResponse.json({
    ok: true,
    agent_reply: { id: agentMsg?.id, content: finalText, created_at: agentMsg?.created_at },
    tool_calls: toolCallsLog.map((t) => t.name),
  });
}
