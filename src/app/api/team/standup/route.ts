/**
 * Standup v2 — data-driven.
 *
 * Old version asked 5 persona-agents "what did you do?" — they had no tools and
 * no memory of doing anything, so reports were empty or hallucinated.
 *
 * New version: the system computes a real digest (metrics + deltas, errors from
 * app_events, stuck consultations, open support tickets, token usage, auto-flags),
 * and Tamar makes ONE narration call to turn it into a founder-friendly summary.
 * If the LLM call fails, the raw digest is still a useful standup on its own.
 */
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAnthropic, BOT_MODEL } from "@/lib/anthropic";
import { classifyAnthropicError } from "@/lib/events";
import { sendEmail, markdownToBasicHtml } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 120;

type TamarSummary = {
  highlights: string[];
  decisions_needed: string[];
  metrics_snapshot: string;
  summary_md: string;
};

type Digest = {
  metrics: {
    consults_24h: number;
    consults_prev_24h: number;
    packages_24h: number;
    packages_prev_24h: number;
    users_24h: number;
    users_prev_24h: number;
    drop_off_pct: number | null;
  };
  errors_24h: { code: string; count: number }[];
  health_incidents_24h: number;
  stuck_consultations: number;
  open_tickets: number;
  flags: string[];
};

function extractJson<T>(text: string): T {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    try { return JSON.parse(fence[1]) as T; } catch {}
  }
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last > first) {
    return JSON.parse(trimmed.slice(first, last + 1)) as T;
  }
  return JSON.parse(trimmed) as T;
}

async function buildDigest(): Promise<Digest> {
  const supabase = createServiceClient();
  const now = Date.now();
  const h24 = new Date(now - 24 * 3600_000).toISOString();
  const h48 = new Date(now - 48 * 3600_000).toISOString();
  const stuckCutoff = new Date(now - 10 * 60_000).toISOString();

  const [
    { count: consults24 },
    { count: consults48 },
    { count: packages24 },
    { count: packages48 },
    { count: users24 },
    { count: users48 },
    { data: events },
    { count: stuck },
    { count: tickets },
  ] = await Promise.all([
    supabase.from("consultations").select("id", { count: "exact", head: true }).gte("created_at", h24),
    supabase.from("consultations").select("id", { count: "exact", head: true }).gte("created_at", h48).lt("created_at", h24),
    supabase.from("packages").select("id", { count: "exact", head: true }).gte("created_at", h24),
    supabase.from("packages").select("id", { count: "exact", head: true }).gte("created_at", h48).lt("created_at", h24),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", h24),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", h48).lt("created_at", h24),
    supabase.from("app_events").select("code, source").gte("created_at", h24).eq("level", "error").limit(500),
    supabase
      .from("consultations")
      .select("id", { count: "exact", head: true })
      .eq("status", "analyzing")
      .lt("updated_at", stuckCutoff),
    supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);

  const errCounts = new Map<string, number>();
  let healthIncidents = 0;
  for (const e of events ?? []) {
    if (e.source === "health") { healthIncidents++; continue; }
    const key = e.code ?? "unknown";
    errCounts.set(key, (errCounts.get(key) ?? 0) + 1);
  }
  const errors24 = [...errCounts.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count);

  const dropOff =
    (consults24 ?? 0) >= 3 ? Math.round((1 - (packages24 ?? 0) / (consults24 ?? 1)) * 100) : null;

  const flags: string[] = [];
  if (dropOff !== null && dropOff > 50) flags.push(`drop-off גבוה: ${dropOff}% מהשיחות לא הסתיימו בסוכן`);
  if ((stuck ?? 0) > 0) flags.push(`${stuck} שיחות תקועות ב-analyzing מעל 10 דקות`);
  if (healthIncidents > 0) flags.push(`${healthIncidents} אירועי health בתוך 24 שעות — לבדוק את יומן ההתראות`);
  const credit = errors24.find((e) => e.code === "api_credit");
  if (credit) flags.push(`נרשמו ${credit.count} כשלי אשראי API — לוודא Auto-reload פעיל`);
  if ((tickets ?? 0) > 0) flags.push(`${tickets} פניות תמיכה פתוחות`);

  return {
    metrics: {
      consults_24h: consults24 ?? 0,
      consults_prev_24h: consults48 ?? 0,
      packages_24h: packages24 ?? 0,
      packages_prev_24h: packages48 ?? 0,
      users_24h: users24 ?? 0,
      users_prev_24h: users48 ?? 0,
      drop_off_pct: dropOff,
    },
    errors_24h: errors24,
    health_incidents_24h: healthIncidents,
    stuck_consultations: stuck ?? 0,
    open_tickets: tickets ?? 0,
    flags,
  };
}

function delta(cur: number, prev: number): string {
  const d = cur - prev;
  return d === 0 ? "±0" : d > 0 ? `+${d}` : `${d}`;
}

function digestToMarkdown(d: Digest): string {
  const m = d.metrics;
  return [
    `## 📊 מטריקות (24 שעות, בסוגריים דלתא מול 24 הקודמות)`,
    `- שיחות שנפתחו: ${m.consults_24h} (${delta(m.consults_24h, m.consults_prev_24h)})`,
    `- סוכנים שנוצרו: ${m.packages_24h} (${delta(m.packages_24h, m.packages_prev_24h)})`,
    `- משתמשים חדשים: ${m.users_24h} (${delta(m.users_24h, m.users_prev_24h)})`,
    m.drop_off_pct !== null ? `- Drop-off: ${m.drop_off_pct}%` : `- Drop-off: אין מספיק נתונים`,
    ``,
    `## 🐛 שגיאות (24 שעות)`,
    d.errors_24h.length === 0
      ? `- אין שגיאות 🎉`
      : d.errors_24h.map((e) => `- ${e.code}: ${e.count}`).join("\n"),
    ``,
    `## ⚠️ דגלים`,
    d.flags.length === 0 ? `- הכל תקין` : d.flags.map((f) => `- ${f}`).join("\n"),
  ].join("\n");
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const digest = await buildDigest();
  const digestMd = digestToMarkdown(digest);

  // One narration call — Tamar turns the digest into a founder-friendly note.
  let tamarOut: TamarSummary | null = null;
  let llmFailure: string | null = null;
  try {
    const anthropic = getAnthropic();
    const resp = await anthropic.messages.create({
      model: BOT_MODEL,
      max_tokens: 1500,
      temperature: 0.4,
      system: `את תמר, ה-Product Lead של GenerAgent. את מקבלת digest נתונים אמיתי (לא דיווחים של סוכנים) ומנסחת סטנדאפ יומי קצר למייסד רוני.

חוקים:
- **אסור להמציא נתונים.** כל מספר בסיכום חייב להופיע ב-digest.
- highlights = 1-3 דברים שבאמת בולטים בנתונים (חיובי או שלילי).
- decisions_needed = רק אם הדגלים באמת דורשים החלטה מרוני. אם אין — מערך ריק.
- טון: חם, ישיר, בלי buzzwords. מושג באנגלית — הסבר קצר בסוגריים.
- summary_md חייב לכלול את סעיפי המטריקות/שגיאות/דגלים מה-digest כפי שהם (מותר לקצר ניסוח, אסור לשנות מספרים).

החזירי JSON בלבד: {"highlights": [...], "decisions_needed": [...], "metrics_snapshot": "...", "summary_md": "..."}`,
      messages: [
        { role: "user", content: `Digest של 24 השעות האחרונות:\n\n${digestMd}\n\nנסחי את הסטנדאפ.` },
        { role: "assistant", content: "{" },
      ],
    });
    const textBlock = resp.content.find((b) => b.type === "text");
    if (textBlock && textBlock.type === "text") {
      tamarOut = extractJson<TamarSummary>("{" + textBlock.text);
    }
  } catch (e) {
    // Distinguish API failure from parse failure — the old version masked this.
    llmFailure = classifyAnthropicError(e).code;
  }

  const dateStr = new Date().toLocaleDateString("he-IL");
  const summaryMd =
    tamarOut?.summary_md ??
    [
      `# Standup ${dateStr}`,
      ``,
      llmFailure
        ? `_(תמר לא זמינה — ${llmFailure}. זהו ה-digest הגולמי, והוא מדויק.)_`
        : `_(תמר לא הצליחה לנסח — זהו ה-digest הגולמי, והוא מדויק.)_`,
      ``,
      digestMd,
    ].join("\n");

  const supabase = createServiceClient();
  const { data: standupRow } = await supabase
    .from("team_standups")
    .insert({
      summary_md: summaryMd,
      highlights: tamarOut?.highlights ?? digest.flags.slice(0, 3),
      decisions_needed: tamarOut?.decisions_needed ?? [],
      metrics_json: { digest },
      agent_inputs: { mode: "digest_v2", llm_failure: llmFailure },
    })
    .select("id, standup_date")
    .single();

  const founderEmail = process.env.FOUNDER_EMAIL ?? "roni@otegroup.co.il";
  const subject = `📋 Standup — ${dateStr}`;
  const standupUrl = `https://www.generagent.io/admin/standups/${standupRow?.id ?? ""}`;
  const replyCallout = `<div dir="rtl" style="margin:24px 0;padding:14px 18px;background:#F0F1FF;border-right:3px solid #5E6AD2;border-radius:8px;font-size:13px;color:#1A1F4F;">
    <a href="${standupUrl}" style="color:#5E6AD2;font-weight:600;">פתח את ה-Standup במערכת</a> — שם אפשר להשיב על החלטות.
  </div>`;
  const emailRes = await sendEmail({
    to: founderEmail,
    subject,
    html: replyCallout + markdownToBasicHtml(summaryMd),
  });

  if (standupRow && emailRes.success) {
    await supabase.from("team_standups").update({ email_sent: true }).eq("id", standupRow.id);
  }

  return NextResponse.json({
    ok: true,
    standup_id: standupRow?.id ?? null,
    email: emailRes,
    mode: "digest_v2",
    llm_failure: llmFailure,
  });
}

export async function GET(req: Request) {
  return POST(req);
}
