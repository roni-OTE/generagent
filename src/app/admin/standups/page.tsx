import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Standups · Admin" };
export const dynamic = "force-dynamic";

export default async function StandupsListPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  if (me?.plan !== "admin") redirect("/dashboard");

  const { data: standups } = await supabase
    .from("team_standups")
    .select("id, standup_date, highlights, decisions_needed, email_sent")
    .order("standup_date", { ascending: false })
    .limit(30);

  return (
    <>
      <nav className="backdrop-blur-[20px] bg-[rgba(2,2,3,0.6)] border-b border-[var(--border)] py-3.5">
        <div className="max-w-[900px] mx-auto px-6 flex items-center gap-4">
          <Link href="/admin" className="text-[var(--fg-dim)] hover:text-[var(--fg)] font-mono text-[12px]">← admin</Link>
          <span className="text-[var(--fg-muted)]">/</span>
          <span className="font-mono text-[12px] text-[var(--fg)]">standups</span>
        </div>
      </nav>

      <main className="max-w-[900px] mx-auto px-6 py-10 flex-1">
        <div className="mb-7">
          <div className="font-mono text-[11px] text-[var(--indigo-text)] uppercase tracking-[0.12em] mb-2">
            team standups
          </div>
          <h1 className="text-[28px] font-bold tracking-[-0.02em]">Standups יומיים</h1>
          <p className="text-[var(--fg-dim)] text-[14px] mt-2">digest נתונים יומי (06:00). נשמר ב-DB ונשלח במייל.</p>
        </div>

        {(!standups || standups.length === 0) ? (
          <div className="text-center py-14 bg-[var(--bg-elev)] border border-[var(--border)] rounded-[16px]">
            <div className="text-[14px] text-[var(--fg-dim)]">עדיין אין standups. הסטנדאפ הראשון ירוץ אוטומטית ב-06:00.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {standups.map((s) => (
              <Link
                key={s.id}
                href={`/admin/standups/${s.id}`}
                className="block bg-[var(--bg-elev)] border border-[var(--border)] rounded-[14px] p-5 hover:border-[rgba(94,106,210,0.3)] transition-colors no-underline"
              >
                <div className="flex justify-between items-start gap-4 mb-2">
                  <div className="text-[14px] font-semibold text-white">
                    {new Date(s.standup_date).toLocaleString("he-IL", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    {s.email_sent ? (
                      <span className="text-[var(--success)]">✉ נשלח</span>
                    ) : (
                      <span className="text-[var(--fg-muted)]">⏳ לא נשלח</span>
                    )}
                  </div>
                </div>
                {Array.isArray(s.highlights) && s.highlights.length > 0 && (
                  <div className="text-[13px] text-[var(--fg-dim)] line-clamp-2">
                    {s.highlights.slice(0, 2).join(" · ")}
                  </div>
                )}
                {Array.isArray(s.decisions_needed) && s.decisions_needed.length > 0 && (
                  <div className="mt-2 text-[11px] text-amber-300/80 font-mono">
                    ⚠ {s.decisions_needed.length} החלטות בהמתנה
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
