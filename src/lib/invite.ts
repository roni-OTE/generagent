/**
 * Invite-code helpers.
 * Codes are consumed atomically via the SECURITY DEFINER function claim_invite_code().
 */
import { createServiceClient } from "@/lib/supabase/server";

export const INVITE_COOKIE = "gen_invite";
export const INVITE_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type InviteValidity =
  | { valid: true; source: string }
  | { valid: false; reason: "not_found" | "used" | "empty" };

/** Look up an invite code. Does NOT consume it. */
export async function checkInviteCode(code: string): Promise<InviteValidity> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return { valid: false, reason: "empty" };
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("invite_codes")
    .select("code, source, used_at")
    .eq("code", trimmed)
    .maybeSingle();
  if (!data) return { valid: false, reason: "not_found" };
  if (data.used_at) return { valid: false, reason: "used" };
  return { valid: true, source: data.source };
}

/** Atomically consume a code for the given user. Returns true if successful. */
export async function consumeInviteCode(code: string, userId: string): Promise<boolean> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return false;
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("claim_invite_code", {
    p_code: trimmed,
    p_user_id: userId,
  });
  if (error) {
    console.error("[invite] claim_invite_code error", error);
    return false;
  }
  return data === true;
}
