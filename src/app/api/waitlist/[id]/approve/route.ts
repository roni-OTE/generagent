import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

/**
 * POST /api/waitlist/[id]/approve
 * Admin approves a waitlist entry:
 *   - Mints a fresh invite code via mint_waitlist_code()
 *   - Updates waitlist row (status='approved', invite_code_id, approved_at, approved_by)
 *   - Sends styled Hebrew email to the applicant with their personal invite link
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  if (me?.plan !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const service = createServiceClient();

  const { data: entry } = await service
    .from("waitlist")
    .select("id, email, name, status, invite_code_id")
    .eq("id", id)
    .single();

  if (!entry) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (entry.status === "approved" && entry.invite_code_id) {
    return NextResponse.json({ ok: true, already_approved: true });
  }

  // Mint fresh code
  const { data: mintedCode, error: mintErr } = await service.rpc("mint_waitlist_code", { p_prefix: "WAIT" });
  if (mintErr || !mintedCode) {
    console.error("[approve] mint failed", mintErr);
    return NextResponse.json({ error: "mint_failed" }, { status: 500 });
  }
  const code = String(mintedCode);

  const { data: codeRow } = await service
    .from("invite_codes")
    .select("id")
    .eq("code", code)
    .single();

  // Mark waitlist row approved
  await service
    .from("waitlist")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      invite_code_id: codeRow?.id ?? null,
    })
    .eq("id", entry.id);

  // Send styled Hebrew approval email
  const inviteUrl = `https://www.generagent.io/login?invite=${encodeURIComponent(code)}`;
  const displayName = entry.name || entry.email.split("@")[0];
  const html = `<div dir="rtl" style="font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:#f7f7fb;padding:32px 16px;color:#1a1f2e;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:36px 32px;box-shadow:0 6px 30px rgba(94,106,210,0.10);border:1px solid #E4E6F0;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:22px;">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:9px;background:linear-gradient(135deg,#5E6AD2,#B867FF);color:#fff;font-weight:800;">G</span>
        <span style="font-weight:700;font-size:16px;color:#1a1f2e;">GenerAgent</span>
      </div>
      <h1 style="font-size:22px;margin:0 0 12px;color:#1a1f2e;">${displayName} — התור שלך הגיע 🎉</h1>
      <p style="font-size:15px;line-height:1.65;color:#4a5060;margin:0 0 20px;">
        קיבלנו את הבקשה שלך להצטרף ל-GenerAgent, ואני שמח לאשר שהמקום שלך שמור.
        אתה בין 40 האנשים הראשונים שנכנסים למערכת.
      </p>
      <p style="font-size:15px;line-height:1.65;color:#4a5060;margin:0 0 24px;">
        לחץ על הכפתור כדי להיכנס עם קוד ההזמנה האישי שלך:
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${inviteUrl}" style="display:inline-block;background:linear-gradient(135deg,#5E6AD2,#B867FF);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;font-size:15px;box-shadow:0 4px 14px rgba(94,106,210,0.35);">
          כניסה למערכת ←
        </a>
      </div>
      <p style="font-size:13px;color:#6a7080;text-align:center;margin:16px 0 0;">
        הקישור אישי ותקף לחשבון שלך בלבד. אל תעביר אותו הלאה.
      </p>
      <hr style="border:none;border-top:1px solid #E4E6F0;margin:28px 0 20px;"/>
      <p style="font-size:13px;color:#6a7080;line-height:1.6;margin:0;">
        אם יש שאלות — פשוט להשיב למייל הזה או לשלוח ל-<a href="mailto:support@generagent.io" style="color:#5E6AD2;">support@generagent.io</a>.
      </p>
      <p style="font-size:12px;color:#9096a5;margin:24px 0 0;">רוני · GenerAgent</p>
    </div>
  </div>`;

  const emailRes = await sendEmail({
    to: entry.email,
    subject: `🎉 הבקשה שלך ל-GenerAgent אושרה`,
    html,
  });

  return NextResponse.json({ ok: true, code, email_sent: emailRes.success });
}

/**
 * POST /api/waitlist/[id]/reject (below in same file)
 * Marks entry as rejected. No email sent (silent).
 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  if (me?.plan !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const service = createServiceClient();
  await service.from("waitlist").update({ status: "rejected" }).eq("id", id);
  return NextResponse.json({ ok: true });
}
