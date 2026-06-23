import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TEAM_AGENTS } from "@/lib/team/agents";

export const metadata = { title: "תקשורת בין-סוכנים · Admin" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  from_agent: string;
  to_agent: string;
  message: string;
  response: string | null;
  meeting_id: string | null;
  source_chat_id: string | null;
  created_at: string;
};

function agentName(handle: string): string {
  return TEAM_AGENTS.find((a) => a.handle === handle)?.name ?? handle;
}

export default async function InterAgentLogPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  if (me?.plan !== "admin") redirect("/dashboard");

  const { data } = await supabase
    .from("inter_agent_messages")
    .select("id, from_agent, to_agent, message, response, meeting_id, source_chat_id, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows: Row[] = (data ?? []) as Row[];

  // Group by meeting_id if present, else standalone
  const groups: { key: string; meeting: boolean; rows: Row[]; created_at: string }[] = [];
  const byMeeting = new Map<string, Row[]>();
  const standalone: Row[] = [];
  for (const r of rows) {
    if (r.meeting_id) {
      const arr = byMeeting.get(r.meeting_id) ?? [];
      arr.push(r);
      byMeeting.set(r.meeting_id, arr);
    } else {
      standalone.push(r);
    }
  }
  for (const [k, arr] of byMeeting) {
    groups.push({ key: `m:${k}`, meeting: true, rows: arr, created_at: arr[0].created_at });
  }
  for (const r of standalone) {
    groups.push({ key: `s:${r.id}`, meeting: false, rows: [r], created_at: r.created_at });
  }
  groups.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return (
    <>
      <nav className="backdrop-blur-[20px] bg-[rgba(2,2,3,0.6)] border-b border-[var(--border)] py-3.5">
        <div className="max-w-[900px] mx-auto px-6 flex items-center gap-4">
          <Link href="/admin" className="text-[var(--fg-dim)] hover:text-[var(--fg)] font-mono text-[12px]">← admin</Link>
          <span className="text-[var(--fg-muted)]">/</span>
          <span className="font-mono text-[12px] text-[var(--fg)]">inter-agent</span>
        </div>
      </nav>

      <main className="max-w-[900px] mx-auto px-6 py-10 flex-1" dir="rtl">
        <div className="mb-6">
          <div className="font-mono text-[11px] text-[var(--indigo-text)] uppercase tracking-[0.12em] mb-2">
            inter-agent communication
          </div>
          <h1 className="text-[28px] font-bold tracking-[-0.02em] mb-2">תקשורת בין סוכני הצוות</h1>
          <p className="text-[var(--fg-dim)] text-[14px] leading-relaxed">
            כל פעם שתמר (או סוכן אחר) פונה לחבר צוות עם <code className="font-mono text-[12px] text-[var(--indigo-text)]">ping_agent</code> או{" "}
            <code className="font-mono text-[12px] text-[var(--indigo-text)]">call_team_meeting</code> — השיחה נרשמת כאן. 100 פעולות אחרונות.
          </p>
        </div>

        {groups.length === 0 ? (
          <div className="bg-[var(--bg-elev)] border border-[var(--border)] rounded-[14px] p-8 text-center text-[var(--fg-dim)]">
            עדיין לא היו תקשורות בין סוכנים. ברגע שתמר תפנה לחבר צוות, זה יופיע פה.
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((g) => (
              <div key={g.key} className="bg-[var(--bg-elev)] border border-[var(--border)] rounded-[14px] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {g.meeting && (
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] bg-[rgba(192,132,252,0.12)] text-[var(--magenta)] border border-[rgba(192,132,252,0.3)] rounded px-2 py-0.5">
                        team meeting · {g.rows.length} משתתפים
                      </span>
                    )}
                    {!g.meeting && (
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] bg-[rgba(94,106,210,0.12)] text-[var(--indigo-text)] border border-[rgba(94,106,210,0.3)] rounded px-2 py-0.5">
                        ping
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[11px] text-[var(--fg-muted)]" dir="ltr">
                    {new Date(g.created_at).toLocaleString("he-IL")}
                  </span>
                </div>

                {/* Original question — same across all rows in a meeting */}
                <div className="mb-3 px-3 py-2 bg-[rgba(94,106,210,0.06)] border-r-2 border-[var(--indigo)] rounded">
                  <div className="text-[11px] text-[var(--fg-muted)] mb-1">
                    <strong className="text-[var(--indigo-text)]">{agentName(g.rows[0].from_agent)}</strong> שאל/ה:
                  </div>
                  <div className="text-[13px] text-[var(--fg)] whitespace-pre-wrap leading-relaxed">{g.rows[0].message}</div>
                </div>

                {/* Responses */}
                <div className="space-y-2">
                  {g.rows.map((r) => (
                    <div key={r.id} className="px-3 py-2 bg-[var(--surface)] rounded">
                      <div className="text-[11px] text-[var(--fg-muted)] mb-1">
                        <strong className="text-[var(--magenta)]">{agentName(r.to_agent)}</strong> ענה/ענתה:
                      </div>
                      {r.response ? (
                        <div className="text-[13px] text-[var(--fg-dim)] whitespace-pre-wrap leading-relaxed">{r.response}</div>
                      ) : (
                        <div className="text-[12px] text-[var(--danger)] italic">(לא ענה — שגיאה)</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
