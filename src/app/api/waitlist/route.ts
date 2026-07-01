import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

/**
 * POST /api/waitlist  { email, name?, note?, source_hint? }
 * Public endpoint. Inserts a waitlist entry. Notifies admin by email.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    name?: string;
    note?: string;
    source_hint?: string;
  };
  const email = (body.email ?? "").trim().toLowerCase();
  const name = (body.name ?? "").trim().slice(0, 120) || null;
  const note = (body.note ?? "").trim().slice(0, 1000) || null;
  const source_hint = ["mechadshin", "linkedin", "other"].includes(body.source_hint ?? "")
    ? body.source_hint
    : "other";

  if (!email || !/.+@.+\..+/.test(email)) {
    return NextResponse.json({ error: "אימייל לא תקין" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Idempotent: if already on waitlist, return success (no duplicate error to user)
  const { data: existing } = await supabase
    .from("waitlist")
    .select("id, status")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, already: true, status: existing.status });
  }

  const { data: row, error } = await supabase
    .from("waitlist")
    .insert({ email, name, note, source_hint })
    .select("id, created_at")
    .single();

  if (error) {
    console.error("[waitlist] insert failed", error);
    return NextResponse.json({ error: "שמירה נכשלה. נסה שוב." }, { status: 500 });
  }

  // Notify admin (best-effort)
  try {
    const founderEmail = process.env.FOUNDER_EMAIL ?? "roni@otegroup.co.il";
    const sourceLabel =
      source_hint === "mechadshin" ? "מחדשין" :
      source_hint === "linkedin" ? "LinkedIn" : "אחר";
    await sendEmail({
      to: founderEmail,
      subject: `👋 נרשם חדש לרשימת המתנה — ${name || email}`,
      html: `<div dir="rtl" style="font-family:system-ui,sans-serif;padding:20px;color:#1a1f2e;">
        <h2 style="margin:0 0 12px;">בקשה חדשה לרשימת המתנה</h2>
        <p><strong>אימייל:</strong> ${email}</p>
        <p><strong>שם:</strong> ${name || "—"}</p>
        <p><strong>איך שמע:</strong> ${sourceLabel}</p>
        ${note ? `<p><strong>מה רוצה לבנות:</strong><br/>${note.replace(/\n/g, "<br/>")}</p>` : ""}
        <p style="margin-top:20px;">
          <a href="https://www.generagent.io/admin/waitlist" style="background:#5E6AD2;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;">
            אשר / דחה →
          </a>
        </p>
      </div>`,
    });
  } catch (e) {
    console.error("[waitlist] admin notify failed", e);
  }

  return NextResponse.json({ ok: true, id: row?.id });
}
