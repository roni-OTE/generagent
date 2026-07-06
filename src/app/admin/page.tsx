import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin · GenerAgent" };

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();
  if (profile?.plan !== "admin") redirect("/dashboard");

  // Load all users
  const { data: users } = await supabase
    .from("profiles")
    .select("id, email, display_name, plan, trial_started_at, custom_agents_count, created_at")
    .order("created_at", { ascending: false });

  // Counts
  const { count: consultationsCount } = await supabase
    .from("consultations").select("*", { count: "exact", head: true });
  const { count: packagesCount } = await supabase
    .from("packages").select("*", { count: "exact", head: true });

  return (
    <>
      <nav className="backdrop-blur-[20px] bg-[rgba(2,2,3,0.6)] border-b border-[var(--border)] py-3.5">
        <div className="max-w-[1380px] mx-auto px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 text-[var(--fg)] no-underline">
              <span
                style={{
                  width: 26, height: 26, borderRadius: 7,
                  background: "linear-gradient(135deg, var(--indigo), var(--magenta))",
                  boxShadow: "0 0 14px rgba(94,106,210,0.4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontWeight: 800, fontSize: 13,
                }}
              >G</span>
              <span className="font-bold text-[15px]">GenerAgent</span>
              <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-[0.1em] bg-[rgba(192,132,252,0.15)] text-[var(--magenta)] border border-[rgba(192,132,252,0.3)]">★ admin</span>
            </Link>
            <div className="flex gap-1">
              <Link href="/dashboard" className="px-3 py-1.5 rounded-lg text-[13px] text-[var(--fg-dim)] hover:text-[var(--fg)] hover:bg-[var(--surface)]">← dashboard</Link>
              <Link href="/admin" className="px-3 py-1.5 rounded-lg text-[13px] text-[var(--indigo-bright)] bg-[rgba(94,106,210,0.1)]">משתמשים</Link>
              <Link href="/team" className="px-3 py-1.5 rounded-lg text-[13px] text-[var(--fg-dim)] hover:text-[var(--fg)] hover:bg-[var(--surface)]">צוות</Link>
              <Link href="/admin/standups" className="px-3 py-1.5 rounded-lg text-[13px] text-[var(--fg-dim)] hover:text-[var(--fg)] hover:bg-[var(--surface)]">standups</Link>
              <Link href="/admin/team" className="px-3 py-1.5 rounded-lg text-[13px] text-[var(--fg-dim)] hover:text-[var(--fg)] hover:bg-[var(--surface)]">סקירת צוות</Link>
              <Link href="/admin/inter-agent" className="px-3 py-1.5 rounded-lg text-[13px] text-[var(--fg-dim)] hover:text-[var(--fg)] hover:bg-[var(--surface)]">תקשורת פנימית</Link>
              <Link href="/admin/waitlist" className="px-3 py-1.5 rounded-lg text-[13px] text-[var(--fg-dim)] hover:text-[var(--fg)] hover:bg-[var(--surface)]">waitlist</Link>
              <Link href="/admin/templates" className="px-3 py-1.5 rounded-lg text-[13px] text-[var(--fg-dim)] hover:text-[var(--fg)] hover:bg-[var(--surface)]">מרקטפלייס</Link>
              <Link href="/admin/support" className="px-3 py-1.5 rounded-lg text-[13px] text-[var(--fg-dim)] hover:text-[var(--fg)] hover:bg-[var(--surface)]">support</Link>
              <Link href="/admin/marketing" className="px-3 py-1.5 rounded-lg text-[13px] text-[var(--fg-dim)] hover:text-[var(--fg)] hover:bg-[var(--surface)]">marketing</Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-[1380px] mx-auto px-6 py-10 flex-1">
        <div className="mb-8">
          <div className="font-mono text-[11px] text-[var(--magenta)] uppercase tracking-[0.12em] mb-2">
            → admin console · {users?.length ?? 0} users · {consultationsCount ?? 0} consultations · {packagesCount ?? 0} packages
          </div>
          <h1 className="text-[32px] font-bold tracking-[-0.025em] bg-gradient-to-b from-white to-[#B0B5C0] bg-clip-text text-transparent">
            ניהול משתמשים
          </h1>
        </div>

        {/* Quick links to admin sections */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <Link href="/team" className="block bg-gradient-to-br from-indigo-500/[0.08] to-fuchsia-500/[0.05] border border-indigo-400/25 rounded-[14px] p-5 hover:border-indigo-400/50 transition-colors no-underline">
            <div className="text-[24px] mb-1">💬</div>
            <div className="text-[14px] font-semibold text-white mb-1">דבר עם הצוות</div>
            <div className="text-[12px] text-[var(--fg-dim)]">צ׳אט עם תמר, יואב, רוני, דנה, שירה, אריאל</div>
          </Link>
          <Link href="/admin/standups" className="block bg-gradient-to-br from-indigo-500/[0.08] to-fuchsia-500/[0.05] border border-indigo-400/25 rounded-[14px] p-5 hover:border-indigo-400/50 transition-colors no-underline">
            <div className="text-[24px] mb-1">📋</div>
            <div className="text-[14px] font-semibold text-white mb-1">Standups</div>
            <div className="text-[12px] text-[var(--fg-dim)]">סיכומי הצוות + מענה על החלטות</div>
          </Link>
          <Link href="/admin/team" className="block bg-gradient-to-br from-indigo-500/[0.08] to-fuchsia-500/[0.05] border border-indigo-400/25 rounded-[14px] p-5 hover:border-indigo-400/50 transition-colors no-underline">
            <div className="text-[24px] mb-1">👥</div>
            <div className="text-[14px] font-semibold text-white mb-1">סקירת הצוות</div>
            <div className="text-[12px] text-[var(--fg-dim)]">6 הסוכנים, תפקידים, פקודת התקנה</div>
          </Link>
          <Link href="/admin/inter-agent" className="block bg-gradient-to-br from-indigo-500/[0.08] to-fuchsia-500/[0.05] border border-indigo-400/25 rounded-[14px] p-5 hover:border-indigo-400/50 transition-colors no-underline">
            <div className="text-[24px] mb-1">🔗</div>
            <div className="text-[14px] font-semibold text-white mb-1">תקשורת פנימית</div>
            <div className="text-[12px] text-[var(--fg-dim)]">מי שאל את מי בצוות, audit log</div>
          </Link>
        </div>

        <div className="bg-[var(--bg-elev)] border border-[var(--border)] rounded-[16px] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-[var(--bg-elev-2)] text-[var(--fg-muted)] font-mono text-[10px] uppercase tracking-[0.1em]">
              <tr>
                <th className="text-right p-4">משתמש</th>
                <th className="text-right p-4">תכנית</th>
                <th className="text-right p-4">trial</th>
                <th className="text-right p-4">agents</th>
                <th className="text-right p-4">created</th>
                <th className="text-right p-4"></th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => {
                const trialAge = (Date.now() - new Date(u.trial_started_at).getTime()) / (1000 * 60 * 60 * 24);
                const daysLeft = Math.max(0, Math.ceil(14 - trialAge));
                return (
                  <tr key={u.id} className="border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors">
                    <td className="p-4">
                      <div className="text-[var(--fg)] font-medium">{u.display_name ?? "—"}</div>
                      <div className="text-[var(--fg-muted)] text-[12px] font-mono" dir="ltr">{u.email}</div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-[0.08em] border ${
                        u.plan === "admin" ? "bg-[rgba(192,132,252,0.12)] text-[var(--magenta)] border-[rgba(192,132,252,0.3)]" :
                        u.plan === "pro" ? "bg-[rgba(74,222,128,0.12)] text-[var(--success)] border-[rgba(74,222,128,0.3)]" :
                        u.plan === "expired" ? "bg-[rgba(248,113,113,0.12)] text-[var(--danger)] border-[rgba(248,113,113,0.3)]" :
                        "bg-[rgba(129,140,248,0.12)] text-[var(--indigo-text)] border-[rgba(129,140,248,0.3)]"
                      }`}>
                        {u.plan}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-[var(--fg-dim)]" dir="ltr">{daysLeft}d left</td>
                    <td className="p-4 font-mono text-[var(--fg-dim)]" dir="ltr">{u.custom_agents_count}/2</td>
                    <td className="p-4 font-mono text-[var(--fg-muted)] text-[11px]" dir="ltr">{new Date(u.created_at).toLocaleDateString("en-GB")}</td>
                    <td className="p-4 text-left">
                      <Link href={`/admin/users/${u.id}`} className="text-[12px] text-[var(--indigo-text)] hover:text-[var(--indigo-bright)]">
                        פרטים →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {(!users || users.length === 0) && (
            <div className="text-center py-12 text-[var(--fg-dim)]">אין עדיין משתמשים. תקבל מייל כשהראשון יירשם.</div>
          )}
        </div>
      </main>
    </>
  );
}
