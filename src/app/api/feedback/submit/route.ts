/**
 * Feedback form submission — public (reached from lifecycle emails / site).
 * Uses the service client (RLS locked on the table); light abuse guard via length caps.
 */
import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/events";
import { sendEmail } from "@/lib/email";
import { checkRateLimit, escapeHtml } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Throttle: public endpoint that emails the founder on every submission.
  const rl = await checkRateLimit(req, "feedback", { ipHourly: 8, globalDaily: 300 });
  if (!rl.ok) return NextResponse.json({ error: rl.message }, { status: rl.status });

  let body: {
    rating?: number;
    what_worked?: string;
    what_missing?: string;
    email?: string;
    source?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "rating_required" }, { status: 400 });
  }

  // Attach user if logged in (optional — form also works from email links)
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch { /* anonymous is fine */ }

  const service = createServiceClient();
  const { error } = await service.from("feedback_responses").insert({
    user_id: userId,
    email: (body.email ?? "").slice(0, 200) || null,
    rating,
    what_worked: (body.what_worked ?? "").slice(0, 2000) || null,
    what_missing: (body.what_missing ?? "").slice(0, 2000) || null,
    source: ["abandoned_email", "followup_email", "site"].includes(body.source ?? "")
      ? body.source
      : "site",
  });
  if (error) {
    await logEvent({ source: "feedback.submit", code: "db_error", message: error.message });
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  // Notify the founder immediately — feedback is gold, don't let it sit unseen.
  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
  await sendEmail({
    to: process.env.FOUNDER_EMAIL ?? "roni@otegroup.co.il",
    subject: `💬 משוב חדש: ${stars} (${rating}/5)`,
    html: `<div dir="rtl" style="font-family:sans-serif;line-height:1.7">
      <h3 style="margin:0 0 12px">משוב חדש התקבל</h3>
      <p><strong>דירוג:</strong> ${stars} (${rating}/5)</p>
      ${body.what_worked ? `<p><strong>מה עבד:</strong> ${escapeHtml(String(body.what_worked).slice(0, 2000))}</p>` : ""}
      ${body.what_missing ? `<p><strong>מה חסר/הפריע:</strong> ${escapeHtml(String(body.what_missing).slice(0, 2000))}</p>` : ""}
      <p style="color:#666;font-size:13px">מאת: ${body.email ? escapeHtml(String(body.email)) : "אנונימי"} · מקור: ${escapeHtml(String(body.source || "site"))}${userId ? " · משתמש מחובר" : ""}</p>
    </div>`,
  }).catch(() => undefined);

  return NextResponse.json({ ok: true });
}
