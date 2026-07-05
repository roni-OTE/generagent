/**
 * Health check — runs every 10 minutes via Vercel cron.
 * Checks: DB reachable, Anthropic API usable (catches exhausted credits too).
 * On failure: logs to app_events and emails the founder (rate-limited to 1/45min).
 * On recovery: logs + sends an "all clear" email.
 *
 * This is "רוני (Reliability)" actually doing his job.
 */
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAnthropic, BOT_MODEL } from "@/lib/anthropic";
import { classifyAnthropicError } from "@/lib/events";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALERT_COOLDOWN_MIN = 45;
const FOUNDER_EMAIL = process.env.FOUNDER_EMAIL ?? "roni@otegroup.co.il";

// Global daily spend guard. Sonnet pricing: $3/M input, $15/M output.
const DAILY_SPEND_CAP_USD = Number(process.env.DAILY_SPEND_CAP_USD ?? 25);
const SPEND_ALERT_COOLDOWN_HOURS = 12;

async function checkDailySpend(supabase: ReturnType<typeof createServiceClient>): Promise<void> {
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { data: events } = await supabase
    .from("app_events")
    .select("meta, created_at, code")
    .eq("source", "usage")
    .gte("created_at", since)
    .limit(2000);
  let inTok = 0;
  let outTok = 0;
  for (const e of events ?? []) {
    const m = (e.meta ?? {}) as { in?: number; out?: number };
    inTok += Number(m.in ?? 0);
    outTok += Number(m.out ?? 0);
  }
  const estUsd = (inTok * 3 + outTok * 15) / 1_000_000;
  if (estUsd < DAILY_SPEND_CAP_USD) return;

  // Cooldown: one spend alert per 12h
  const cooldownSince = new Date(Date.now() - SPEND_ALERT_COOLDOWN_HOURS * 3600_000).toISOString();
  const { count: recentAlerts } = await supabase
    .from("app_events")
    .select("id", { count: "exact", head: true })
    .eq("source", "health")
    .eq("code", "spend_alert")
    .gte("created_at", cooldownSince);
  if ((recentAlerts ?? 0) > 0) return;

  await supabase.from("app_events").insert({
    level: "warn",
    source: "health",
    code: "spend_alert",
    message: `הוצאת API ב-24 שעות: ~$${estUsd.toFixed(2)} (תקרה: $${DAILY_SPEND_CAP_USD})`,
    meta: { est_usd: estUsd, input_tokens: inTok, output_tokens: outTok },
  });
  await sendEmail({
    to: FOUNDER_EMAIL,
    subject: `⚠️ GenerAgent — הוצאת ה-API חצתה $${DAILY_SPEND_CAP_USD} ב-24 שעות`,
    html: `<div dir="rtl" style="font-family:sans-serif">
      <p>רוני (Reliability): צריכת ה-API ב-24 השעות האחרונות מוערכת ב-<strong>~$${estUsd.toFixed(2)}</strong> (${inTok.toLocaleString()} in / ${outTok.toLocaleString()} out).</p>
      <p>שווה להציץ ב-<a href="https://www.generagent.io/admin">אדמין</a> מי הצרכנים הגדולים, ולוודא שאין שימוש חריג. לשינוי התקרה: DAILY_SPEND_CAP_USD ב-Vercel env.</p>
    </div>`,
  });
}

type CheckResult = { name: string; ok: boolean; detail?: string };

async function checkDb(supabase: ReturnType<typeof createServiceClient>): Promise<CheckResult> {
  try {
    const { error } = await supabase.from("profiles").select("id", { count: "exact", head: true }).limit(1);
    return { name: "db", ok: !error, detail: error?.message };
  } catch (e) {
    return { name: "db", ok: false, detail: e instanceof Error ? e.message.slice(0, 200) : "unknown" };
  }
}

async function checkAnthropic(): Promise<CheckResult> {
  try {
    const anthropic = getAnthropic();
    await anthropic.messages.create({
      model: BOT_MODEL,
      max_tokens: 1,
      messages: [{ role: "user", content: "ok" }],
    });
    return { name: "anthropic", ok: true };
  } catch (e) {
    const { code, message } = classifyAnthropicError(e);
    return { name: "anthropic", ok: false, detail: `${code}: ${message}` };
  }
}

export async function GET(req: Request) {
  // Cron authentication (same convention as /api/team/standup)
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const [db, anthropic] = await Promise.all([checkDb(supabase), checkAnthropic()]);
  // Spend guard rides on the same 10-min cadence (best-effort, never fails health)
  await checkDailySpend(supabase).catch(() => undefined);
  const failures = [db, anthropic].filter((c) => !c.ok);
  const healthy = failures.length === 0;

  // Last known health state (down / recovered / alert_sent)
  const { data: lastEvents } = await supabase
    .from("app_events")
    .select("code, created_at")
    .eq("source", "health")
    .order("created_at", { ascending: false })
    .limit(10);
  const lastStateEvent = (lastEvents ?? []).find((e) => e.code === "down" || e.code === "recovered");
  const wasDown = lastStateEvent?.code === "down";
  const lastAlert = (lastEvents ?? []).find((e) => e.code === "alert_sent");
  const alertCooledDown =
    !lastAlert || Date.now() - new Date(lastAlert.created_at).getTime() > ALERT_COOLDOWN_MIN * 60_000;

  if (!healthy) {
    const failText = failures.map((f) => `${f.name}: ${f.detail ?? "down"}`).join(" | ");
    await supabase.from("app_events").insert({
      level: "error",
      source: "health",
      code: "down",
      message: failText.slice(0, 1000),
      meta: { checks: [db, anthropic] },
    });

    if (alertCooledDown) {
      const isCredit = failures.some((f) => (f.detail ?? "").startsWith("api_credit"));
      const subject = isCredit
        ? "🚨 GenerAgent מושבת — נגמר האשראי ב-Anthropic API"
        : "🚨 GenerAgent — תקלה במערכת";
      const html = `<div dir="rtl" style="font-family:sans-serif">
        <h2>רוני (Reliability) מדווח: המערכת לא בריאה</h2>
        <p><strong>מה נכשל:</strong> ${failText}</p>
        ${isCredit ? `<p><strong>פעולה נדרשת:</strong> טעינת קרדיטים ב-<a href="https://console.anthropic.com">console.anthropic.com</a> → Billing. עד אז המשתמשים לא יכולים לדבר עם נועם.</p>` : ""}
        <p style="color:#888;font-size:12px">בדיקה אוטומטית כל 10 דקות · התראה חוזרת לכל היותר פעם ב-${ALERT_COOLDOWN_MIN} דק׳</p>
      </div>`;
      const res = await sendEmail({ to: FOUNDER_EMAIL, subject, html });
      if (res.success) {
        await supabase.from("app_events").insert({
          level: "info",
          source: "health",
          code: "alert_sent",
          message: subject,
        });
      }
    }
    return NextResponse.json({ ok: false, checks: [db, anthropic] }, { status: 503 });
  }

  // Healthy — if we were down before, log + announce recovery
  if (wasDown) {
    await supabase.from("app_events").insert({
      level: "info",
      source: "health",
      code: "recovered",
      message: "כל הבדיקות עוברות",
    });
    await sendEmail({
      to: FOUNDER_EMAIL,
      subject: "✅ GenerAgent חזר לתפקוד מלא",
      html: `<div dir="rtl" style="font-family:sans-serif"><p>רוני (Reliability): כל הבדיקות עוברות שוב (DB + Anthropic API).</p></div>`,
    });
  }

  return NextResponse.json({ ok: true, checks: [db, anthropic] });
}
