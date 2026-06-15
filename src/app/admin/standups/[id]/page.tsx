import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DecisionReply from "@/components/DecisionReply";

export const metadata = { title: "Standup · Admin" };
export const dynamic = "force-dynamic";

export default async function StandupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  if (me?.plan !== "admin") redirect("/dashboard");

  const { data: standup } = await supabase
    .from("team_standups")
    .select("*")
    .eq("id", id)
    .single();
  if (!standup) notFound();

  return (
    <>
      <nav className="backdrop-blur-[20px] bg-[rgba(2,2,3,0.6)] border-b border-[var(--border)] py-3.5">
        <div className="max-w-[820px] mx-auto px-6 flex items-center gap-4">
          <Link href="/admin/standups" className="text-[var(--fg-dim)] hover:text-[var(--fg)] font-mono text-[12px]">← standups</Link>
          <span className="text-[var(--fg-muted)]">/</span>
          <span className="font-mono text-[12px] text-[var(--fg)]">
            {new Date(standup.standup_date).toLocaleString("he-IL")}
          </span>
        </div>
      </nav>

      <main className="max-w-[820px] mx-auto px-6 py-10 flex-1">
        <article className="prose prose-invert max-w-none">
          <pre className="whitespace-pre-wrap font-[inherit] text-[14px] leading-[1.7] text-white/90" dir="rtl">
{standup.summary_md}
          </pre>
        </article>

        {Array.isArray(standup.decisions_needed) && standup.decisions_needed.length > 0 && (
          <div className="mt-8 bg-amber-500/[0.06] border border-amber-500/30 rounded-[14px] p-5">
            <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-amber-300 mb-4">
              ⚠ ממתין להחלטה ממך — ענה ותמר תקבל
            </div>
            <div className="space-y-1">
              {(standup.decisions_needed as string[]).map((d, i) => {
                const responses = (standup.user_responses as Record<string, unknown> | null) ?? {};
                const raw = responses[String(i)];
                // Support both new format {thread:[...]} and legacy {response, at}
                let thread: Array<{ role: "user" | "tamar"; text: string; at: string }> = [];
                if (raw && typeof raw === "object") {
                  if ("thread" in raw && Array.isArray((raw as { thread: unknown }).thread)) {
                    thread = (raw as { thread: typeof thread }).thread;
                  } else if ("response" in raw && typeof (raw as { response: unknown }).response === "string") {
                    const legacy = raw as { response: string; at: string };
                    thread = [{ role: "user", text: legacy.response, at: legacy.at }];
                  }
                }
                return (
                  <DecisionReply
                    key={i}
                    standupId={standup.id}
                    decisionIndex={i}
                    decisionText={d}
                    initialThread={thread}
                  />
                );
              })}
            </div>
          </div>
        )}

        {standup.agent_inputs && (
          <details className="mt-8 bg-[var(--bg-elev)] border border-[var(--border)] rounded-[14px] p-5">
            <summary className="cursor-pointer text-[13px] text-[var(--fg-dim)] hover:text-white">
              📋 דיווחי הסוכנים הגולמיים
            </summary>
            <pre className="mt-4 text-[12px] font-mono text-white/70 whitespace-pre-wrap overflow-auto" dir="ltr">
{JSON.stringify(standup.agent_inputs, null, 2)}
            </pre>
          </details>
        )}
      </main>
    </>
  );
}
