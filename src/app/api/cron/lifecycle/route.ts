/**
 * Lifecycle emails — runs daily at 07:00 UTC (10:00 IL) via Vercel cron.
 *
 * 1. Abandonment nudge: users whose consultation sat unfinished 20h-7d
 *    → "נועם עדיין מחכה לך" + feedback link. Once per consultation.
 * 2. 3-day follow-up: users who created an agent ~3 days ago
 *    → "איך הולך עם הסוכן?" + feedback link. Once per package.
 *
 * Dedup via app_events (source: lifecycle, code: abandoned_sent / followup_sent).
 * Caps per run keep a bad day from spamming.
 */
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_SENDS_PER_RUN = 20;
const BASE_URL = "https://www.generagent.io";

type SentSet = Set<string>;

async function loadSent(supabase: ReturnType<typeof createServiceClient>, code: string): Promise<SentSet> {
  const { data } = await supabase
    .from("app_events")
    .select("meta")
    .eq("source", "lifecycle")
    .eq("code", code)
    .limit(2000);
  const set = new Set<string>();
  for (const e of data ?? []) {
    const id = (e.meta as { target_id?: string })?.target_id;
    if (id) set.add(id);
  }
  return set;
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Preview mode: send both templates (with sample data) to the founder only.
  // No DB reads/writes, nothing goes to users. Used to approve copy before launch.
  const url = new URL(req.url);
  if (url.searchParams.get("preview") === "1") {
    const founder = process.env.FOUNDER_EMAIL ?? "roni@otegroup.co.il";
    const sampleResume = `${BASE_URL}/consult/00000000-preview`;
    const fb1 = `${BASE_URL}/feedback?src=abandoned&email=${encodeURIComponent(founder)}`;
    const fb2 = `${BASE_URL}/feedback?src=followup&email=${encodeURIComponent(founder)}`;
    const r1 = await sendEmail({
      to: founder,
      subject: "[תצוגה מקדימה — מייל נטישה] נועם עדיין מחכה לך 👋",
      html: `<div dir="rtl" style="font-family:sans-serif;line-height:1.7">
        <p>היי רוני,</p>
        <p>התחלת שיחה עם נועם על הסוכן שלך — והיא עדיין פתוחה בדיוק איפה שעצרת. נשארו רק כמה שאלות עד שתקבל סוכן AI מותאם אישית, מוכן להתקנה בפקודה אחת.</p>
        <p><a href="${sampleResume}" style="display:inline-block;background:#5E6AD2;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600">להמשיך מאיפה שעצרתי ←</a></p>
        <p style="color:#666;font-size:13px">ואם עצרת כי משהו הפריע או לא עבד — זה בדיוק מה שאנחנו רוצים לשמוע: <a href="${fb1}">ספר לנו בשתי דקות</a>. המשוב מגיע ישירות לרוני, המייסד.</p>
        <p style="color:#999;font-size:12px">GenerAgent · OTE Group</p>
      </div>`,
    });
    const r2 = await sendEmail({
      to: founder,
      subject: "[תצוגה מקדימה — מייל פולו-אפ] איך הולך עם רועי — מנהל הצעות המחיר?",
      html: `<div dir="rtl" style="font-family:sans-serif;line-height:1.7">
        <p>היי רוני,</p>
        <p>לפני שלושה ימים בנית את <strong>רועי — מנהל הצעות המחיר</strong> ב-GenerAgent. הספקת להתקין? עובד כמו שציפית?</p>
        <p>אם משהו נתקע בהתקנה או שהסוכן לא בדיוק מה שרצית — <a href="${fb2}">ספר לנו בשתי דקות</a>, זה מגיע ישירות לרוני והוא באמת קורא הכל.</p>
        <p>ואם הכל עובד — נשמח שתספר לחבר 😉</p>
        <p style="color:#999;font-size:12px">GenerAgent · OTE Group</p>
      </div>`,
    });
    return NextResponse.json({ ok: true, preview: true, abandoned: r1, followup: r2 });
  }

  // Safety gate: real sends to users are OFF until the founder approves the copy.
  // Approve by setting LIFECYCLE_ENABLED=true in Vercel env (then redeploy).
  if (process.env.LIFECYCLE_ENABLED !== "true") {
    return NextResponse.json({
      ok: true,
      skipped: "lifecycle emails disabled — set LIFECYCLE_ENABLED=true after approving the copy",
    });
  }

  const supabase = createServiceClient();
  const now = Date.now();
  let sentAbandoned = 0;
  let sentFollowup = 0;

  // ---- 1. Abandonment nudges ----
  const staleSince = new Date(now - 7 * 24 * 3600_000).toISOString(); // not older than 7d
  const staleUntil = new Date(now - 20 * 3600_000).toISOString(); // at least 20h idle
  const { data: abandoned } = await supabase
    .from("consultations")
    .select("id, user_id, updated_at")
    .in("status", ["in_progress", "analyzing"])
    .gte("updated_at", staleSince)
    .lte("updated_at", staleUntil)
    .order("updated_at", { ascending: false })
    .limit(100);

  const alreadyNudged = await loadSent(supabase, "abandoned_sent");
  // One nudge per user per run (a user may have several stale chats)
  const nudgedUsersThisRun = new Set<string>();

  for (const c of abandoned ?? []) {
    if (sentAbandoned >= MAX_SENDS_PER_RUN) break;
    if (alreadyNudged.has(c.id) || nudgedUsersThisRun.has(c.user_id)) continue;

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, display_name")
      .eq("id", c.user_id)
      .single();
    if (!profile?.email) continue;

    const firstName = (profile.display_name ?? "").trim().split(/\s+/)[0] || "";
    const resumeUrl = `${BASE_URL}/consult/${c.id}`;
    const feedbackUrl = `${BASE_URL}/feedback?src=abandoned&email=${encodeURIComponent(profile.email)}`;
    const res = await sendEmail({
      to: profile.email,
      subject: "נועם עדיין מחכה לך 👋",
      html: `<div dir="rtl" style="font-family:sans-serif;line-height:1.7">
        <p>היי${firstName ? " " + firstName : ""},</p>
        <p>התחלת שיחה עם נועם על הסוכן שלך — והיא עדיין פתוחה בדיוק איפה שעצרת. נשארו רק כמה שאלות עד שתקבל סוכן AI מותאם אישית, מוכן להתקנה בפקודה אחת.</p>
        <p><a href="${resumeUrl}" style="display:inline-block;background:#5E6AD2;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600">להמשיך מאיפה שעצרתי ←</a></p>
        <p style="color:#666;font-size:13px">ואם עצרת כי משהו הפריע או לא עבד — זה בדיוק מה שאנחנו רוצים לשמוע: <a href="${feedbackUrl}">ספר לנו בשתי דקות</a>. המשוב מגיע ישירות לרוני, המייסד.</p>
        <p style="color:#999;font-size:12px">GenerAgent · OTE Group</p>
      </div>`,
    });
    if (res.success) {
      sentAbandoned++;
      nudgedUsersThisRun.add(c.user_id);
      await supabase.from("app_events").insert({
        level: "info",
        source: "lifecycle",
        code: "abandoned_sent",
        message: `נשלחה תזכורת נטישה ל-${profile.email}`,
        meta: { target_id: c.id, user_id: c.user_id },
      });
    }
  }

  // ---- 2. 3-day follow-ups ----
  const fuFrom = new Date(now - 4 * 24 * 3600_000).toISOString();
  const fuTo = new Date(now - 3 * 24 * 3600_000).toISOString();
  const { data: packages } = await supabase
    .from("packages")
    .select("id, user_id, name")
    .gte("created_at", fuFrom)
    .lte("created_at", fuTo)
    .limit(100);

  const alreadyFollowed = await loadSent(supabase, "followup_sent");

  for (const p of packages ?? []) {
    if (sentFollowup >= MAX_SENDS_PER_RUN) break;
    if (alreadyFollowed.has(p.id)) continue;

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, display_name")
      .eq("id", p.user_id)
      .single();
    if (!profile?.email) continue;

    const firstName = (profile.display_name ?? "").trim().split(/\s+/)[0] || "";
    const feedbackUrl = `${BASE_URL}/feedback?src=followup&email=${encodeURIComponent(profile.email)}`;
    const res = await sendEmail({
      to: profile.email,
      subject: `איך הולך עם ${p.name}?`,
      html: `<div dir="rtl" style="font-family:sans-serif;line-height:1.7">
        <p>היי${firstName ? " " + firstName : ""},</p>
        <p>לפני שלושה ימים בנית את <strong>${p.name}</strong> ב-GenerAgent. הספקת להתקין? עובד כמו שציפית?</p>
        <p>אם משהו נתקע בהתקנה או שהסוכן לא בדיוק מה שרצית — <a href="${feedbackUrl}">ספר לנו בשתי דקות</a>, זה מגיע ישירות לרוני והוא באמת קורא הכל.</p>
        <p>ואם הכל עובד — נשמח שתספר לחבר 😉</p>
        <p style="color:#999;font-size:12px">GenerAgent · OTE Group</p>
      </div>`,
    });
    if (res.success) {
      sentFollowup++;
      await supabase.from("app_events").insert({
        level: "info",
        source: "lifecycle",
        code: "followup_sent",
        message: `נשלח פולו-אפ ל-${profile.email} על ${p.name}`,
        meta: { target_id: p.id, user_id: p.user_id },
      });
    }
  }

  return NextResponse.json({ ok: true, abandoned_sent: sentAbandoned, followup_sent: sentFollowup });
}

export async function GET(req: Request) {
  return POST(req);
}
