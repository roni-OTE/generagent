import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropic, BOT_MODEL } from "@/lib/anthropic";
import { TEAM_AGENTS, ONBOARDING_GLOSSARY_RULE } from "@/lib/team/agents";

export const runtime = "nodejs";
export const maxDuration = 30;

type ThreadMessage = {
  role: "user" | "tamar";
  text: string;
  at: string;
};

type DecisionThread = {
  thread: ThreadMessage[];
};

type LegacyResponse = { response: string; at: string };

function normalizeResponses(
  raw: Record<string, DecisionThread | LegacyResponse> | null
): Record<string, DecisionThread> {
  if (!raw) return {};
  const out: Record<string, DecisionThread> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!v) continue;
    if ("thread" in v && Array.isArray(v.thread)) {
      out[k] = v;
    } else if ("response" in v && typeof v.response === "string") {
      // legacy single-response → migrate to thread
      out[k] = {
        thread: [{ role: "user", text: v.response, at: v.at }],
      };
    }
  }
  return out;
}

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

  const body = (await req.json().catch(() => ({}))) as {
    decision_index?: number;
    response?: string;
    catch_up?: boolean;
  };

  if (typeof body.decision_index !== "number") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const userText =
    typeof body.response === "string" ? body.response.trim().slice(0, 2000) : "";

  // Either a new user message OR a catch-up request (Tamar reads existing user msgs)
  if (!body.catch_up && !userText) {
    return NextResponse.json({ error: "empty_response" }, { status: 400 });
  }

  // Use service client (RLS only allows admin SELECT, we need UPDATE)
  const service = createServiceClient();
  const { data: standup } = await service
    .from("team_standups")
    .select("user_responses, decisions_needed, summary_md")
    .eq("id", id)
    .single();
  if (!standup) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const decisions = (standup.decisions_needed as string[] | null) ?? [];
  const decisionText = decisions[body.decision_index] ?? "";

  const responses = normalizeResponses(
    standup.user_responses as Record<string, DecisionThread | LegacyResponse> | null
  );

  const key = String(body.decision_index);
  const existing = responses[key] ?? { thread: [] };

  if (userText) {
    existing.thread.push({
      role: "user",
      text: userText,
      at: new Date().toISOString(),
    });
  } else if (body.catch_up) {
    // catch-up only: make sure the LAST message is from user; otherwise nothing to do
    const last = existing.thread[existing.thread.length - 1];
    if (!last || last.role !== "user") {
      return NextResponse.json({
        ok: false,
        error: "nothing_to_catch_up",
        thread: existing.thread,
      });
    }
  }

  // Ask Tamar for a follow-up
  const tamar = TEAM_AGENTS.find((a) => a.handle === "tamar")!;
  const founderName = me.display_name || "רוני";

  const conversationHistory = existing.thread
    .map((m) => (m.role === "user" ? `**${founderName}:** ${m.text}` : `**את (תמר):** ${m.text}`))
    .join("\n\n");

  const tamarPrompt = `${tamar.system_prompt}${ONBOARDING_GLOSSARY_RULE}

את משוחחת ישירות עם רוני, מייסד GenerAgent, על החלטה ספציפית שהעלית בstandup.

**ההחלטה הפתוחה:**
${decisionText}

**שיחה עד עכשיו:**
${conversationHistory}

תני תשובה קצרה (1-4 משפטים) בעברית. הכללים:
- אם רוני נתן הוראה ברורה → אשרי וצייני מה תעשי הלאה ("מצוין, אעדכן את [סוכן] לטפל בזה")
- אם חסר לך מידע → שאלי שאלה אחת ממוקדת
- אם רוני מבקש דחייה → אשרי וצייני מתי תחזרי לזה
- אם זה סיום שיחה ("בסדר", "סגור") → סכמי בקצרה את הפעולה הבאה
- אסור להיות יבשה. דברי כמו חברה לעבודה.
- מושגים באנגלית — תוסיפי הסבר בסוגריים בעברית בפעם הראשונה.

החזירי טקסט בלבד (לא JSON).`;

  let tamarText: string | null = null;
  try {
    const anthropic = getAnthropic();
    const resp = await anthropic.messages.create({
      model: BOT_MODEL,
      max_tokens: 400,
      temperature: 0.5,
      system: tamarPrompt,
      messages: [
        {
          role: "user",
          content: `על בסיס השיחה למעלה, תני את התגובה הבאה שלך לרוני (טקסט בלבד, בעברית).`,
        },
      ],
    });
    const textBlock = resp.content.find((b) => b.type === "text");
    if (textBlock && textBlock.type === "text") {
      tamarText = textBlock.text.trim();
    }
  } catch {
    tamarText = null;
  }

  if (tamarText) {
    existing.thread.push({
      role: "tamar",
      text: tamarText,
      at: new Date().toISOString(),
    });
  } else {
    existing.thread.push({
      role: "tamar",
      text: "(תמר לא הצליחה להגיב כרגע — אנסה שוב בstandup הבא)",
      at: new Date().toISOString(),
    });
  }

  responses[key] = existing;

  const { error } = await service
    .from("team_standups")
    .update({ user_responses: responses })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    tamar_reply: tamarText,
    thread: existing.thread,
  });
}
