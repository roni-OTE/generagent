import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TEAM_AGENTS } from "@/lib/team/agents";
import CopyableCode from "@/components/CopyableCode";

export const metadata = { title: "צוות המוצר · Admin" };
export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  if (me?.plan !== "admin") redirect("/dashboard");

  const installCmd = "curl -fsSL https://generagent.io/api/team/install | bash";

  return (
    <>
      <nav className="backdrop-blur-[20px] bg-[rgba(2,2,3,0.6)] border-b border-[var(--border)] py-3.5">
        <div className="max-w-[900px] mx-auto px-6 flex items-center gap-4">
          <Link href="/admin" className="text-[var(--fg-dim)] hover:text-[var(--fg)] font-mono text-[12px]">← admin</Link>
          <span className="text-[var(--fg-muted)]">/</span>
          <span className="font-mono text-[12px] text-[var(--fg)]">team</span>
        </div>
      </nav>

      <main className="max-w-[900px] mx-auto px-6 py-10 flex-1">
        <div className="mb-7">
          <div className="font-mono text-[11px] text-[var(--indigo-text)] uppercase tracking-[0.12em] mb-2">
            internal product team
          </div>
          <h1 className="text-[28px] font-bold tracking-[-0.02em] mb-2">צוות המוצר</h1>
          <p className="text-[var(--fg-dim)] text-[14px] leading-relaxed">
            6 סוכנים פנימיים שמתחזקים את GenerAgent — תעדוף, פיתוח, ניטור, תמיכה, שיווק, release.
            פגישת standup כל יומיים ב-09:00, סיכום נשלח אליך במייל ומופיע בדאשבורד.
          </p>
        </div>

        {/* Install */}
        <div className="bg-[var(--bg-elev)] border border-[var(--border)] rounded-[16px] p-5 mb-7">
          <div className="font-mono text-[10px] text-[var(--indigo-text)] uppercase tracking-[0.12em] mb-3">
            התקנת הצוות בפרויקט שלך
          </div>
          <p className="text-[12px] text-[var(--fg-dim)] mb-3 leading-relaxed">
            הריץ בתיקיית הפרויקט. הפקודה תכתוב 6 קבצי `.md` ל-`.claude/agents/`.
          </p>
          <CopyableCode label="Claude Code" code={installCmd} />
        </div>

        {/* Team grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {TEAM_AGENTS.map((agent) => (
            <div key={agent.handle} className="bg-[var(--bg-elev)] border border-[var(--border)] rounded-[14px] p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="font-mono text-[10px] text-[var(--indigo-text)] uppercase tracking-[0.1em]">
                  @{agent.handle}
                </div>
              </div>
              <h3 className="text-[15px] font-bold mb-1">{agent.name}</h3>
              <p className="text-[12px] text-[var(--fg-dim)] mb-3">{agent.role}</p>
              <div className="border-t border-[var(--border)] pt-3">
                <div className="text-[10px] text-[var(--fg-muted)] uppercase tracking-[0.08em] mb-1.5 font-mono">
                  משימות ראשונות
                </div>
                <ul className="space-y-1">
                  {agent.first_tasks.slice(0, 2).map((t, i) => (
                    <li key={i} className="text-[12px] text-white/70 flex gap-1.5">
                      <span className="text-[var(--indigo-text)]">·</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Standups quick link */}
        <div className="bg-gradient-to-br from-indigo-500/[0.08] to-fuchsia-500/[0.05] border border-indigo-400/25 rounded-[14px] p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-[14px] font-semibold mb-1">📋 Standups שבועיים</h3>
              <p className="text-[12px] text-[var(--fg-dim)]">פגישות הצוות כל 48 שעות. סיכומים נשמרים ונשלחים אליך.</p>
            </div>
            <Link
              href="/admin/standups"
              className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #5E6AD2, #B867FF)" }}
            >
              לכל ה-standups ←
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
