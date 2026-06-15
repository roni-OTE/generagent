import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data: me } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  if (me?.plan !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    decision_index?: number;
    response?: string;
  };

  if (typeof body.decision_index !== "number" || typeof body.response !== "string") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const text = body.response.trim().slice(0, 2000);

  // Service client because team_standups has admin-read-only RLS;
  // we need to update.
  const service = createServiceClient();
  const { data: standup } = await service
    .from("team_standups")
    .select("user_responses")
    .eq("id", id)
    .single();
  if (!standup) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const existing = (standup.user_responses as Record<string, { response: string; at: string }>) ?? {};
  existing[String(body.decision_index)] = {
    response: text,
    at: new Date().toISOString(),
  };

  const { error } = await service
    .from("team_standups")
    .update({ user_responses: existing })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
