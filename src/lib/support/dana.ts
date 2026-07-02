/**
 * Dana's support handler.
 * Given an inbound support message, produce a Hebrew reply in Dana's voice,
 * plus a decision on whether to escalate to Roni.
 */
import { TEAM_AGENTS, ONBOARDING_GLOSSARY_RULE } from "@/lib/team/agents";
import { ANTI_HALLUCINATION_RULE, TEAM_DISAMBIGUATION_RULE } from "@/lib/team/tools";
import { createServiceClient } from "@/lib/supabase/server";
import { askClaudeJson } from "@/lib/llm";

const DANA = TEAM_AGENTS.find((a) => a.handle === "dana")!;

export type DanaReply = {
  reply_text: string;
  category: "install" | "bug" | "billing" | "how_to" | "other";
  escalate: boolean;
  escalate_reason?: string;
};

async function readDanaMemory(): Promise<string> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("agent_memory")
    .select("memory_type, content")
    .eq("agent_handle", "dana")
    .order("importance", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(6);
  if (!data || data.length === 0) return "";
  return `\n\n### הזיכרון האישי שלך (מה שלמדת קודם)\n${data.map((m) => `- (${m.memory_type}) ${m.content}`).join("\n")}`;
}

export async function generateDanaReply(opts: {
  fromName?: string | null;
  fromEmail: string;
  subject?: string | null;
  messageBody: string;
  priorMessages?: { direction: string; content: string }[];
}): Promise<DanaReply> {
  const memory = await readDanaMemory();

  const priorContext = (opts.priorMessages ?? []).length > 0
    ? "\n\n### היסטוריית הפנייה\n" + (opts.priorMessages ?? [])
        .map((m) => `[${m.direction === "inbound" ? "לקוח" : "דנה"}]: ${m.content}`)
        .join("\n---\n")
    : "";

  const system =
    DANA.system_prompt +
    ONBOARDING_GLOSSARY_RULE +
    TEAM_DISAMBIGUATION_RULE +
    ANTI_HALLUCINATION_RULE +
    memory +
    `\n\n## תפקידך עכשיו — תגובה למייל תמיכה
אתה במסלול תמיכה: משתמש כתב לך למייל support@generagent.io.
- ענה חם ומקצועי בעברית, כאילו הוא כתב לך בהודעה אחת ואת עונה בהודעה אחת.
- אל תבקש ממנו לפתוח צ׳אט או להתחבר לפלטפורמה — הוא כתב במייל, נענים במייל.
- אם השאלה טכנית עמוקה שאת לא בטוחה בתשובה, או שהיא דורשת החלטה מוצרית של רוני (המייסד) — סמן escalate=true והסבירי בפנייה שרוני יחזור בעצמו תוך 24 שעות.
- אחרת — נסי לענות ישירות: הוראת התקנה, קישור לתיעוד (https://www.generagent.io/docs), הבהרה של פיצ׳ר, הכוונה.
- הפנייה שלך תישלח כמייל HTML — כתבי טקסט רגוע וברור, פסקאות קצרות, בלי headers, בלי bullet lists אלא אם באמת חייבים.

החזירי JSON תקני בלבד:
{
  "reply_text": "טקסט התגובה בעברית, ידידותי, לא-פורמלי-מדי, 3-8 משפטים",
  "category": "install" | "bug" | "billing" | "how_to" | "other",
  "escalate": true | false,
  "escalate_reason": "אם escalate=true — משפט אחד למה"
}

תמיד סיימי את reply_text במשפט חתימה של דנה: "בכיף,\\nדנה · צוות GenerAgent"`;

  const userMsg = `פנייה חדשה:
- **שם:** ${opts.fromName || "(לא צוין)"}
- **מייל:** ${opts.fromEmail}
- **נושא:** ${opts.subject || "(אין)"}

**גוף ההודעה:**
${opts.messageBody}${priorContext}`;

  try {
    const { data: parsed } = await askClaudeJson<DanaReply>({
      system,
      messages: [{ role: "user", content: userMsg }],
      maxTokens: 900,
      temperature: 0.4,
    });
    // Guardrails
    if (parsed.reply_text && typeof parsed.reply_text === "string") {
      if (!["install", "bug", "billing", "how_to", "other"].includes(parsed.category)) {
        parsed.category = "other";
      }
      parsed.escalate = !!parsed.escalate;
      return parsed;
    }
  } catch (e) {
    console.error("[dana] reply generation failed", e);
  }

  // Absolute fallback: escalate to Roni
  return {
    reply_text: `שלום ${opts.fromName || ""},\n\nתודה שפנית ל-GenerAgent. הפנייה שלך הועברה לרוני, המייסד, והוא יחזור אליך אישית תוך 24 שעות.\n\nבכיף,\nדנה · צוות GenerAgent`,
    category: "other",
    escalate: true,
    escalate_reason: "AI reply generation failed twice",
  };
}
