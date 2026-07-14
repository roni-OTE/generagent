/**
 * Unsubscribe endpoint — honors opt-out from lifecycle/marketing email.
 *
 * GET  ?u=<token>  → confirmation page with a single "confirm" button
 * POST u=<token>   → adds the email to email_suppressions (idempotent)
 *
 * Two-step (page + confirm) avoids accidental opt-out from email-client link
 * prefetching, while staying a simple, free removal as the law requires.
 */
import { createServiceClient } from "@/lib/supabase/server";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";

export const runtime = "nodejs";

function page(title: string, body: string, status = 200): Response {
  const html = `<!doctype html><html lang="he" dir="rtl"><head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${title}</title></head>
    <body style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;background:#0F1430;color:#1A1F4F;margin:0;padding:0">
      <div style="max-width:520px;margin:8vh auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 10px 40px rgba(0,0,0,.25)">
        ${body}
        <p style="color:#999;font-size:12px;margin-top:24px">GenerAgent · OTE Group</p>
      </div>
    </body></html>`;
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8" } });
}

function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const shown = name.length <= 2 ? name[0] : name.slice(0, 2);
  return `${shown}${"*".repeat(Math.max(1, name.length - 2))}@${domain}`;
}

export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get("u") ?? "";
  const email = verifyUnsubscribeToken(u);
  if (!email) {
    return page("קישור לא תקין", `<h1 style="font-size:20px;margin:0 0 10px">הקישור אינו תקין או פג תוקף</h1>
      <p style="line-height:1.6;color:#444">לא הצלחנו לאמת את בקשת ההסרה. אפשר להשיב למייל שקיבלת עם המילה "הסר" ונטפל בזה ידנית.</p>`, 400);
  }
  return page("הסרה מרשימת התפוצה", `<h1 style="font-size:20px;margin:0 0 12px">להסיר את ${maskEmail(email)} מרשימת התפוצה?</h1>
    <p style="line-height:1.6;color:#444;margin:0 0 20px">לא תקבל יותר מיילים שיווקיים מ-GenerAgent. הפעולה חינמית ומיידית.</p>
    <form method="post" action="/api/unsubscribe">
      <input type="hidden" name="u" value="${u.replace(/"/g, "&quot;")}">
      <button type="submit" style="background:#5E6AD2;color:#fff;border:0;padding:12px 26px;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer">אשר הסרה</button>
    </form>`);
}

export async function POST(req: Request) {
  let u = "";
  const ctype = req.headers.get("content-type") ?? "";
  if (ctype.includes("application/x-www-form-urlencoded") || ctype.includes("multipart/form-data")) {
    const form = await req.formData();
    u = String(form.get("u") ?? "");
  } else {
    u = new URL(req.url).searchParams.get("u") ?? "";
  }

  const email = verifyUnsubscribeToken(u);
  if (!email) {
    return page("קישור לא תקין", `<h1 style="font-size:20px;margin:0 0 10px">הקישור אינו תקין</h1>
      <p style="line-height:1.6;color:#444">לא הצלחנו לאמת את הבקשה.</p>`, 400);
  }

  try {
    const supabase = createServiceClient();
    await supabase
      .from("email_suppressions")
      .upsert({ email, reason: "unsubscribe", source: "email_link" }, { onConflict: "email" });
  } catch {
    return page("שגיאה זמנית", `<h1 style="font-size:20px;margin:0 0 10px">משהו השתבש</h1>
      <p style="line-height:1.6;color:#444">אפשר להשיב למייל עם המילה "הסר" ונסיר ידנית.</p>`, 500);
  }

  return page("הוסרת מרשימת התפוצה", `<h1 style="font-size:20px;margin:0 0 12px">הוסרת בהצלחה ✓</h1>
    <p style="line-height:1.6;color:#444">${maskEmail(email)} לא יקבל יותר מיילים שיווקיים מ-GenerAgent. אם זו טעות, אפשר להשיב למייל שקיבלת.</p>`);
}
