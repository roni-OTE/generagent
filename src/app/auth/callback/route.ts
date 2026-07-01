import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { consumeInviteCode, INVITE_COOKIE } from "@/lib/invite";

/**
 * OAuth callback handler — exchanges code for session, then redirects.
 * Called by Supabase after Google OAuth or email magic-link flow.
 *
 * Invite gate:
 *   - If this session belongs to a brand-new user (profile.created_at
 *     within last 60s), we require a valid invite cookie.
 *   - Consumes the invite atomically. If missing/invalid → sign them out
 *     and redirect to /waitlist so they can request access.
 *   - Existing users bypass this check entirely.
 */
async function enforceInviteGate(request: Request, origin: string): Promise<NextResponse | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("id, created_at")
    .eq("id", user.id)
    .maybeSingle();

  // Existing user (profile > 60s old) — no gate.
  if (profile && Date.now() - new Date(profile.created_at).getTime() > 60_000) {
    return null;
  }

  // New user path. Try to consume the invite cookie.
  const cookieStore = await cookies();
  const inviteCookie = cookieStore.get(INVITE_COOKIE)?.value ?? "";
  const consumed = inviteCookie ? await consumeInviteCode(inviteCookie, user.id) : false;

  if (!consumed) {
    // Reject: sign them out + delete their fresh profile + redirect to waitlist.
    await service.from("profiles").delete().eq("id", user.id);
    await service.auth.admin.deleteUser(user.id);
    await supabase.auth.signOut();
    const url = new URL(`${origin}/waitlist?blocked=1&email=${encodeURIComponent(user.email ?? "")}`);
    const res = NextResponse.redirect(url);
    res.cookies.delete(INVITE_COOKIE);
    return res;
  }

  // Success — clear the invite cookie (best effort — deleted by NextResponse below).
  return null;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/legal/accept";
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const oauthError = searchParams.get("error");
  const oauthErrorDescription = searchParams.get("error_description");

  if (oauthError) {
    console.error("[auth/callback] provider error", { oauthError, oauthErrorDescription });
    const params = new URLSearchParams({
      error: "oauth_provider",
      detail: oauthErrorDescription || oauthError,
    });
    return NextResponse.redirect(`${origin}/login?${params.toString()}`);
  }

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type: type as "email" | "magiclink" | "recovery" | "invite",
      token_hash: tokenHash,
    });
    if (error) {
      console.error("[auth/callback] verifyOtp failed", error);
      const params = new URLSearchParams({
        error: "otp_failed",
        detail: error.message,
      });
      return NextResponse.redirect(`${origin}/login?${params.toString()}`);
    }
    const gated = await enforceInviteGate(request, origin);
    if (gated) return gated;
    const res = NextResponse.redirect(`${origin}${next}`);
    res.cookies.delete(INVITE_COOKIE);
    return res;
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const gated = await enforceInviteGate(request, origin);
      if (gated) return gated;
      const res = NextResponse.redirect(`${origin}${next}`);
      res.cookies.delete(INVITE_COOKIE);
      return res;
    }
    console.error("[auth/callback] exchangeCodeForSession failed", error);
    const params = new URLSearchParams({
      error: "exchange_failed",
      detail: error.message,
    });
    return NextResponse.redirect(`${origin}/login?${params.toString()}`);
  }

  console.error("[auth/callback] no code, no token_hash, no error");
  return NextResponse.redirect(`${origin}/login?error=missing_params`);
}
