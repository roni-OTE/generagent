import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateShiraContent, type ContentFormat } from "@/lib/marketing/shira";

export const runtime = "nodejs";
export const maxDuration = 60;

const VALID_FORMATS: ContentFormat[] = ["whatsapp", "linkedin", "blog", "landing_hero", "email_teaser"];

/**
 * POST /api/marketing/generate  { format, topic?, angle? }
 * Admin-only. Asks Shira to write content in the requested format,
 * stores in marketing_content, returns the new row.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  if (me?.plan !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    format?: string;
    topic?: string;
    angle?: string;
  };
  const format = body.format as ContentFormat;
  if (!VALID_FORMATS.includes(format)) {
    return NextResponse.json({ error: "invalid_format" }, { status: 400 });
  }

  const topic = (body.topic ?? "").trim().slice(0, 500) || undefined;
  const angle = (body.angle ?? "").trim().slice(0, 400) || undefined;

  let draft;
  try {
    draft = await generateShiraContent({ format, topic, angle });
  } catch (e) {
    console.error("[marketing/generate] shira failed", e);
    return NextResponse.json({ error: "generation_failed" }, { status: 500 });
  }

  const service = createServiceClient();
  const { data: row, error } = await service
    .from("marketing_content")
    .insert({
      format,
      topic: topic ?? null,
      title: draft.title,
      body: draft.body,
      hook: draft.hook ?? null,
      created_by: user.id,
      metadata: { angle: angle ?? null },
    })
    .select("id, format, topic, title, body, hook, created_at")
    .single();

  if (error) {
    console.error("[marketing/generate] insert failed", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: row });
}

/**
 * DELETE /api/marketing/generate?id=X — remove a draft
 */
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  if (me?.plan !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const service = createServiceClient();
  await service.from("marketing_content").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}

/**
 * PATCH /api/marketing/generate?id=X  { used?: bool }
 */
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  if (me?.plan !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const body = (await req.json().catch(() => ({}))) as { used?: boolean };

  const service = createServiceClient();
  await service
    .from("marketing_content")
    .update({ used_at: body.used ? new Date().toISOString() : null })
    .eq("id", id);
  return NextResponse.json({ ok: true });
}
