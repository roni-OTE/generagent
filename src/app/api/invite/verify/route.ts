import { NextResponse } from "next/server";
import { checkInviteCode, INVITE_COOKIE, INVITE_COOKIE_MAX_AGE } from "@/lib/invite";

export const runtime = "nodejs";

/**
 * POST /api/invite/verify  { code }
 * Validates the invite code without consuming it.
 * On valid → sets an httpOnly cookie so the auth callback can consume it after sign-in.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { code?: string };
  const code = (body.code ?? "").trim().toUpperCase();
  const check = await checkInviteCode(code);

  const res = NextResponse.json({
    valid: check.valid,
    reason: check.valid ? null : check.reason,
    source: check.valid ? check.source : null,
  });

  if (check.valid) {
    res.cookies.set(INVITE_COOKIE, code, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: INVITE_COOKIE_MAX_AGE,
    });
  }
  return res;
}

/** GET /api/invite/verify?code=X — same as POST, convenient for links */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = (url.searchParams.get("code") ?? "").trim().toUpperCase();
  const check = await checkInviteCode(code);

  const res = NextResponse.json({
    valid: check.valid,
    reason: check.valid ? null : check.reason,
    source: check.valid ? check.source : null,
  });

  if (check.valid) {
    res.cookies.set(INVITE_COOKIE, code, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: INVITE_COOKIE_MAX_AGE,
    });
  }
  return res;
}
