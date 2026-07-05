import Link from "next/link";
import { listPosts } from "@/lib/blog";

export const metadata = {
  title: "בלוג · GenerAgent",
  description: "מדריכים, סיפורי משתמשים ורעיונות על סוכני AI לעסקים בישראל.",
};

// Reads from the filesystem at request time — new posts appear after deploy.
export const dynamic = "force-dynamic";

export default function BlogIndexPage() {
  const posts = listPosts();
  return (
    <div dir="rtl" className="min-h-screen px-4 py-12 md:py-16">
      <div className="max-w-2xl mx-auto">
        <div className="mb-10">
          <div className="text-[11px] tracking-widest text-[var(--indigo-text)] font-mono mb-2">
            BLOG →
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">הבלוג של GenerAgent</h1>
          <p className="text-[var(--fg-dim)] text-sm leading-relaxed">
            רעיונות, מדריכים וסיפורים על סוכני AI לעסקים — בעברית, בלי buzzwords.
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-16 text-[var(--fg-muted)] text-sm">
            הפוסט הראשון בדרך. שווה לחזור בקרוב.
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="block rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:bg-white/[0.04] hover:border-white/[0.1] transition-colors no-underline"
              >
                <div className="text-[11px] text-[var(--fg-muted)] font-mono mb-2" dir="ltr">
                  {p.date}
                </div>
                <h2 className="text-lg font-semibold text-white mb-2">{p.title}</h2>
                <p className="text-sm text-[var(--fg-dim)] leading-relaxed">{p.excerpt}</p>
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
