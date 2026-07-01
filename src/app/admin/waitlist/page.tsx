import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WaitlistRow from "./WaitlistRow";

export const metadata = { title: "רשימת המתנה · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminWaitlistPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  if (me?.plan !== "admin") redirect("/dashboard");

  const { data: waitlist } = await supabase
    .from("waitlist")
    .select("id, email, name, note, source_hint, status, approved_at, invite_code_id, created_at")
    .order("created_at", { ascending: false });

  const { data: codes } = await supabase
    .from("invite_codes")
    .select("code, source, used_at");

  const codesBySource: Record<string, { total: number; used: number }> = {};
  (codes ?? []).forEach((c) => {
    if (!codesBySource[c.source]) codesBySource[c.source] = { total: 0, used: 0 };
    codesBySource[c.source].total++;
    if (c.used_at) codesBySource[c.source].used++;
  });

  const pending = (waitlist ?? []).filter((w) => w.status === "pending");
  const approved = (waitlist ?? []).filter((w) => w.status === "approved");
  const rejected = (waitlist ?? []).filter((w) => w.status === "rejected");

  return (
    <>
      <nav className="backdrop-blur-[20px] bg-[rgba(2,2,3,0.6)] border-b border-[var(--border)] py-3.5">
        <div className="max-w-[1100px] mx-auto px-6 flex items-center gap-4">
          <Link href="/admin" className="text-[var(--fg-dim)] hover:text-[var(--fg)] font-mono text-[12px]">← admin</Link>
          <span className="text-[var(--fg-muted)]">/</span>
          <span className="font-mono text-[12px] text-[var(--fg)]">waitlist</span>
        </div>
      </nav>

      <main className="max-w-[1100px] mx-auto px-6 py-10 flex-1" dir="rtl">
        <div className="mb-6">
          <div className="font-mono text-[11px] text-[var(--indigo-text)] uppercase tracking-[0.12em] mb-2">
            invite-only launch
          </div>
          <h1 className="text-[28px] font-bold tracking-[-0.02em] mb-2">רשימת המתנה + קודי הזמנה</h1>
          <p className="text-[var(--fg-dim)] text-[14px] leading-relaxed">
            רשימת ההמתנה הכללית + מעקב אחרי 40 הקודים ה-pre-generated (20 מחדשין + 20 LinkedIn).
            אישור בקשה = מיילת קישור הזמנה אישי חדש.
          </p>
        </div>

        {/* Codes overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {["mechadshin", "linkedin", "waitlist_approval"].map((src) => {
            const s = codesBySource[src] ?? { total: 0, used: 0 };
            const label = src === "mechadshin" ? "מחדשין" : src === "linkedin" ? "LinkedIn" : "אושרו מרשימת המתנה";
            return (
              <div key={src} className="bg-[var(--bg-elev)] border border-[var(--border)] rounded-[14px] p-4">
                <div className="text-[11px] text-[var(--fg-muted)] font-mono uppercase tracking-[0.1em] mb-2">{label}</div>
                <div className="text-[24px] font-bold text-white">
                  {s.used} <span className="text-[var(--fg-muted)] font-normal">/ {s.total}</span>
                </div>
                <div className="text-[11px] text-[var(--fg-dim)] mt-1">{s.total - s.used} פנויים</div>
                {src !== "waitlist_approval" && (
                  <Link
                    href={`/admin/waitlist/codes?source=${src}`}
                    className="mt-2 inline-block text-[11px] text-[var(--indigo-text)] hover:text-[var(--indigo-bright)]"
                  >
                    ראה קודים →
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        {/* Pending */}
        <section className="mb-8">
          <h2 className="text-[16px] font-bold text-white mb-3">
            ממתינים לאישור <span className="text-[var(--fg-muted)] font-normal">({pending.length})</span>
          </h2>
          {pending.length === 0 ? (
            <div className="bg-[var(--bg-elev)] border border-[var(--border)] rounded-[14px] p-6 text-center text-[var(--fg-dim)] text-[13px]">
              אף אחד לא ממתין כרגע.
            </div>
          ) : (
            <div className="space-y-2">
              {pending.map((w) => (
                <WaitlistRow key={w.id} entry={w} />
              ))}
            </div>
          )}
        </section>

        {/* Approved */}
        {approved.length > 0 && (
          <section className="mb-8">
            <h2 className="text-[15px] font-semibold text-[var(--fg-dim)] mb-3">
              אושרו <span className="text-[var(--fg-muted)] font-normal">({approved.length})</span>
            </h2>
            <div className="space-y-1">
              {approved.map((w) => (
                <div key={w.id} className="bg-[var(--bg-elev)] border border-[var(--border)] rounded-[10px] p-3 flex items-center justify-between">
                  <div className="text-[13px]">
                    <div className="text-white font-medium">{w.name || w.email}</div>
                    <div className="text-[11px] text-[var(--fg-muted)] font-mono" dir="ltr">{w.email}</div>
                  </div>
                  <div className="text-[11px] font-mono text-[var(--success)]">✓ approved</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {rejected.length > 0 && (
          <section>
            <h2 className="text-[15px] font-semibold text-[var(--fg-muted)] mb-3">
              נדחו <span className="text-[var(--fg-muted)] font-normal">({rejected.length})</span>
            </h2>
            <div className="space-y-1 opacity-60">
              {rejected.map((w) => (
                <div key={w.id} className="bg-[var(--bg-elev)] border border-[var(--border)] rounded-[10px] p-3">
                  <div className="text-[12px] text-[var(--fg-dim)]">{w.name || w.email}</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
