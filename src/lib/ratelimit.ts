/**
 * Lightweight rate limiting backed by the app_events table.
 *
 * Public, email-sending endpoints (waitlist, feedback) were previously
 * unthrottled — anyone could POST in a loop and bomb the founder's inbox
 * (and fill the DB). This throttles by client IP + a global daily ceiling,
 * using app_events rows as the counter (no extra columns needed).
 *
 * Returns { ok: true } to proceed, or { ok: false, status, message } to reject.
 */
import { createServiceClient } from "@/lib/supabase/server";

/** Escape user-controlled text before embedding in an HTML email/body. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export type RateLimitResult =
  | { ok: true; ip: string }
  | { ok: false; status: number; message: string };

/**
 * @param scope     stable name, e.g. "waitlist" | "feedback"
 * @param ipHourly  max requests per IP per hour
 * @param globalDaily max requests across all IPs per day (hard ceiling)
 */
export async function checkRateLimit(
  req: Request,
  scope: string,
  opts: { ipHourly: number; globalDaily: number }
): Promise<RateLimitResult> {
  const supabase = createServiceClient();
  const ip = getClientIp(req);
  const now = Date.now();
  const hourAgo = new Date(now - 3600_000).toISOString();
  const dayAgo = new Date(now - 24 * 3600_000).toISOString();
  const source = `ratelimit.${scope}`;

  try {
    // Global daily ceiling
    const { count: globalToday } = await supabase
      .from("app_events")
      .select("id", { count: "exact", head: true })
      .eq("source", source)
      .gte("created_at", dayAgo);
    if ((globalToday ?? 0) >= opts.globalDaily) {
      return { ok: false, status: 429, message: "השירות עמוס כרגע. נסה שוב מאוחר יותר." };
    }

    // Per-IP hourly cap
    if (ip !== "unknown") {
      const { count: ipRecent } = await supabase
        .from("app_events")
        .select("id", { count: "exact", head: true })
        .eq("source", source)
        .eq("code", ip)
        .gte("created_at", hourAgo);
      if ((ipRecent ?? 0) >= opts.ipHourly) {
        return { ok: false, status: 429, message: "יותר מדי בקשות מהמכשיר שלך. נסה שוב בעוד שעה." };
      }
    }

    // Record this attempt (code = ip so we can count per-IP)
    await supabase.from("app_events").insert({
      level: "info",
      source,
      code: ip,
      message: null,
    });
  } catch {
    // Fail open — never block a legit user because the limiter itself errored.
    return { ok: true, ip };
  }

  return { ok: true, ip };
}
