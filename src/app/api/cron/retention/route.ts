/**
 * Data retention — runs weekly (Monday 04:00 UTC) via Vercel cron.
 * Enforces what the terms of service promise: transcripts kept 90 days.
 *
 * Deletes:
 * - messages older than 90 days (chat transcripts — the sensitive part)
 * - consultations older than 90 days that never completed (their messages cascade)
 * - support_messages older than 90 days (tickets themselves are kept as metadata)
 * - app_events older than 60 days (operational noise)
 *
 * Keeps: packages (the user's product), completed consultations' analysis_json,
 * profiles, feedback.
 */
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const d90 = new Date(Date.now() - 90 * 24 * 3600_000).toISOString();
  const d60 = new Date(Date.now() - 60 * 24 * 3600_000).toISOString();

  const results: Record<string, number | string> = {};

  {
    const { count, error } = await supabase
      .from("messages")
      .delete({ count: "exact" })
      .lt("created_at", d90);
    results.messages = error ? `error: ${error.message}` : count ?? 0;
  }
  {
    const { count, error } = await supabase
      .from("consultations")
      .delete({ count: "exact" })
      .lt("created_at", d90)
      .neq("status", "completed");
    results.stale_consultations = error ? `error: ${error.message}` : count ?? 0;
  }
  {
    const { count, error } = await supabase
      .from("support_messages")
      .delete({ count: "exact" })
      .lt("created_at", d90);
    results.support_messages = error ? `error: ${error.message}` : count ?? 0;
  }
  {
    const { count, error } = await supabase
      .from("app_events")
      .delete({ count: "exact" })
      .lt("created_at", d60);
    results.app_events = error ? `error: ${error.message}` : count ?? 0;
  }

  await supabase.from("app_events").insert({
    level: "info",
    source: "retention",
    code: "weekly_run",
    message: "מחיקת נתונים לפי מדיניות 90 יום",
    meta: results,
  });

  return NextResponse.json({ ok: true, deleted: results });
}

export async function GET(req: Request) {
  return POST(req);
}
