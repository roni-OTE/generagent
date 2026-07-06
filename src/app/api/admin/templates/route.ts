/**
 * Admin marketplace moderation.
 * POST { template_id, action: "block" | "unblock" | "unpublish" }
 *
 * "block"     → hides it AND prevents the author from re-publishing (permanent takedown)
 * "unblock"   → clears the block (stays unpublished until author re-publishes)
 * "unpublish" → soft hide (author can re-publish)
 */
import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data: me } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  if (me?.plan !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    template_id?: string;
    action?: "block" | "unblock" | "unpublish";
  };
  if (!body.template_id || !["block", "unblock", "unpublish"].includes(body.action ?? "")) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const patch =
    body.action === "block"
      ? { admin_blocked: true, published: false }
      : body.action === "unblock"
        ? { admin_blocked: false }
        : { published: false };

  const service = createServiceClient();
  const { error } = await service.from("templates").update(patch).eq("id", body.template_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, action: body.action });
}
