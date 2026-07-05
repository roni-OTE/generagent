import Link from "next/link";
import { notFound } from "next/navigation";
import { readPost } from "@/lib/blog";
import { markdownToBasicHtml } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = readPost(slug);
  if (!post) return { title: "בלוג · GenerAgent" };
  return {
    title: `${post.title} · GenerAgent`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = readPost(slug);
  if (!post) notFound();

  return (
    <div dir="rtl" className="min-h-screen px-4 py-12 md:py-16">
      <article className="max-w-2xl mx-auto">
        <Link href="/blog" className="text-sm text-[var(--indigo-text)] hover:underline">
          → כל הפוסטים
        </Link>
        <div className="text-[11px] text-[var(--fg-muted)] font-mono mt-6 mb-2" dir="ltr">
          {post.date}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-8 leading-tight">
          {post.title}
        </h1>
        <div
          className="blog-body text-[15px] leading-relaxed text-white/85 space-y-4"
          dangerouslySetInnerHTML={{ __html: markdownToBasicHtml(post.body) }}
        />
        <div className="mt-12 rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.06] p-6 text-center">
          <div className="text-white font-semibold mb-2">רוצה סוכן AI משלך?</div>
          <p className="text-sm text-[var(--fg-dim)] mb-4">
            5 דקות שיחה עם נועם — וסוכן מותאם אישית מוכן להתקנה.
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-3 rounded-xl text-sm font-medium text-white no-underline"
            style={{ background: "linear-gradient(135deg, #5E6AD2, #B867FF)" }}
          >
            מתחילים ←
          </Link>
        </div>
      </article>
    </div>
  );
}
