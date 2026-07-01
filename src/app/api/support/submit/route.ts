import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateDanaReply } from "@/lib/support/dana";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 60;

const SUPPORT_FROM = "GenerAgent Support <support@generagent.io>";
const FOUNDER_EMAIL = process.env.FOUNDER_EMAIL ?? "roni@otegroup.co.il";

/**
 * POST /api/support/submit
 * { email, name?, subject?, message }
 * Creates a ticket, generates Dana's reply, emails the user, notifies admin if escalated.
 * Rate-limited by IP to prevent abuse: max 3 per hour per email.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    name?: string;
    subject?: string;
    message?: string;
  };
  const email = (body.email ?? "").trim().toLowerCase();
  const name = (body.name ?? "").trim().slice(0, 120) || null;
  const subject = (body.subject ?? "").trim().slice(0, 200) || null;
  const message = (body.message ?? "").trim().slice(0, 4000);

  if (!email || !/.+@.+\..+/.test(email)) {
    return NextResponse.json({ error: "אימייל לא תקין" }, { status: 400 });
  }
  if (!message || message.length < 3) {
    return NextResponse.json({ error: "אנא כתוב הודעה קצרה יותר" }, { status: 400 });
  }

  const service = createServiceClient();

  // Rate limit: 3 tickets per email per hour
  const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
  const { count: recentCount } = await service
    .from("support_tickets")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", oneHourAgo);
  if ((recentCount ?? 0) >= 3) {
    return NextResponse.json(
      { error: "יותר מדי פניות בשעה האחרונה. נסה שוב בעוד שעה." },
      { status: 429 }
    );
  }

  // Attach to authed user if signed in
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  // Get prior thread from same email in last 30 days for context
  const monthAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const { data: priorTickets } = await service
    .from("support_tickets")
    .select("id")
    .eq("email", email)
    .gte("created_at", monthAgo)
    .order("created_at", { ascending: false })
    .limit(1);

  let priorMessages: { direction: string; content: string }[] = [];
  if (priorTickets && priorTickets.length > 0) {
    const { data: msgs } = await service
      .from("support_messages")
      .select("direction, content")
      .eq("ticket_id", priorTickets[0].id)
      .order("created_at", { ascending: true })
      .limit(6);
    priorMessages = msgs ?? [];
  }

  // Create ticket
  const { data: ticket, error: ticketErr } = await service
    .from("support_tickets")
    .insert({
      user_id: userId,
      email,
      name,
      subject,
      status: "open",
    })
    .select("id, created_at")
    .single();

  if (ticketErr || !ticket) {
    console.error("[support] ticket insert failed", ticketErr);
    return NextResponse.json({ error: "שמירת הפנייה נכשלה" }, { status: 500 });
  }

  // Save inbound message
  const { data: inboundMsg } = await service
    .from("support_messages")
    .insert({
      ticket_id: ticket.id,
      direction: "inbound",
      from_role: "user",
      content: message,
    })
    .select("id")
    .single();

  await service.from("support_tickets").update({ first_message_id: inboundMsg?.id }).eq("id", ticket.id);

  // Generate Dana's reply
  let dana;
  try {
    dana = await generateDanaReply({
      fromName: name,
      fromEmail: email,
      subject,
      messageBody: message,
      priorMessages,
    });
  } catch (e) {
    console.error("[support] dana failed", e);
    dana = {
      reply_text: `שלום ${name || ""},\n\nתודה שפנית. הפנייה שלך התקבלה ורוני יחזור אליך אישית תוך 24 שעות.\n\nבכיף,\nדנה · צוות GenerAgent`,
      category: "other" as const,
      escalate: true,
      escalate_reason: "reply generator threw",
    };
  }

  // Save Dana's outbound message
  await service.from("support_messages").insert({
    ticket_id: ticket.id,
    direction: "outbound",
    from_role: "dana",
    content: dana.reply_text,
    metadata: { escalated: dana.escalate, escalate_reason: dana.escalate_reason ?? null },
  });

  // Update ticket status/category
  await service
    .from("support_tickets")
    .update({
      status: dana.escalate ? "escalated" : "answered",
      escalated: dana.escalate,
      category: dana.category,
      last_message_at: new Date().toISOString(),
    })
    .eq("id", ticket.id);

  // Email Dana's reply to the user
  const escalatedNote = dana.escalate
    ? `<div dir="rtl" style="margin:16px 0;padding:12px 16px;background:#FFF7E6;border-right:3px solid #F59E0B;border-radius:8px;font-size:13px;color:#7C2D12;">
        <strong>הפנייה שלך הועברה לרוני אישית.</strong> הוא יחזור אליך תוך 24 שעות.
      </div>`
    : "";

  const replyBody = dana.reply_text.replace(/\n/g, "<br/>");
  const html = `<div dir="rtl" style="font-family:'Segoe UI',system-ui,sans-serif;background:#f7f7fb;padding:32px 16px;color:#1a1f2e;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px 30px;box-shadow:0 6px 24px rgba(94,106,210,0.08);border:1px solid #E4E6F0;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:9px;background:linear-gradient(135deg,#5E6AD2,#B867FF);color:#fff;font-weight:800;">G</span>
        <span style="font-weight:700;font-size:15px;color:#1a1f2e;">GenerAgent · תמיכה</span>
      </div>
      ${escalatedNote}
      <div style="font-size:15px;line-height:1.75;color:#2a2f4a;white-space:normal;">
        ${replyBody}
      </div>
      <hr style="border:none;border-top:1px solid #E4E6F0;margin:26px 0 16px;"/>
      <p style="font-size:12px;color:#6a7080;margin:0;line-height:1.6;">
        השבת על מייל זה שולחת ישירות לרוני, המייסד.
      </p>
    </div>
  </div>`;

  await sendEmail({
    to: email,
    from: SUPPORT_FROM,
    subject: subject ? `Re: ${subject}` : `תגובה מ-GenerAgent`,
    html,
  });

  // If escalated, alert Roni
  if (dana.escalate) {
    const adminNote = `<div dir="rtl" style="font-family:system-ui,sans-serif;padding:20px;color:#1a1f2e;">
      <h2 style="margin:0 0 12px;">🚨 דנה סימנה פנייה להסלמה</h2>
      <p><strong>מייל:</strong> ${email}</p>
      <p><strong>שם:</strong> ${name || "—"}</p>
      <p><strong>נושא:</strong> ${subject || "—"}</p>
      <p><strong>סיבה להסלמה:</strong> ${dana.escalate_reason || "—"}</p>
      <p><strong>ההודעה:</strong><br/>${message.replace(/\n/g, "<br/>")}</p>
      <p><strong>תגובת דנה:</strong><br/>${dana.reply_text.replace(/\n/g, "<br/>")}</p>
      <p style="margin-top:20px;">
        <a href="https://www.generagent.io/admin/support/${ticket.id}" style="background:#5E6AD2;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;">
          פתח את הפנייה →
        </a>
      </p>
    </div>`;
    await sendEmail({
      to: FOUNDER_EMAIL,
      subject: `🚨 [support] הסלמה: ${subject || email}`,
      html: adminNote,
    });
  }

  return NextResponse.json({
    ok: true,
    ticket_id: ticket.id,
    escalated: dana.escalate,
  });
}
