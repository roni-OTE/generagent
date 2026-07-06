import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata = {
  title: "מרקטפלייס · GenerAgent",
  description: "טמפלייטי סוכן AI שמשתמשים יצרו ושיתפו — חינם להתקנה.",
};

export const dynamic = "force-dynamic";

const PERSONA_LABEL: Record<string, string> = {
  founder: "מייסד/מנכ״ל",
  ops_manager: "תפעול",
  developer: "פיתוח",
  pm: "מוצר",
  creator: "יוצר תוכן",
  educator: "חינוך",
  researcher: "מחקר",
  consultant: "ייעוץ",
};

export default async function TemplatesPage() {
  const supabase = createServiceClient();
  const { data: templates } = await supabase
    .from("templates")
    .select("slug, name, description, tags, persona, install_count, created_at")
    .eq("published", true)
    .eq("admin_blocked", false)
    .order("install_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(60);

  const list = templates ?? [];

  return (
    <div dir="rtl" className="min-h-screen px-4 py-12 md:py-16">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <div className="text-[11px] tracking-widest text-[var(--indigo-text)] font-mono mb-2">
            MARKETPLACE →
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">מרקטפלייס הסוכנים</h1>
          <p className="text-[var(--fg-dim)] text-sm leading-relaxed">
            סוכנים שמשתמשים בנו ושיתפו. כל אחד חינם להתקנה — פקודה אחת לטרמינל.
          </p>
        </div>

        {list.length === 0 ? (
          <div className="text-center py-16 text-[var(--fg-muted)] text-sm">
            עוד אין סוכנים מפורסמים. רוצה להיות הראשון?{" "}
            <Link href="/dashboard" className="text-[var(--indigo-text)] hover:underline">
              בנה סוכן ופרסם אותו
            </Link>
            .
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {list.map((t) => (
              <Link
                key={t.slug}
                href={`/templates/${t.slug}`}
                className="block rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 hover:bg-white/[0.04] hover:border-white/[0.1] transition-colors no-underline"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h2 className="text-[15px] font-semibold text-white leading-snug">{t.name}</h2>
                  {t.persona && PERSONA_LABEL[t.persona] && (
                    <span className="shrink-0 text-[10px] font-mono uppercase tracking-wide bg-[rgba(94,106,210,0.12)] text-[var(--indigo-text)] border border-[rgba(94,106,210,0.25)] rounded px-2 py-0.5">
                      {PERSONA_LABEL[t.persona]}
                    </span>
                  )}
                </div>
                {t.description && (
                  <p className="text-[13px] text-[var(--fg-dim)] leading-relaxed line-clamp-3">
                    {t.description}
                  </p>
                )}
                {Array.isArray(t.tags) && t.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {t.tags.slice(0, 4).map((tag: string) => (
                      <span
                        key={tag}
                        className="text-[10px] text-white/50 bg-white/[0.04] border border-white/[0.06] rounded px-2 py-0.5"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {t.install_count > 0 && (
                  <div className="text-[11px] text-[var(--fg-muted)] mt-3 font-mono">
                    {t.install_count} התקנות
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <Link href="/" className="text-sm text-[var(--indigo-text)] hover:underline">
            ← חזרה לדף הבית
          </Link>
        </div>
      </div>
    </div>
  );
}
