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
    .select("code, source, max_uses, use_count, disabled_at");

  // For campaign codes (mechadshin/linkedin): pull the single row per source.
  const campaignCodes: Record<string, { code: string; max: number; used: number }> = {};
  let waitlistApprovedTotal = 0;
  let waitlistApprovedUsed = 0;
  (codes ?? []).forEach((c) => {
    if (c.source === "mechadshin" || c.source === "linkedin") {
      campaignCodes[c.source] = {
        code: c.code,
        max: c.max_uses,
        used: c.use_count,
      };
    } else if (c.source === "waitlist_approval") {
      waitlistApprovedTotal++;
      if (c.use_count > 0) waitlistApprovedUsed++;
    }
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

        {/* Campaign codes with counter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {(["mechadshin", "linkedin"] as const).map((src) => {
            const s = campaignCodes[src];
            const label = src === "mechadshin" ? "מחדשין" : "LinkedIn";
            if (!s) {
              return (
                <div key={src} className="bg-[var(--bg-elev)] border border-[var(--border)] rounded-[14px] p-4 opacity-60">
                  <div className="text-[13px] text-[var(--fg-muted)]">{label} — לא הוגדר עדיין</div>
                </div>
              );
            }
            const pct = s.max > 0 ? Math.min(100, Math.round((s.used / s.max) * 100)) : 0;
            const remaining = Math.max(0, s.max - s.used);
            const inviteUrl = `https://www.generagent.io/login?invite=${s.code}`;
            return (
              <div key={src} className="bg-[var(--bg-elev)] border border-[var(--border)] rounded-[14px] p-5">
                <div className="flex items-baseline justify-between mb-2">
                  <div className="text-[13px] text-[var(--fg-muted)] font-mono uppercase tracking-[0.1em]">{label}</div>
                  <div className="text-[11px] text-[var(--fg-dim)] font-mono">{remaining} פנויים</div>
                </div>
                <div className="text-[28px] font-bold text-white mb-3">
                  {s.used} <span className="text-[var(--fg-muted)] font-normal text-[18px]">/ {s.max}</span>
                </div>
                <div className="h-1.5 bg-[var(--surface)] rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: pct >= 90 ? "linear-gradient(90deg, #F87171, #EF4444)" :
                                  pct >= 70 ? "linear-gradient(90deg, #FBBF24, #F59E0B)" :
                                              "linear-gradient(90deg, #5E6AD2, #B867FF)",
                    }}
                  />
                </div>
                <div className="text-[10px] text-[var(--fg-muted)] font-mono mb-1.5 uppercase tracking-[0.08em]">קישור להעתקה</div>
                <div className="bg-[var(--bg-deep)] border border-[var(--border)] rounded-[8px] px-3 py-2 font-mono text-[11px] text-[var(--fg)] break-all" dir="ltr">
                  {inviteUrl}
                </div>
              </div>
            );
          })}
        </div>

        {/* Waitlist-approval codes summary */}
        <div className="bg-[var(--bg-elev)] border border-[var(--border)] rounded-[14px] p-4 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] text-[var(--fg-dim)] mb-1">אושרו מרשימת המתנה</div>
              <div className="text-[11px] text-[var(--fg-muted)]">קודים אישיים (max_uses=1) שנוצרו על ידך</div>
            </div>
            <div className="text-[20px] font-bold text-white">
              {waitlistApprovedUsed} <span className="text-[var(--fg-muted)] font-normal text-[14px]">/ {waitlistApprovedTotal}</span>
            </div>
          </div>
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
