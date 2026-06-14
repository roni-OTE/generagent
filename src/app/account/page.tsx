import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { computeEntitlement } from "@/lib/entitlement";
import WorkspaceShell from "@/components/WorkspaceShell";
import EditableDisplayName from "@/components/EditableDisplayName";

export const metadata = { title: "החשבון שלי · GenerAgent" };
export const dynamic = "force-dynamic";

const PLAN_LABEL: Record<string, string> = {
  trial: "ניסיון חינם",
  pro: "Pro",
  admin: "Admin",
  expired: "פג תוקף",
};

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  const ent = computeEntitlement(profile);
  const isAdmin = profile.plan === "admin";

  const { data: packagesCount } = await supabase
    .from("packages")
    .select("id", { count: "exact" })
    .eq("user_id", user.id)
    .eq("is_template_clone", false);

  const { data: consultsCount } = await supabase
    .from("consultations")
    .select("id", { count: "exact" })
    .eq("user_id", user.id);

  return (
    <WorkspaceShell
      userEmail={user.email ?? ""}
      displayName={profile.display_name}
      isAdmin={isAdmin}
    >
      <div className="max-w-[820px] mx-auto w-full px-4 sm:px-6 md:px-8 py-6 md:py-12 flex-1">
        <div className="mb-7">
          <div className="font-mono text-[11px] text-[var(--indigo-text)] uppercase tracking-[0.12em] mb-2">
            → account
          </div>
          <h1 className="text-[28px] font-bold tracking-[-0.02em] leading-[1.1] bg-gradient-to-b from-white to-[#B0B5C0] bg-clip-text text-transparent">
            החשבון שלי
          </h1>
        </div>

        {/* Profile card */}
        <div className="bg-[var(--bg-elev)] border border-[var(--border)] rounded-[16px] p-6 mb-5">
          <div className="flex items-center gap-4 mb-5">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-[20px]"
              style={{ background: "linear-gradient(135deg, var(--indigo), var(--magenta))" }}
            >
              {(profile.display_name?.[0] || user.email?.[0] || "?").toUpperCase()}
            </div>
            <div>
              <EditableDisplayName initial={profile.display_name || ""} />
              <div className="text-[13px] text-[var(--fg-dim)]" dir="ltr">{user.email}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="תוכנית" value={PLAN_LABEL[profile.plan] ?? profile.plan} />
            <Field label="ימים נותרו" value={ent.plan === "trial" ? String(ent.daysLeft) : "—"} />
            <Field label="סוכנים אישיים" value={`${profile.custom_agents_count}/2`} />
            <Field label="סך שיחות" value={String(consultsCount?.length ?? 0)} />
            <Field label="חבילות שנוצרו" value={String(packagesCount?.length ?? 0)} />
            <Field label="הצטרפת ב-" value={new Date(profile.created_at).toLocaleDateString("he-IL")} />
          </div>
        </div>

        {/* Plan card */}
        <div className="bg-[var(--bg-elev)] border border-[var(--border)] rounded-[16px] p-6 mb-5">
          <div className="font-mono text-[10px] text-[var(--indigo-text)] uppercase tracking-[0.12em] mb-3">
            → plan details
          </div>
          {ent.plan === "trial" ? (
            <>
              <h2 className="text-[16px] font-semibold mb-2">ניסיון חינם · {ent.daysLeft} ימים נותרו</h2>
              <p className="text-[13px] text-[var(--fg-dim)] mb-4 leading-relaxed">
                בניסיון: יצירת עד 2 סוכנים אישיים, גישה לכל הטמפלייטים, ייעוץ בלתי מוגבל מנועם.
              </p>
              <Link href="/upgrade" className="inline-block px-4 py-2 rounded-lg text-[13px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #5E6AD2, #B867FF)" }}>
                שדרג ל-Pro ←
              </Link>
            </>
          ) : ent.plan === "pro" ? (
            <>
              <h2 className="text-[16px] font-semibold mb-2">Pro</h2>
              <p className="text-[13px] text-[var(--fg-dim)]">סוכנים ללא הגבלה · עדכונים אוטומטיים · תמיכה</p>
            </>
          ) : ent.plan === "admin" ? (
            <>
              <h2 className="text-[16px] font-semibold mb-2 text-[var(--magenta)]">★ Admin</h2>
              <p className="text-[13px] text-[var(--fg-dim)]">גישה מלאה, אין הגבלות, רואה את כל המשתמשים והשיחות.</p>
            </>
          ) : (
            <>
              <h2 className="text-[16px] font-semibold mb-2">פג תוקף</h2>
              <p className="text-[13px] text-[var(--fg-dim)] mb-4">הניסיון נגמר. שדרג ל-Pro כדי להמשיך.</p>
              <Link href="/upgrade" className="inline-block px-4 py-2 rounded-lg text-[13px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #5E6AD2, #B867FF)" }}>
                שדרג ←
              </Link>
            </>
          )}
        </div>

        {/* Sign out */}
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl text-[13px] text-[var(--fg-dim)] bg-white/[0.04] border border-[var(--border)] hover:bg-white/[0.06] hover:text-white transition-colors"
          >
            התנתק מהחשבון
          </button>
        </form>
      </div>
    </WorkspaceShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] text-[var(--fg-muted)] uppercase tracking-[0.08em] mb-1.5">
        {label}
      </div>
      <div className="text-[14px] text-white">{value}</div>
    </div>
  );
}
