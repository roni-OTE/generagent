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
