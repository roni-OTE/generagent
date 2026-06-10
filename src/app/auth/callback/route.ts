import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth callback handler — exchanges code for session, then redirects.
 * Called by Supabase after Google OAuth or email magic-link flow.
 */
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
    return NextResponse.redirect(`${origin}${next}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
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
