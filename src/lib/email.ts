/**
 * Lightweight Resend wrapper. If RESEND_API_KEY is missing, sendEmail is a no-op
 * (returns success=false but doesn't throw) so the rest of the flow keeps working.
 */

type SendEmailArgs = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
};

export async function sendEmail(args: SendEmailArgs): Promise<{ success: boolean; error?: string; id?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const from = args.from ?? "GenerAgent Team <onboarding@resend.dev>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(args.to) ? args.to : [args.to],
        subject: args.subject,
        html: args.html,
        text: args.text,
      }),
    });
    const data = (await res.json()) as { id?: string; message?: string };
    if (!res.ok) {
      return { success: false, error: data.message ?? `http ${res.status}` };
    }
    return { success: true, id: data.id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

/** Convert plain-text markdown-ish lines into a simple HTML email body. */
export function markdownToBasicHtml(md: string): string {
  // Basic conversion: headings, lists, paragraphs, RTL wrapping
  const lines = md.split("\n");
  const out: string[] = [];
  let inList = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("# ")) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(`<h1 style="font-size:22px;margin:24px 0 12px;color:#0F1430;">${escape(trimmed.slice(2))}</h1>`);
    } else if (trimmed.startsWith("## ")) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(`<h2 style="font-size:17px;margin:20px 0 10px;color:#0F1430;">${escape(trimmed.slice(3))}</h2>`);
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      if (!inList) { out.push('<ul style="padding-right:20px;margin:6px 0;">'); inList = true; }
      out.push(`<li style="margin:4px 0;">${formatInline(trimmed.slice(2))}</li>`);
    } else if (trimmed.length === 0) {
      if (inList) { out.push("</ul>"); inList = false; }
    } else {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(`<p style="margin:8px 0;line-height:1.55;">${formatInline(trimmed)}</p>`);
    }
  }
  if (inList) out.push("</ul>");
  return `<div dir="rtl" lang="he" style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;max-width:680px;margin:0 auto;padding:24px;color:#1A1F4F;">${out.join("")}</div>`;
}

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function formatInline(s: string): string {
  return escape(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`(.+?)`/g, '<code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-family:monospace;">$1</code>');
}
