import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import TemplateModRow from "./TemplateModRow";

export const metadata = { title: "מרקטפלייס · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminTemplatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  if (me?.plan !== "admin") redirect("/dashboard");

  const service = createServiceClient();
  const { data: templates } = await service
    .from("templates")
    .select("id, slug, name, description, published, admin_blocked, install_count, created_at, author_id")
    .order("created_at", { ascending: false })
    .limit(200);

  const list = templates ?? [];
  const live = list.filter((t) => t.published && !t.admin_blocked);
  const blocked = list.filter((t) => t.admin_blocked);

  return (
    <div dir="rtl" className="min-h-screen px-4 py-10 max-w-3xl mx-auto">
      <Link href="/admin" className="text-xs text-[var(--fg-dim)] hover:text-white">← admin</Link>
      <div className="mt-4 mb-8">
        <div className="text-[11px] tracking-widest text-[var(--indigo-text)] font-mono mb-1">
          MARKETPLACE MODERATION
        </div>
        <h1 className="text-2xl font-bold text-white">ניהול המרקטפלייס</h1>
        <p className="text-sm text-[var(--fg-dim)] mt-1">
          {live.length} סוכנים חיים · {blocked.length} חסומים · סה״כ {list.length}
        </p>
      </div>

      {list.length === 0 ? (
        <div className="text-center py-16 text-[var(--fg-muted)] text-sm">
          עוד אין סוכנים מפורסמים.
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((t) => (
            <TemplateModRow
              key={t.id}
              id={t.id}
              slug={t.slug}
              name={t.name}
              description={t.description}
              published={t.published}
              adminBlocked={t.admin_blocked}
              installCount={t.install_count}
            />
          ))}
        </div>
      )}
    </div>
  );
}
