import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TEAM_AGENTS } from "@/lib/team/agents";

export const metadata = { title: "Team Chat · GenerAgent" };
export const dynamic = "force-dynamic";

export default async function TeamHomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("plan, display_name").eq("id", user.id).single();
  if (me?.plan !== "admin") redirect("/dashboard");

  // Get most recent chat per agent
  const { data: recentChats } = await supabase
    .from("team_agent_chats")
    .select("id, agent_handle, title, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(30);

  return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      <nav className="backdrop-blur-[20px] bg-[rgba(2,2,3,0.6)] border-b border-[var(--border)] py-3.5">
        <div className="max-w-[1100px] mx-auto px-6 flex items-center justify-between gap-4">
          <Link href="/admin" className="text-[var(--fg-dim)] hover:text-[var(--fg)] font-mono text-[12px]">← admin</Link>
          <span className="font-mono text-[12px] text-[var(--fg)]">team chat</span>
          <Link href="/dashboard" className="text-[var(--fg-dim)] hover:text-[var(--fg)] font-mono text-[12px]">dashboard →</Link>
        </div>
      </nav>

      <main className="max-w-[1100px] mx-auto px-6 py-10 flex-1 w-full">
        <div className="mb-8">
          <div className="font-mono text-[11px] text-[var(--indigo-text)] uppercase tracking-[0.12em] mb-2">
            internal product team
          </div>
          <h1 className="text-[28px] font-bold tracking-[-0.02em] mb-2">דבר עם הצוות</h1>
          <p className="text-[var(--fg-dim)] text-[14px] leading-relaxed">
            כל סוכן הוא קולגה במוצר. תמר מתכננת, יואב כותב קוד, רוני שומר עליו רץ. תפתח שיחה עם מי שאתה צריך.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TEAM_AGENTS.map((agent) => {
            const lastChat = recentChats?.find((c) => c.agent_handle === agent.handle);
            return (
              <Link
                key={agent.handle}
                href={`/team/${agent.handle}${lastChat ? `?chat=${lastChat.id}` : ""}`}
                className="block bg-[var(--bg-elev)] border border-[var(--border)] rounded-[14px] p-5 hover:border-[rgba(94,106,210,0.3)] transition-colors no-underline"
              >
                <div className="font-mono text-[10px] text-[var(--indigo-text)] uppercase tracking-[0.1em] mb-2">
                  @{agent.handle}
                </div>
                <h3 className="text-[15px] font-bold text-white mb-1">{agent.name}</h3>
                <p className="text-[12px] text-[var(--fg-dim)] mb-3">{agent.role}</p>
                {lastChat ? (
                  <div className="text-[11px] text-[var(--fg-muted)] font-mono border-t border-[var(--border)] pt-2">
                    {lastChat.title ? lastChat.title.slice(0, 50) : "שיחה אחרונה"}
                  </div>
                ) : (
                  <div className="text-[11px] text-[var(--indigo-text)] font-mono border-t border-[var(--border)] pt-2">
                    + פתח שיחה
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
