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
import { checkRateLimit } from "@/lib/ratelimit";
import { sanitizeManifestForPublish } from "@/lib/sanitize-template";
import { recordUsage } from "@/lib/quota";

export const runtime = "nodejs";
// Sanitization is an LLM pass over the (possibly 8k-token) system prompt.
export const maxDuration = 300;

// Anti-spam: one person can't flood the public gallery.
const MAX_PUBLISHED_PER_USER = 10;

// Slug uses more of the id (12 hex chars) → collision-resistant.
function slugify(name: string, salt: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9א-ת]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "agent"}-${salt.replace(/-/g, "").slice(0, 12)}`;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // Throttle publish churn per user/IP.
  const rl = await checkRateLimit(req, "publish", { ipHourly: 20, globalDaily: 500 });
  if (!rl.ok) return NextResponse.json({ error: rl.message }, { status: rl.status });

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
    .select("id, slug, published, admin_blocked")
    .eq("source_package_id", pkg.id)
    .maybeSingle();

  if (body.unpublish) {
    if (existing) {
      await service.from("templates").update({ published: false }).eq("id", existing.id);
    }
    return NextResponse.json({ ok: true, published: false });
  }

  // An admin takedown is final — the author cannot re-publish blocked content.
  if (existing?.admin_blocked) {
    return NextResponse.json({ error: "blocked_by_admin" }, { status: 403 });
  }

  // Per-user cap on published templates (anti-spam). Re-publishing an existing
  // one doesn't count against the cap.
  if (!existing) {
    const { count: publishedCount } = await service
      .from("templates")
      .select("id", { count: "exact", head: true })
      .eq("author_id", user.id)
      .eq("published", true);
    if ((publishedCount ?? 0) >= MAX_PUBLISHED_PER_USER) {
      return NextResponse.json(
        { error: `הגעת למקסימום ${MAX_PUBLISHED_PER_USER} סוכנים מפורסמים. הסר אחד קודם.` },
        { status: 429 }
      );
    }
  }

  const rawManifest = (pkg.manifest_json ?? {}) as Record<string, unknown>;

  // Strip the publisher's business specifics before it goes public. Fails CLOSED:
  // if sanitization errors, we do NOT publish raw data.
  let manifest: Record<string, unknown>;
  let cleanName = pkg.name;
  let cleanDescription = pkg.description;
  try {
    const result = await sanitizeManifestForPublish(rawManifest);
    manifest = result.manifest;
    await recordUsage(supabase, user.id, result.usage.inputTokens, result.usage.outputTokens);
    // Prefer the sanitized name/description for the public listing.
    if (typeof manifest.agent_name === "string" && manifest.agent_name.trim()) {
      cleanName = manifest.agent_name as string;
    }
    if (typeof manifest.agent_description === "string" && manifest.agent_description.trim()) {
      cleanDescription = manifest.agent_description as string;
    }
  } catch {
    return NextResponse.json(
      { error: "לא הצלחנו לנקות את הפרטים העסקיים כרגע. נסה שוב בעוד רגע — לא פרסמנו כלום." },
      { status: 503 }
    );
  }

  const persona = (manifest.persona_match as string) ?? null;
  const tags = Array.isArray(pkg.required_connectors) ? pkg.required_connectors.slice(0, 6) : [];

  if (existing) {
    // Re-publish (and refresh content) an existing template.
    const { data: t } = await service
      .from("templates")
      .update({
        published: true,
        name: cleanName,
        description: cleanDescription,
        persona,
        tags,
        manifest_json: manifest,
      })
      .eq("id", existing.id)
      .select("slug")
      .single();
    return NextResponse.json({ ok: true, published: true, slug: t?.slug ?? existing.slug });
  }

  const slug = slugify(cleanName, pkg.id);
  const { data: created, error } = await service
    .from("templates")
    .insert({
      author_id: user.id,
      source_package_id: pkg.id,
      slug,
      name: cleanName,
      description: cleanDescription,
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
