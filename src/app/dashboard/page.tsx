import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeEntitlement } from "@/lib/entitlement";
import WorkspaceShell from "@/components/WorkspaceShell";
import Orb from "@/components/Orb";

export const metadata = { title: "Dashboard · GenerAgent" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return <div className="p-10">Profile not found. Please sign out and back in.</div>;
  }

  const { data: legalRows } = await supabase
    .from("legal_acceptances")
    .select("id")
    .eq("user_id", user.id)
    .eq("document", "terms")
    .eq("version", "v1.0")
    .limit(1);
  if (!legalRows || legalRows.length === 0) redirect("/legal/accept");

  const ent = computeEntitlement(profile);

  const { data: packages } = await supabase
    .from("packages")
    .select("id, name, description, version, archetype, is_template_clone, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  const isAdmin = profile.plan === "admin";

  return (
    <WorkspaceShell
      userEmail={user.email ?? ""}
      displayName={profile.display_name}
      isAdmin={isAdmin}
    >
      <div className="max-w-[1100px] mx-auto w-full px-8 py-12 flex-1">
        {/* Trial banner */}
        {ent.plan === "trial" && (
          <div className="mb-8 bg-[var(--bg-elev)] border border-[var(--border)] rounded-[14px] p-4 flex justify-between items-center gap-4 flex-wrap">
            <div className="flex gap-4 items-center text-[13px] flex-wrap">
              <span className="font-mono text-[10px] text-[var(--indigo-text)] uppercase tracking-[0.1em]">trial active</span>
              <span className="text-[var(--fg-dim)]">
                <span className="text-[var(--fg)] font-semibold">{ent.daysLeft}</span> ימים נשארו
              </span>
              <span className="text-[var(--fg-dim)]">
                <span className="text-[var(--fg)] font-semibold">{ent.agentsLeft}/2</span> סוכנים אישיים
              </span>
              <span className="font-mono text-[10px] text-[var(--success)] uppercase tracking-[0.1em]">templates · unlimited</span>
            </div>
            {!ent.canCreateCustomAgent && (
              <Link href="/upgrade" className="text-[12px] text-[var(--indigo-bright)] hover:underline">שדרג ל-Pro →</Link>
            )}
          </div>
        )}

        {/* CENTER: agents grid OR empty state */}
        {(!packages || packages.length === 0) ? (
          <div className="text-center py-20 max-w-[460px] mx-auto">
            <div className="w-[96px] h-[96px] mx-auto mb-7 relative">
              <Orb size="hero" cursorFollow={false} />
              <style>{`.orb-hero { width: 96px !important; height: 96px !important; }`}</style>
            </div>
            <div className="font-mono text-[11px] text-[var(--indigo-text)] uppercase tracking-[0.12em] mb-3">
              ready when you are
            </div>
            <h1 className="text-[28px] font-bold mb-3 bg-gradient-to-b from-white to-[#B0B5C0] bg-clip-text text-transparent leading-tight">
              עדיין אין לך סוכנים
            </h1>
            <p className="text-[var(--fg-dim)] text-[14px] mb-7 leading-relaxed">
              שיחה של ~5 דקות עם ארי, ויש לך סוכן AI מותאם אישית — מוכן להתקנה ב-Claude Code או Codex CLI.
            </p>
            <Link
              href="#"
              onClick={(e) => e.preventDefault()}
              className="inline-block px-6 py-3 rounded-xl text-[14px] font-semibold text-white hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #5E6AD2, #B867FF)", boxShadow: "0 6px 24px rgba(94,106,210,0.3)" }}
            >
              לחץ "+ שיחה חדשה" בצד ←
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-7">
              <div className="font-mono text-[11px] text-[var(--indigo-text)] uppercase tracking-[0.12em] mb-2">
                → agents · {packages.length}
              </div>
              <h1 className="text-[28px] font-bold tracking-[-0.02em] leading-[1.1] bg-gradient-to-b from-white to-[#B0B5C0] bg-clip-text text-transparent">
                הסוכנים שלך
              </h1>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg) => (
                <Link key={pkg.id} href={`/p/${pkg.id}`} className="group">
                  <div className="bg-[var(--bg-elev)] border border-[var(--border)] rounded-[16px] p-5 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[rgba(94,106,210,0.3)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.4)] h-full">
                    <div className="font-mono text-[10px] text-[var(--indigo-text)] uppercase tracking-[0.1em] mb-2">
                      {pkg.archetype ?? "agent"} · v{pkg.version}
                    </div>
                    <h3 className="text-[16px] font-bold mb-2">{pkg.name}</h3>
                    <p className="text-[13px] text-[var(--fg-dim)] mb-4 line-clamp-2">{pkg.description}</p>
                    <div className="font-mono text-[11px] text-[var(--fg-muted)] flex justify-between border-t border-[var(--border)] pt-3">
                      <span>{new Date(pkg.created_at).toLocaleDateString("he-IL")}</span>
                      {pkg.is_template_clone && <span className="text-[var(--success)]">★ template</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </WorkspaceShell>
  );
}
