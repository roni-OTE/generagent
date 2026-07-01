import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "קודי הזמנה · Admin" };
export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ source?: string }> };

export default async function CodesPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  if (me?.plan !== "admin") redirect("/dashboard");

  const params = await searchParams;
  const source = params.source ?? "mechadshin";

  const { data: codes } = await supabase
    .from("invite_codes")
    .select("code, source, used_at, used_by_user_id")
    .eq("source", source)
    .order("used_at", { ascending: false, nullsFirst: true })
    .order("code", { ascending: true });

  const label = source === "mechadshin" ? "מחדשין" : source === "linkedin" ? "LinkedIn" : source;

  return (
    <>
      <nav className="backdrop-blur-[20px] bg-[rgba(2,2,3,0.6)] border-b border-[var(--border)] py-3.5">
        <div className="max-w-[900px] mx-auto px-6 flex items-center gap-4">
          <Link href="/admin/waitlist" className="text-[var(--fg-dim)] hover:text-[var(--fg)] font-mono text-[12px]">← waitlist</Link>
          <span className="text-[var(--fg-muted)]">/</span>
          <span className="font-mono text-[12px] text-[var(--fg)]">codes · {source}</span>
        </div>
      </nav>

      <main className="max-w-[900px] mx-auto px-6 py-10 flex-1" dir="rtl">
        <div className="mb-6">
          <h1 className="text-[24px] font-bold mb-1">קודי הזמנה — {label}</h1>
          <p className="text-[var(--fg-dim)] text-[13px]">
            הקודים הפנויים בירוק — העתק כל קוד לקישור <code className="font-mono text-[12px] text-[var(--indigo-text)]">generagent.io/login?invite=CODE</code>.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(codes ?? []).map((c) => {
            const used = !!c.used_at;
            return (
              <div
                key={c.code}
                className={`p-3 rounded-[10px] border font-mono text-[13px] text-center ${
                  used
                    ? "bg-[var(--surface)] border-[var(--border)] text-[var(--fg-muted)] line-through"
                    : "bg-[rgba(74,222,128,0.06)] border-[rgba(74,222,128,0.3)] text-[var(--success)]"
                }`}
              >
                {c.code}
              </div>
            );
          })}
        </div>

        {(codes ?? []).length === 0 && (
          <div className="text-center py-12 text-[var(--fg-dim)]">אין קודים מהמקור הזה.</div>
        )}
      </main>
    </>
  );
}
