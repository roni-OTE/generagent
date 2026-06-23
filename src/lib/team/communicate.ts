/**
 * Inter-agent communication.
 *
 * When agent A wants to ask agent B something, we synchronously:
 * 1. Look up B's persona + recent memory
 * 2. Call Anthropic with B's system prompt + the question
 * 3. Log the exchange to inter_agent_messages
 * 4. Return B's answer to A as the tool result
 *
 * Important: the target agent (B) does NOT get tools when called this way.
 * It just answers from its persona + memory. This prevents recursion
 * (B can't ping someone back inside a ping) and keeps latency predictable.
 */
import { randomUUID } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { getAnthropic, BOT_MODEL } from "@/lib/anthropic";
import { TEAM_AGENTS, ONBOARDING_GLOSSARY_RULE } from "@/lib/team/agents";
import { TEAM_DISAMBIGUATION_RULE, ANTI_HALLUCINATION_RULE } from "@/lib/team/tools";

export type AskAgentResult = {
  ok: boolean;
  to_agent: string;
  to_name?: string;
  response?: string;
  error?: string;
};

/** Read the target agent's persistent memory so they have context. */
async function readMemorySnippet(agentHandle: string): Promise<string> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("agent_memory")
    .select("memory_type, content, importance")
    .eq("agent_handle", agentHandle)
    .order("importance", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(8);
  if (!data || data.length === 0) return "";
  const lines = data.map((m) => `- (${m.memory_type}) ${m.content}`);
  return `\n\n### זיכרון אישי שלך (מה שלמדת קודם)\n${lines.join("\n")}`;
}

/**
 * Ask another team agent a question and get their reply.
 * Returns the reply text (or an error).
 */
export async function askAgent(opts: {
  fromHandle: string;
  toHandle: string;
  message: string;
  meetingId?: string | null;
  sourceChatId?: string | null;
}): Promise<AskAgentResult> {
  const { fromHandle, toHandle, message, meetingId = null, sourceChatId = null } = opts;

  const fromAgent = TEAM_AGENTS.find((a) => a.handle === fromHandle);
  const toAgent = TEAM_AGENTS.find((a) => a.handle === toHandle);

  if (!toAgent) {
    return { ok: false, to_agent: toHandle, error: `unknown_agent: ${toHandle}` };
  }
  if (toAgent.handle === fromHandle) {
    return { ok: false, to_agent: toHandle, error: "cannot_ping_self" };
  }
  const trimmed = message.trim().slice(0, 2000);
  if (!trimmed) {
    return { ok: false, to_agent: toHandle, error: "empty_message" };
  }

  const supabase = createServiceClient();
  const memorySnippet = await readMemorySnippet(toAgent.handle);

  const system =
    toAgent.system_prompt +
    ONBOARDING_GLOSSARY_RULE +
    TEAM_DISAMBIGUATION_RULE +
    ANTI_HALLUCINATION_RULE +
    memorySnippet +
    `\n\n## הקשר עכשיו\n${fromAgent?.name ?? fromHandle} פנה/פנתה אליך עם שאלה / בקשה. תענה/תעני ישירות בעברית, בטון של ${toAgent.name}, בקצרה ולעניין (2-6 משפטים). אל תוסיף JSON ואל תוסיף תיוגים — רק התשובה האנושית.`;

  let responseText = "";
  let errMessage: string | undefined;
  try {
    const anthropic = getAnthropic();
    const resp = await anthropic.messages.create({
      model: BOT_MODEL,
      max_tokens: 700,
      temperature: 0.5,
      system,
      messages: [
        {
          role: "user",
          content: `${fromAgent?.name ?? fromHandle} שואל/ת אותך:\n\n${trimmed}`,
        },
      ],
    });
    const textBlock = resp.content.find((b) => b.type === "text");
    if (textBlock && textBlock.type === "text") {
      responseText = textBlock.text.trim();
    } else {
      errMessage = "no_text_response";
    }
  } catch (e) {
    errMessage = e instanceof Error ? e.message : "anthropic_error";
  }

  // Log the exchange (best-effort; don't fail the call if logging fails)
  try {
    await supabase.from("inter_agent_messages").insert({
      from_agent: fromHandle,
      to_agent: toHandle,
      message: trimmed,
      response: responseText || null,
      meeting_id: meetingId,
      source_chat_id: sourceChatId,
    });
  } catch (e) {
    console.error("[communicate] log insert failed", e);
  }

  if (errMessage && !responseText) {
    return { ok: false, to_agent: toHandle, to_name: toAgent.name, error: errMessage };
  }
  return { ok: true, to_agent: toHandle, to_name: toAgent.name, response: responseText };
}

/**
 * Ask multiple agents in parallel and collect their answers.
 */
export async function callTeamMeeting(opts: {
  fromHandle: string;
  toHandles: string[];
  topic: string;
  sourceChatId?: string | null;
}): Promise<{ meeting_id: string; topic: string; responses: AskAgentResult[] }> {
  const meetingId = randomUUID();
  const uniqueTargets = [...new Set(opts.toHandles)].filter((h) => h !== opts.fromHandle);

  const responses = await Promise.all(
    uniqueTargets.map((h) =>
      askAgent({
        fromHandle: opts.fromHandle,
        toHandle: h,
        message: opts.topic,
        meetingId,
        sourceChatId: opts.sourceChatId ?? null,
      })
    )
  );

  return { meeting_id: meetingId, topic: opts.topic, responses };
}
