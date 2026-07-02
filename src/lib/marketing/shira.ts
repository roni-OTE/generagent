/**
 * Shira's content generator. Ask her for a piece of content in a specific format,
 * get back structured output (title + body + optional short hook).
 */
import { TEAM_AGENTS, ONBOARDING_GLOSSARY_RULE } from "@/lib/team/agents";
import { ANTI_HALLUCINATION_RULE, TEAM_DISAMBIGUATION_RULE } from "@/lib/team/tools";
import { createServiceClient } from "@/lib/supabase/server";
import { askClaudeJson } from "@/lib/llm";

const SHIRA = TEAM_AGENTS.find((a) => a.handle === "shira")!;

export type ContentFormat = "whatsapp" | "linkedin" | "blog" | "landing_hero" | "email_teaser";

export type ShiraDraft = {
  title: string;
  body: string;
  hook?: string;
};

const FORMAT_INSTRUCTIONS: Record<ContentFormat, string> = {
  whatsapp: `**פורמט: הודעה קצרה לוואטסאפ**
- 60-180 מילים בעברית
- פותח ב-hook חד
- מדבר לבעלי עסקים בישראל, לא ל-devs
- אמוג׳ים במידה — לא יותר מ-2
- מסתיים ב-CTA: "לפרטים כתבו X" או קישור generagent.io
- להחזיר גם "hook": משפט אחד קצר (עד 15 מילים) לסטטוס בפ"ע`,

  linkedin: `**פורמט: פוסט לינקדין**
- 150-400 מילים בעברית
- פותח ב-hook קצר (משפט/שאלה/מספר)
- שורה ראשית → שורה ריקה → פסקאות של 1-3 שורות
- טון של בעלים/מייסד, לא של פרסומאי
- מסתיים ב-1 שאלה שמזמינה תגובות + link ל-generagent.io
- בלי hashtag spam — 2-3 hashtags מקסימום בסוף
- להחזיר גם "hook": הפתיחה הראשונה של הפוסט (עד 15 מילים)`,

  blog: `**פורמט: פוסט בלוג**
- 500-900 מילים בעברית, markdown
- H1 בכותרת (# ...)
- 2-3 subheadings (##)
- דוגמאות/case studies מומצאים בסביר (אבל מסומנים כדוגמה)
- CTA בסוף — "רוצה לבנות סוכן משלך? נסה ב-generagent.io"
- להחזיר title = הכותרת של הבלוג`,

  landing_hero: `**פורמט: hero copy ל-landing**
- כותרת (title) עד 8 מילים, חדה, מסקרנת
- subheadline (body) — 1-2 משפטים, עד 25 מילים, אומרים למי זה ומה זה עושה
- אל תשתמש ב-"AI מהפכני" או clichés
- אל תבטיח דברים שלא ניתן להוכיח
- להחזיר hook = הכותרת בלבד`,

  email_teaser: `**פורמט: פסקה קצרה למייל newsletter**
- 40-100 מילים בעברית
- subject line = title
- body = הפסקה עצמה
- מסתיים ב-CTA link
- לא formal מדי`,
};

async function readShiraMemory(): Promise<string> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("agent_memory")
    .select("memory_type, content")
    .eq("agent_handle", "shira")
    .order("importance", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(6);
  if (!data || data.length === 0) return "";
  return `\n\n### הזיכרון האישי שלך\n${data.map((m) => `- (${m.memory_type}) ${m.content}`).join("\n")}`;
}

export async function generateShiraContent(opts: {
  format: ContentFormat;
  topic?: string;
  angle?: string;
}): Promise<ShiraDraft> {
  const memory = await readShiraMemory();
  const formatInstr = FORMAT_INSTRUCTIONS[opts.format];

  const system =
    SHIRA.system_prompt +
    ONBOARDING_GLOSSARY_RULE +
    TEAM_DISAMBIGUATION_RULE +
    ANTI_HALLUCINATION_RULE +
    memory +
    `\n\n## מוצר בו את משווקת: GenerAgent
פלטפורמה בעברית שעוזרת למישהו לבחור **איזה סוכן AI** הוא צריך. משתמש עובר ראיון קצר (5 דק׳) עם נועם (הסוכן שמראיין), ומקבל בסוף פקודת התקנה של הסוכן ל-Claude Code או Codex CLI.

**קהל היעד:** בעלי עסקים בישראל, פרילנסרים, מנכ"לים — לא developers מקצועיים.

**המסר המרכזי:** במקום להתלבט ולנסות 10 כלים — 5 דקות שיחה + סוכן מותאם אישית מוכן לרוץ.

**מה אסור:**
- "AI מהפכני" / "העתיד כאן" / "מכונת קסמים"
- הבטחות של "החלף את הצוות שלך"
- מספרי גימיק בלי בסיס

## מה שאני מבקש עכשיו
${formatInstr}

${opts.topic ? `**נושא/רעיון:** ${opts.topic}` : "**נושא:** בחרי בעצמך משהו רלוונטי מהמוצר או מהזירה של AI לעסקים ישראליים השבוע."}
${opts.angle ? `**זווית:** ${opts.angle}` : ""}

החזירי JSON תקני בלבד:
{
  "title": "הכותרת/subject",
  "body": "התוכן המלא, ready to copy, בעברית",
  "hook": "משפט hook קצר (אם רלוונטי לפורמט)"
}`;

  try {
    const { data: parsed } = await askClaudeJson<ShiraDraft>({
      system,
      messages: [{ role: "user", content: `כתבי את התוכן. החזירי JSON בלבד.` }],
      maxTokens: 1600,
      temperature: 0.75,
    });
    if (parsed.title && parsed.body) return parsed;
  } catch (e) {
    console.error("[shira] generate failed", e);
  }

  throw new Error("Shira failed to produce content");
}
