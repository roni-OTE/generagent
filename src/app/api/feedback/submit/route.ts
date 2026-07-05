/**
 * Feedback form submission — public (reached from lifecycle emails / site).
 * Uses the service client (RLS locked on the table); light abuse guard via length caps.
 */
import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: {
    rating?: number;
    what_worked?: string;
    what_missing?: string;
    email?: string;
    source?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "rating_required" }, { status: 400 });
  }

  // Attach user if logged in (optional — form also works from email links)
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch { /* anonymous is fine */ }

  const service = createServiceClient();
  const { error } = await service.from("feedback_responses").insert({
    user_id: userId,
    email: (body.email ?? "").slice(0, 200) || null,
    rating,
    what_worked: (body.what_worked ?? "").slice(0, 2000) || null,
    what_missing: (body.what_missing ?? "").slice(0, 2000) || null,
    source: ["abandoned_email", "followup_email", "site"].includes(body.source ?? "")
      ? body.source
      : "site",
  });
  if (error) {
    await logEvent({ source: "feedback.submit", code: "db_error", message: error.message });
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
