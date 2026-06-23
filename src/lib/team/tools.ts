import { createServiceClient } from "@/lib/supabase/server";
import { askAgent, callTeamMeeting } from "@/lib/team/communicate";

/**
 * Tool definitions for team agents (Anthropic Tool Use format).
 * Each tool has: name, description, input_schema, and an executor function.
 */

type ToolProp = {
  type: string;
  description: string;
  enum?: string[];
  items?: { type: string; enum?: string[] };
};

export type ToolDef = {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, ToolProp>;
    required?: string[];
  };
};

export const ALL_TOOLS: Record<string, ToolDef> = {
  list_recent_consultations: {
    name: "list_recent_consultations",
    description:
      "Returns a list of the most recent user consultations (Noam interviews) with their status and basic metadata. Use when you need to understand recent user activity, find stuck consultations, or measure conversion. Returns at most 20 rows.",
    input_schema: {
      type: "object",
      properties: {
        hours_ago: { type: "number", description: "How many hours back to look (default 168 = 1 week)" },
        status_filter: {
          type: "string",
          description: "Optional: filter by status",
          enum: ["in_progress", "analyzing", "completed", "abandoned"],
        },
      },
    },
  },
  list_recent_agents: {
    name: "list_recent_agents",
    description:
      "Returns user-created agents (packages) recently produced via Noam. Use to track how many agents were made, what archetypes, who they're for.",
    input_schema: {
      type: "object",
      properties: {
        hours_ago: { type: "number", description: "How many hours back (default 168)" },
      },
    },
  },
  get_user_metrics: {
    name: "get_user_metrics",
    description:
      "Returns aggregate counts: total users, new in last 48h, active in 7 days. Use to answer 'how is growth' or 'who's actively using'.",
    input_schema: { type: "object", properties: {} },
  },
  get_token_usage_summary: {
    name: "get_token_usage_summary",
    description:
      "Returns total tokens used in the last N hours across all users, and top consumers. Use when you need to monitor Anthropic spend or detect anomalies.",
    input_schema: {
      type: "object",
      properties: { hours_ago: { type: "number", description: "Default 24" } },
    },
  },
  list_recent_standups: {
    name: "list_recent_standups",
    description:
      "Returns the last few team standups: date, highlights, open decisions. Use to recall what the team committed to recently.",
    input_schema: {
      type: "object",
      properties: { limit: { type: "number", description: "Default 3, max 10" } },
    },
  },
  list_my_recent_chats: {
    name: "list_my_recent_chats",
    description:
      "Returns this agent's own recent chats with the founder (titles + last activity). Use to recall what you discussed with the founder recently.",
    input_schema: {
      type: "object",
      properties: { limit: { type: "number", description: "Default 5, max 15" } },
    },
  },
  read_my_memory: {
    name: "read_my_memory",
    description:
      "Returns this agent's persistent memory: things you learned, preferences the founder shared, context. Use this whenever you start a chat to recall what you know.",
    input_schema: {
      type: "object",
      properties: { limit: { type: "number", description: "Default 10, max 30" } },
    },
  },
  save_to_memory: {
    name: "save_to_memory",
    description:
      "Save something to this agent's persistent memory so you remember it across future chats. Use when: founder gives a preference ('always X'), you learn an important fact about the product, or a decision is made. Keep entries SHORT (1-2 sentences). Importance 1-10 (10 = critical).",
    input_schema: {
      type: "object",
      properties: {
        memory_type: {
          type: "string",
          description: "Category of memory",
          enum: ["learning", "preference", "context", "decision"],
        },
        content: { type: "string", description: "The memory itself, 1-2 sentences in Hebrew" },
        importance: { type: "number", description: "1-10, default 5" },
      },
      required: ["memory_type", "content"],
    },
  },
  ping_agent: {
    name: "ping_agent",
    description:
      "Send a question or request to another team agent and synchronously get their reply (in their voice). Use when you need a teammate's input before answering the founder — e.g. Tamar asking Yoav 'how long would this take to build?' or asking Rony 'any errors in the last 24h?'. The target agent will answer from their persona + their own memory. One call = one teammate. For multiple teammates use call_team_meeting.",
    input_schema: {
      type: "object",
      properties: {
        agent_handle: {
          type: "string",
          description: "The handle of the agent to ping",
          enum: ["tamar", "yoav", "rony", "dana", "shira", "ariel"],
        },
        message: {
          type: "string",
          description: "The question / request in Hebrew, 1-3 sentences. Be specific.",
        },
      },
      required: ["agent_handle", "message"],
    },
  },
  call_team_meeting: {
    name: "call_team_meeting",
    description:
      "Ask the same question to several teammates in parallel and collect all their answers. Use when a decision needs cross-functional input — e.g. 'should we ship X this week?' to Yoav (eng), Rony (reliability), Ariel (release). Returns each agent's reply as a list.",
    input_schema: {
      type: "object",
      properties: {
        agent_handles: {
          type: "array",
          description: "List of agent handles to invite (2-5 agents). Self is excluded automatically.",
          items: { type: "string", enum: ["tamar", "yoav", "rony", "dana", "shira", "ariel"] },
        },
        topic: {
          type: "string",
          description: "The question / topic in Hebrew. Same text goes to every participant.",
        },
      },
      required: ["agent_handles", "topic"],
    },
  },
};

/** Which tools each agent has access to. Agents not listed = no tools. */
export const AGENT_TOOLS: Record<string, string[]> = {
  tamar: [
    "list_recent_consultations",
    "list_recent_agents",
    "get_user_metrics",
    "get_token_usage_summary",
    "list_recent_standups",
    "list_my_recent_chats",
    "read_my_memory",
    "save_to_memory",
    "ping_agent",
    "call_team_meeting",
  ],
  yoav: [
    "list_recent_consultations",
    "list_recent_agents",
    "list_my_recent_chats",
    "read_my_memory",
    "save_to_memory",
    "ping_agent",
  ],
  rony: [
    "get_token_usage_summary",
    "get_user_metrics",
    "list_recent_consultations",
    "list_my_recent_chats",
    "read_my_memory",
    "save_to_memory",
    "ping_agent",
  ],
  dana: [
    "list_recent_consultations",
    "list_recent_agents",
    "get_user_metrics",
    "list_my_recent_chats",
    "read_my_memory",
    "save_to_memory",
    "ping_agent",
  ],
  shira: [
    "get_user_metrics",
    "list_recent_agents",
    "list_my_recent_chats",
    "read_my_memory",
    "save_to_memory",
    "ping_agent",
  ],
  ariel: [
    "list_recent_standups",
    "list_recent_agents",
    "list_my_recent_chats",
    "read_my_memory",
    "save_to_memory",
    "ping_agent",
  ],
};

export function getToolsForAgent(handle: string): ToolDef[] {
  const allowed = AGENT_TOOLS[handle] ?? [];
  return allowed.map((n) => ALL_TOOLS[n]).filter(Boolean);
}

/** Execute a tool. Returns JSON-serializable result. */
export async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  ctx: { agentHandle: string; chatId?: string | null }
): Promise<unknown> {
  const supabase = createServiceClient();

  switch (toolName) {
    case "list_recent_consultations": {
      const hours = Number(input.hours_ago ?? 168);
      const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
      let q = supabase
        .from("consultations")
        .select("id, status, phase, question_count, detected_persona, created_at, completed_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(20);
      if (input.status_filter) q = q.eq("status", String(input.status_filter));
      const { data } = await q;
      return { count: data?.length ?? 0, items: data ?? [] };
    }

    case "list_recent_agents": {
      const hours = Number(input.hours_ago ?? 168);
      const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
      const { data } = await supabase
        .from("packages")
        .select("id, name, archetype, persona_match: manifest_json->persona_match, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(20);
      return { count: data?.length ?? 0, items: data ?? [] };
    }

    case "get_user_metrics": {
      const now = Date.now();
      const day = 24 * 3600 * 1000;
      const [{ count: total }, { count: new48 }, { count: new7d }] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", new Date(now - 2 * day).toISOString()),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", new Date(now - 7 * day).toISOString()),
      ]);
      return {
        total_users: total ?? 0,
        new_in_48h: new48 ?? 0,
        new_in_7d: new7d ?? 0,
      };
    }

    case "get_token_usage_summary": {
      const hours = Number(input.hours_ago ?? 24);
      const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
      const { data } = await supabase
        .from("profiles")
        .select("id, email, tokens_used_period, tokens_lifetime, plan")
        .gte("updated_at", since)
        .order("tokens_used_period", { ascending: false })
        .limit(10);
      const totalUsed = (data ?? []).reduce((s, r) => s + Number(r.tokens_used_period ?? 0), 0);
      return {
        hours_window: hours,
        total_active_users: data?.length ?? 0,
        sum_tokens_period_active: totalUsed,
        top_consumers: (data ?? []).slice(0, 5).map((r) => ({
          email: r.email,
          plan: r.plan,
          tokens_used_period: r.tokens_used_period,
        })),
      };
    }

    case "list_recent_standups": {
      const limit = Math.min(Number(input.limit ?? 3), 10);
      const { data } = await supabase
        .from("team_standups")
        .select("id, standup_date, highlights, decisions_needed")
        .order("standup_date", { ascending: false })
        .limit(limit);
      return { count: data?.length ?? 0, items: data ?? [] };
    }

    case "list_my_recent_chats": {
      const limit = Math.min(Number(input.limit ?? 5), 15);
      const { data } = await supabase
        .from("team_agent_chats")
        .select("id, title, updated_at")
        .eq("agent_handle", ctx.agentHandle)
        .order("updated_at", { ascending: false })
        .limit(limit);
      return { count: data?.length ?? 0, items: data ?? [] };
    }

    case "read_my_memory": {
      const limit = Math.min(Number(input.limit ?? 10), 30);
      const { data } = await supabase
        .from("agent_memory")
        .select("memory_type, content, importance, created_at")
        .eq("agent_handle", ctx.agentHandle)
        .order("importance", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit);
      return { count: data?.length ?? 0, items: data ?? [] };
    }

    case "save_to_memory": {
      const content = String(input.content ?? "").trim().slice(0, 500);
      const memory_type = String(input.memory_type ?? "learning");
      const importance = Math.min(10, Math.max(1, Number(input.importance ?? 5)));
      if (!content) return { ok: false, error: "empty content" };
      const { error } = await supabase.from("agent_memory").insert({
        agent_handle: ctx.agentHandle,
        memory_type,
        content,
        importance,
        source_chat_id: ctx.chatId ?? null,
      });
      return error ? { ok: false, error: error.message } : { ok: true };
    }

    case "ping_agent": {
      const toHandle = String(input.agent_handle ?? "").trim();
      const message = String(input.message ?? "").trim();
      const result = await askAgent({
        fromHandle: ctx.agentHandle,
        toHandle,
        message,
        sourceChatId: ctx.chatId ?? null,
      });
      return result;
    }

    case "call_team_meeting": {
      const rawHandles = input.agent_handles;
      const toHandles = Array.isArray(rawHandles) ? rawHandles.map(String) : [];
      const topic = String(input.topic ?? "").trim();
      if (toHandles.length === 0 || !topic) {
        return { ok: false, error: "need agent_handles[] and topic" };
      }
      // Cap meeting size to avoid runaway parallel calls.
      const capped = toHandles.slice(0, 5);
      const meeting = await callTeamMeeting({
        fromHandle: ctx.agentHandle,
        toHandles: capped,
        topic,
        sourceChatId: ctx.chatId ?? null,
      });
      return meeting;
    }

    default:
      return { error: `unknown tool: ${toolName}` };
  }
}

/** Convert our ToolDef format to Anthropic's tool format */
export function toAnthropicTools(defs: ToolDef[]) {
  return defs.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema,
  }));
}

export const TEAM_DISAMBIGUATION_RULE = `
## חוק שמות — חובה

יש בצוות סוכן ששמו **רוני** (Reliability Engineer). יש גם **רוני** שהוא המייסד של GenerAgent (מי שאת/ה מדבר/ת איתו עכשיו).

כדי לא לבלבל:
- כשמתכוונים לסוכן Reliability — תמיד תכתוב: **רוני (Reliability)** או **@rony**
- כשמתכוונים למייסד — תכתוב פשוט "רוני" או "אתה"
- בstandup אם רוני הסוכן לא דיווח — "רוני (Reliability) לא דיווח", לא סתם "רוני"
`;

export const ANTI_HALLUCINATION_RULE = `
## אסור להמציא — חובה

אם אתה לא בטוח במשהו, **תשתמש בכלי המתאים כדי לבדוק** — אל תנחש ואל תמציא נתונים.

אם אתה לא יודע ואין לך כלי לבדוק, **תגיד את זה במפורש**: "אני לא יכולה לוודא X — אין לי גישה לזה. אבל אם תאשר שזה ככה, אני אטפל."

**אסור** להמציא:
- סטטוסים של דברים (מי מחובר, איזה פיצ׳ר עובד, אם base ירדה)
- מטריקות, מספרים, אחוזים
- מה משתמש כלשהו אמר
- בעיות שלא ראית בעיניים שלך (דרך כלי)

לפני שאתה כותב טענה עובדתית — שאל את עצמך: "מאיפה אני יודע את זה? איזה כלי הביא לי את הנתון?"

אם התשובה היא "אני זוכר" או "כנראה" — **אל תכתוב את זה כעובדה**. תגיד שאתה משער או תבדוק.
`;
