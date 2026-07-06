/**
 * Publish / unpublish a user's agent to the public template marketplace.
 *
 * POST { consultation_id }         → publish (create template if needed)
 * POST { consultation_id, unpublish:true } → remove from marketplace
 *
 * Publishing is explicit and opt-in. The template's manifest is the same one
 * the user already sees on their result page — they're choosing to make it public.
 */
import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function slugify(name: string, salt: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9א-ת]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "agent"}-${salt.slice(0, 6)}`;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    consultation_id?: string;
    unpublish?: boolean;
  };
  if (!body.consultation_id) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // The package belongs to the user (RLS-guarded read).
  const { data: pkg } = await supabase
    .from("packages")
    .select("id, user_id, name, description, archetype, manifest_json, required_connectors")
    .eq("consultation_id", body.consultation_id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pkg) return NextResponse.json({ error: "package_not_found" }, { status: 404 });

  const service = createServiceClient();

  // Already published from this package?
  const { data: existing } = await service
    .from("templates")
    .select("id, slug, published")
    .eq("source_package_id", pkg.id)
    .maybeSingle();

  if (body.unpublish) {
    if (existing) {
      await service.from("templates").update({ published: false }).eq("id", existing.id);
    }
    return NextResponse.json({ ok: true, published: false });
  }

  const manifest = (pkg.manifest_json ?? {}) as Record<string, unknown>;
  const persona = (manifest.persona_match as string) ?? null;
  const tags = Array.isArray(pkg.required_connectors) ? pkg.required_connectors.slice(0, 6) : [];

  if (existing) {
    // Re-publish (and refresh content) an existing template.
    const { data: t } = await service
      .from("templates")
      .update({
        published: true,
        name: pkg.name,
        description: pkg.description,
        persona,
        tags,
        manifest_json: manifest,
      })
      .eq("id", existing.id)
      .select("slug")
      .single();
    return NextResponse.json({ ok: true, published: true, slug: t?.slug ?? existing.slug });
  }

  const slug = slugify(pkg.name, pkg.id);
  const { data: created, error } = await service
    .from("templates")
    .insert({
      author_id: user.id,
      source_package_id: pkg.id,
      slug,
      name: pkg.name,
      description: pkg.description,
      tags,
      persona,
      manifest_json: manifest,
      published: true,
    })
    .select("slug")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, published: true, slug: created?.slug });
}
