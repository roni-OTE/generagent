import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeEntitlement } from "@/lib/entitlement";
import Button from "@/components/Button";
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

  // Has user accepted current TOS?
  const { data: legal } = await supabase
    .from("legal_acceptances")
    .select("id")
    .eq("user_id", user.id)
    .eq("document", "terms")
    .eq("version", "v1.0")
    .maybeSingle();
  if (!legal) redirect("/legal/accept");

  const ent = computeEntitlement(profile);

  const { data: packages } = await supabase
    .from("packages")
    .select("id, name, description, version, archetype, is_template_clone, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const isAdmin = profile.plan === "admin";

  return (
    <>
      <nav className="backdrop-blur-[20px] bg-[rgba(2,2,3,0.6)] border-b border-[var(--border)] py-3.5">
        <div className="max-w-[1180px] mx-auto px-6 flex items-center justify-between gap-4">
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
            </Link>
            <div className="flex gap-1">
              <Link href="/dashboard" className="px-3 py-1.5 rounded-lg text-[13px] text-[var(--indigo-bright)] bg-[rgba(94,106,210,0.1)]">החבילות שלי</Link>
              <Link href="/templates" className="px-3 py-1.5 rounded-lg text-[13px] text-[var(--fg-dim)] hover:text-[var(--fg)] hover:bg-[var(--surface)]">טמפלייטים</Link>
              {isAdmin && (
                <Link href="/admin" className="px-3 py-1.5 rounded-lg text-[13px] text-[var(--magenta)] hover:bg-[rgba(192,132,252,0.1)]">★ admin</Link>
              )}
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <form action={signOut}>
              <button type="submit" className="text-[12px] text-[var(--fg-dim)] hover:text-[var(--fg)]">התנתק</button>
            </form>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-[13px] border border-[rgba(255,255,255,0.12)]"
              style={{ background: "linear-gradient(135deg, var(--indigo), var(--magenta))" }}
              title={user.email ?? ""}
            >
              {profile.display_name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase()}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-[1180px] mx-auto px-6 py-10 flex-1">
        {/* Page head */}
        <div className="flex justify-between items-end mb-8 gap-4 flex-wrap">
          <div>
            <div className="font-mono text-[11px] text-[var(--indigo-text)] uppercase tracking-[0.12em] mb-2">
              → packages · {packages?.length ?? 0} active
            </div>
            <h1 className="text-[32px] font-bold tracking-[-0.025em] leading-[1.1] bg-gradient-to-b from-white to-[#B0B5C0] bg-clip-text text-transparent">
              שלום {profile.display_name?.split(" ")[0] ?? "וברוך הבא"}
            </h1>
          </div>
          <Link href="/consult">
            <Button variant="primary" size="md" disabled={!ent.canCreateCustomAgent}>
              שיחה חדשה <span>←</span>
            </Button>
          </Link>
        </div>

        {/* Trial status banner */}
        {ent.plan === "trial" && (
          <div className="mb-6 bg-[var(--bg-elev)] border border-[var(--border)] rounded-[14px] p-4 flex justify-between items-center gap-4 flex-wrap">
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

        {/* Empty state OR packages grid */}
        {(!packages || packages.length === 0) ? (
          <div className="text-center py-16 max-w-[460px] mx-auto">
            <div className="w-[96px] h-[96px] mx-auto mb-6 relative">
              <Orb size="hero" cursorFollow={false} />
              <style>{`.orb-hero { width: 96px !important; height: 96px !important; }`}</style>
            </div>
            <h2 className="text-[22px] font-bold mb-3 bg-gradient-to-b from-white to-[#B0B5C0] bg-clip-text text-transparent">
              בוא נכיר את העבודה שלך
            </h2>
            <p className="text-[var(--fg-dim)] text-[14px] mb-6">
              אין לך עדיין חבילות. הראיון הראשון לוקח 5 דקות, ומסיים בחבילה אישית מוכנה להתקנה.
            </p>
            <Link href="/consult">
              <Button variant="primary" size="lg" disabled={!ent.canCreateCustomAgent}>
                התחל את הראיון <span>←</span>
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <Link key={pkg.id} href={`/p/${pkg.id}`} className="group">
                <div className="bg-[var(--bg-elev)] border border-[var(--border)] rounded-[16px] p-5 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[rgba(94,106,210,0.3)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.4)]">
                  <div className="font-mono text-[10px] text-[var(--indigo-text)] uppercase tracking-[0.1em] mb-2">
                    {pkg.archetype ?? "package"} · v{pkg.version}
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
        )}
      </main>
    </>
  );
}

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
