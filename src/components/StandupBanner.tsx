import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function StandupBanner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  if (profile?.plan !== "admin") return null;

  const { data: latest } = await supabase
    .from("team_standups")
    .select("id, standup_date, highlights, decisions_needed")
    .order("standup_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latest) return null;

  const ageHours = (Date.now() - new Date(latest.standup_date).getTime()) / (1000 * 60 * 60);
  if (ageHours > 72) return null; // Hide old standups

  const decisions = (latest.decisions_needed as string[] | null) ?? [];
  const highlights = (latest.highlights as string[] | null) ?? [];

  return (
    <Link
      href={`/admin/standups/${latest.id}`}
      className="block mb-6 bg-gradient-to-br from-indigo-500/[0.08] to-fuchsia-500/[0.05] border border-indigo-400/25 rounded-[14px] p-4 hover:border-indigo-400/50 transition-colors no-underline"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-[18px]">📋</span>
          <div>
            <div className="text-[13px] text-white font-semibold">
              Standup חדש מהצוות —{" "}
              {new Date(latest.standup_date).toLocaleString("he-IL", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="text-[12px] text-[var(--fg-dim)] mt-0.5">
              {highlights[0] ?? "פגישת צוות אחרונה"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          {decisions.length > 0 && (
            <span className="text-amber-300/80 font-mono">⚠ {decisions.length} החלטות</span>
          )}
          <span className="text-[var(--indigo-text)] font-mono">לקריאה ←</span>
        </div>
      </div>
    </Link>
  );
}
