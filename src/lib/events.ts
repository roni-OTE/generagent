/**
 * App event logging — the shared "eyes" of the agent team.
 * Best-effort: never throws, never blocks the caller's happy path.
 */
import { createServiceClient } from "@/lib/supabase/server";

export type AppEventLevel = "info" | "warn" | "error";

export async function logEvent(args: {
  level?: AppEventLevel;
  source: string;
  code?: string;
  message?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from("app_events").insert({
      level: args.level ?? "error",
      source: args.source,
      code: args.code ?? null,
      message: (args.message ?? "").slice(0, 1000) || null,
      meta: args.meta ?? {},
    });
  } catch {
    // Logging must never break the request.
  }
}

/** Classify an Anthropic SDK error into a stable code for events/alerts. */
export function classifyAnthropicError(e: unknown): { code: string; message: string } {
  const msg = e instanceof Error ? e.message : String(e);
  if (/credit balance is too low/i.test(msg)) return { code: "api_credit", message: msg.slice(0, 300) };
  if (/status.*429|rate.?limit/i.test(msg)) return { code: "api_rate_limit", message: msg.slice(0, 300) };
  if (/overloaded|status.*529/i.test(msg)) return { code: "api_overloaded", message: msg.slice(0, 300) };
  if (/parse_failed/i.test(msg)) return { code: "parse_failed", message: msg.slice(0, 300) };
  return { code: "api_error", message: msg.slice(0, 300) };
}
