import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "פרטי משתמש · Admin" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  if (me?.plan !== "admin") redirect("/dashboard");

  const { data: target } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();
  if (!target) notFound();

  const { data: consultations } = await supabase
    .from("consultations")
    .select("id, status, phase, started_at, completed_at, question_count, confidence, detected_persona")
    .eq("user_id", id)
    .order("started_at", { ascending: false });

  const { data: packages } = await supabase
    .from("packages")
    .select("id, name, version, archetype, is_template_clone, created_at")
    .eq("user_id", id)
    .order("created_at", { ascending: false });

  return (
    <>
      <nav className="backdrop-blur-[20px] bg-[rgba(2,2,3,0.6)] border-b border-[var(--border)] py-3.5">
        <div className="max-w-[1180px] mx-auto px-6 flex items-center gap-4">
          <Link href="/admin" className="text-[var(--fg-dim)] hover:text-[var(--fg)] font-mono text-[12px]">← admin</Link>
          <span className="text-[var(--fg-muted)]">/</span>
          <span className="font-bold text-[15px]">{target.display_name ?? target.email}</span>
        </div>
      </nav>

      <main className="max-w-[1180px] mx-auto px-6 py-10 flex-1">
        {/* Profile summary */}
        <div className="bg-[var(--bg-elev)] border border-[var(--border)] rounded-[16px] p-6 mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="font-mono text-[10px] text-[var(--fg-muted)] uppercase tracking-[0.1em] mb-1">email</div>
            <div className="text-[14px]" dir="ltr">{target.email}</div>
          </div>
          <div>
            <div className="font-mono text-[10px] text-[var(--fg-muted)] uppercase tracking-[0.1em] mb-1">plan</div>
            <div className="text-[14px]">{target.plan}</div>
          </div>
          <div>
            <div className="font-mono text-[10px] text-[var(--fg-muted)] uppercase tracking-[0.1em] mb-1">custom agents</div>
            <div className="text-[14px]">{target.custom_agents_count} / 2</div>
          </div>
          <div>
            <div className="font-mono text-[10px] text-[var(--fg-muted)] uppercase tracking-[0.1em] mb-1">trial started</div>
            <div className="text-[14px]" dir="ltr">{new Date(target.trial_started_at).toLocaleString("en-GB")}</div>
          </div>
        </div>

        {/* Consultations */}
        <h2 className="text-[20px] font-bold mb-4">שיחות ({consultations?.length ?? 0})</h2>
        <div className="bg-[var(--bg-elev)] border border-[var(--border)] rounded-[14px] overflow-hidden mb-10">
          {consultations?.length ? (
            <table className="w-full text-[13px]">
              <thead className="bg-[var(--bg-elev-2)] text-[var(--fg-muted)] font-mono text-[10px] uppercase tracking-[0.1em]">
                <tr>
                  <th className="text-right p-4">סטטוס</th>
                  <th className="text-right p-4">שלב</th>
                  <th className="text-right p-4">שאלות</th>
                  <th className="text-right p-4">persona</th>
                  <th className="text-right p-4">started</th>
                  <th className="text-right p-4"></th>
                </tr>
              </thead>
              <tbody>
                {consultations.map((c) => (
                  <tr key={c.id} className="border-t border-[var(--border)] hover:bg-[var(--surface)]">
                    <td className="p-4">{c.status}</td>
                    <td className="p-4 font-mono text-[12px] text-[var(--fg-dim)]" dir="ltr">{c.phase}</td>
                    <td className="p-4 font-mono" dir="ltr">{c.question_count}</td>
                    <td className="p-4 font-mono text-[12px] text-[var(--indigo-text)]" dir="ltr">{c.detected_persona ?? "—"}</td>
                    <td className="p-4 font-mono text-[11px] text-[var(--fg-muted)]" dir="ltr">{new Date(c.started_at).toLocaleString("en-GB")}</td>
                    <td className="p-4 text-left">
                      <Link href={`/admin/consultations/${c.id}`} className="text-[12px] text-[var(--indigo-text)] hover:text-[var(--indigo-bright)]">
                        תמליל →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-[var(--fg-dim)]">אין שיחות עדיין.</div>
          )}
        </div>

        {/* Packages */}
        <h2 className="text-[20px] font-bold mb-4">חבילות ({packages?.length ?? 0})</h2>
        <div className="bg-[var(--bg-elev)] border border-[var(--border)] rounded-[14px] overflow-hidden">
          {packages?.length ? (
            <table className="w-full text-[13px]">
              <thead className="bg-[var(--bg-elev-2)] text-[var(--fg-muted)] font-mono text-[10px] uppercase tracking-[0.1em]">
                <tr>
                  <th className="text-right p-4">שם</th>
                  <th className="text-right p-4">archetype</th>
                  <th className="text-right p-4">version</th>
                  <th className="text-right p-4">type</th>
                  <th className="text-right p-4">created</th>
                </tr>
              </thead>
              <tbody>
                {packages.map((p) => (
                  <tr key={p.id} className="border-t border-[var(--border)] hover:bg-[var(--surface)]">
                    <td className="p-4 font-medium">{p.name}</td>
                    <td className="p-4 font-mono text-[12px] text-[var(--fg-dim)]" dir="ltr">{p.archetype ?? "—"}</td>
                    <td className="p-4 font-mono text-[12px] text-[var(--fg-dim)]" dir="ltr">v{p.version}</td>
                    <td className="p-4">
                      {p.is_template_clone ? (
                        <span className="text-[var(--success)] text-[11px]">★ template clone</span>
                      ) : (
                        <span className="text-[var(--indigo-text)] text-[11px]">custom</span>
                      )}
                    </td>
                    <td className="p-4 font-mono text-[11px] text-[var(--fg-muted)]" dir="ltr">{new Date(p.created_at).toLocaleString("en-GB")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-[var(--fg-dim)]">אין חבילות עדיין.</div>
          )}
        </div>
      </main>
    </>
  );
}
