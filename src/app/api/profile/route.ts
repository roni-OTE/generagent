import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { display_name?: string };
  const newName = typeof body.display_name === "string" ? body.display_name.trim().slice(0, 60) : null;
  if (!newName || newName.length === 0) {
    return NextResponse.json({ error: "display_name_required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: newName, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, display_name: newName });
}
