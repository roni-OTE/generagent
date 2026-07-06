/**
 * Sanitize an agent manifest before it's published to the PUBLIC marketplace.
 *
 * The agent's system prompt and tasks often embed the publisher's own business
 * specifics that were captured during the Noam interview — exact prices, client
 * names, internal file/system names, contact details. Publishing raw would leak
 * them. This runs an LLM pass that generalizes those specifics into reusable
 * placeholders while keeping the agent's role, structure, and workflow intact.
 *
 * Fails CLOSED: the caller must treat a thrown error as "do not publish".
 */
import { askClaudeJson } from "@/lib/llm";

// Only these free-text fields can carry business specifics. Structural fields
// (archetype, persona_match, target_platform, etc.) are passed through untouched.
type SanitizableManifest = {
  agent_name?: string;
  agent_description?: string;
  intro_message_he?: string;
  system_prompt_he?: string;
  core_capabilities?: string[];
  first_tasks_he?: string[];
  guardrails_he?: string[];
  [k: string]: unknown;
};

type SanitizedFields = {
  agent_name?: string;
  agent_description?: string;
  intro_message_he?: string;
  system_prompt_he?: string;
  core_capabilities?: string[];
  first_tasks_he?: string[];
  guardrails_he?: string[];
};

const SYSTEM = `אתה עורך שמנקה טמפלייט של סוכן AI כדי לפרסם אותו במרקטפלייס ציבורי.

המטרה: להפוך את הסוכן לתבנית **גנרית ושמישה לכל אחד**, בלי לחשוף פרטים עסקיים של מי שיצר אותו.

**מה חובה להסיר / להכליל:**
- שמות ספציפיים: שם החברה, שמות לקוחות, שמות אנשים, שמות ספקים.
- מספרים ומחירים ספציפיים: "50,000 ₪", "10% הנחה", "מעל שנה" → החלף בניסוח כללי ("סכום גבוה", "הנחה ללקוחות ותיקים", "לפי הוותק").
- שמות קבצים/מערכות פנימיים: "מחירון באקסל בשם X", "טבלת CRM שלנו" → "המחירון", "מערכת הלקוחות".
- פרטי קשר, מיילים, טלפונים, כתובות.
- כל נתון פנימי מזהה אחר.

**מה חובה לשמור:**
- התפקיד של הסוכן, המבנה, השלבים וזרימת העבודה.
- היכולות והמשימות — אבל מנוסחות באופן כללי כך שכל עסק דומה יוכל להשתמש.
- הטון והשפה (עברית).
- אם היו כללים/לוגיקה — שמור את הרעיון, הכלל את הערכים ("אם הלקוח ותיק — הנחה" במקום "מעל שנה = 10%").

**חוקים:**
- אל תוסיף פרטים חדשים. רק הכלל את הקיימים.
- שמור על אורך ומבנה דומים — זה עדיין צריך להיות סוכן שימושי.
- החזר JSON בלבד עם אותם שדות שקיבלת (רק אלה שקיימים).`;

export async function sanitizeManifestForPublish(
  manifest: SanitizableManifest
): Promise<{ manifest: SanitizableManifest; usage: { inputTokens: number; outputTokens: number } }> {
  // Extract only the fields that may carry specifics.
  const input: SanitizedFields = {
    agent_name: manifest.agent_name,
    agent_description: manifest.agent_description,
    intro_message_he: manifest.intro_message_he,
    system_prompt_he: manifest.system_prompt_he,
    core_capabilities: manifest.core_capabilities,
    first_tasks_he: manifest.first_tasks_he,
    guardrails_he: manifest.guardrails_he,
  };

  const { data, usage } = await askClaudeJson<SanitizedFields>({
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content:
          "נקה את הטמפלייט הבא לפרסום ציבורי. החזר JSON עם אותם שדות, מוכללים:\n\n" +
          JSON.stringify(input, null, 2),
      },
    ],
    maxTokens: 8000,
    temperature: 0.3,
  });

  // Merge sanitized fields back over the original manifest (structural fields
  // like archetype/persona_match/target_platform are preserved).
  const cleaned: SanitizableManifest = { ...manifest };
  for (const key of Object.keys(input) as (keyof SanitizedFields)[]) {
    if (data[key] !== undefined && data[key] !== null) {
      // @ts-expect-error index assignment across the union
      cleaned[key] = data[key];
    }
  }

  return { manifest: cleaned, usage };
}
