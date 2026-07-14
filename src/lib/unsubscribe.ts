/**
 * Unsubscribe tokens + compliant email footer.
 *
 * Amendment 40 (Israeli anti-spam) requires every advertising message to identify
 * the publisher and offer an easy, free opt-out. This module builds a signed,
 * opaque unsubscribe token (no plaintext email as a labelled query param) and a
 * standard footer used by every user-facing mailing.
 */
import crypto from "crypto";

/** Secret for signing unsubscribe tokens. Falls back so no new env var is required. */
function secret(): string {
  return (
    process.env.UNSUBSCRIBE_SECRET ||
    process.env.CRON_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "generagent-fallback-unsubscribe-secret"
  );
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(input: string): string {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex").slice(0, 32);
}

/** Opaque token of the form `<b64url(email)>.<sig>` — carries no labelled PII param. */
export function unsubscribeToken(email: string): string {
  const payload = b64url(email.trim().toLowerCase());
  return `${payload}.${sign(payload)}`;
}

/** Verify a token and recover the email, or null if tampered/invalid. */
export function verifyUnsubscribeToken(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload);
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const email = b64urlDecode(payload).toLowerCase();
    return email.includes("@") ? email : null;
  } catch {
    return null;
  }
}

export function unsubscribeUrl(email: string, baseUrl: string): string {
  return `${baseUrl}/api/unsubscribe?u=${encodeURIComponent(unsubscribeToken(email))}`;
}

/**
 * Compliant footer for every user-facing email: publisher identity + free opt-out,
 * and an explicit "advertising" notice when the message is promotional.
 */
export function complianceFooterHtml(email: string, baseUrl: string, isAd: boolean): string {
  const unsub = unsubscribeUrl(email, baseUrl);
  const address = process.env.NEXT_PUBLIC_PUBLISHER_ADDRESS || "";
  const publisher = `GenerAgent · OTE Group${address ? " · " + address : ""}`;
  return `<div dir="rtl" style="margin-top:22px;padding-top:14px;border-top:1px solid #eee;color:#999;font-size:12px;line-height:1.7">
      ${isAd ? '<p style="margin:0 0 6px">הודעה זו נשלחה כדבר פרסומת.</p>' : ""}
      <p style="margin:0 0 6px">${publisher} · <a href="${baseUrl}" style="color:#999;text-decoration:underline">generagent.io</a></p>
      <p style="margin:0">לא מעוניין לקבל עוד הודעות במייל? <a href="${unsub}" style="color:#5E6AD2;text-decoration:underline">להסרה מרשימת התפוצה</a> · ניתן גם להשיב למייל זה עם המילה "הסר".</p>
    </div>`;
}

/** Prefix an advertising subject with a clear marking, per the law. */
export function adSubject(subject: string, isAd: boolean): string {
  return isAd ? `פרסומת | ${subject}` : subject;
}
