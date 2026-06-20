import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TEAM_AGENTS } from "@/lib/team/agents";

export const runtime = "nodejs";

/** POST → create a new chat with an agent. Body: { agent_handle } */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  if (me?.plan !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { agent_handle?: string };
  const handle = body.agent_handle;
  if (!handle || !TEAM_AGENTS.find((a) => a.handle === handle)) {
    return NextResponse.json({ error: "bad_agent" }, { status: 400 });
  }

  const { data: chat, error } = await supabase
    .from("team_agent_chats")
    .insert({ user_id: user.id, agent_handle: handle })
    .select("id")
    .single();
  if (error || !chat) return NextResponse.json({ error: error?.message ?? "create_failed" }, { status: 500 });

  return NextResponse.json({ id: chat.id });
}
