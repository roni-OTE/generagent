import type { SupabaseClient } from "@supabase/supabase-js";

export const QUOTA_LIMITS = {
  trial: 100_000,
  pro: 1_000_000,
  admin: Number.POSITIVE_INFINITY,
  expired: 0,
} as const;

/** Per-single-consultation cap to prevent runaway chats */
export const PER_CHAT_CAP = 60_000;

export type QuotaStatus = {
  plan: keyof typeof QUOTA_LIMITS;
  limit: number;
  used: number;
  remaining: number;
  period_started_at: string;
  reset_in_days: number;
  percent: number;
  blocked: boolean;
};

export async function getQuotaStatus(
  supabase: SupabaseClient,
  userId: string
): Promise<QuotaStatus | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, tokens_used_period, tokens_period_started_at")
    .eq("id", userId)
    .single();
  if (!profile) return null;

  const plan = (profile.plan as keyof typeof QUOTA_LIMITS) ?? "trial";
  const limit = QUOTA_LIMITS[plan] ?? QUOTA_LIMITS.trial;

  // If period older than 30 days, treat used as 0 (DB will reset on next add_user_tokens call)
  const periodStart = new Date(profile.tokens_period_started_at);
  const ageMs = Date.now() - periodStart.getTime();
  const periodMs = 30 * 24 * 60 * 60 * 1000;
  const periodExpired = ageMs > periodMs;
  const used = periodExpired ? 0 : Number(profile.tokens_used_period ?? 0);

  const remaining = Number.isFinite(limit) ? Math.max(0, limit - used) : Number.POSITIVE_INFINITY;
  const percent = Number.isFinite(limit) ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const resetInDays = periodExpired ? 30 : Math.max(0, Math.ceil((periodMs - ageMs) / (24 * 60 * 60 * 1000)));

  return {
    plan,
    limit,
    used,
    remaining,
    period_started_at: profile.tokens_period_started_at,
    reset_in_days: resetInDays,
    percent,
    blocked: remaining <= 0 && Number.isFinite(limit),
  };
}

/** Record tokens after a Claude call. Best-effort; never throws. */
export async function recordUsage(
  supabase: SupabaseClient,
  userId: string,
  inputTokens: number,
  outputTokens: number
): Promise<void> {
  const total = Math.max(0, Math.round(inputTokens + outputTokens));
  if (total === 0) return;
  await supabase.rpc("add_user_tokens", { p_user_id: userId, p_tokens: total }).then(
    () => undefined,
    () => undefined
  );
}
