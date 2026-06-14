import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Short alias: /i/<id> → install script for Claude Code.
 * Designed for `curl -fsSL https://generagent.io/i/<id> | bash`
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const target = new URL(req.url);
  target.pathname = `/api/install/${id}`;
  target.search = `?platform=claude-code&format=script`;
  return NextResponse.redirect(target.toString(), { status: 307 });
}
