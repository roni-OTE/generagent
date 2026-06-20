import Link from "next/link";

type Props = {
  used: number;
  limit: number;
  resetInDays: number;
  plan: "trial" | "pro" | "admin" | "expired";
  compact?: boolean;
};

export default function QuotaBar({ used, limit, resetInDays, plan, compact }: Props) {
  if (plan === "admin") {
    return compact ? null : (
      <div className="text-[12px] text-[var(--magenta)] font-mono">★ admin · ללא הגבלת טוקנים</div>
    );
  }

  const percent = Math.min(100, Math.round((used / limit) * 100));
  const color =
    percent >= 95
      ? "from-red-500 to-rose-400"
      : percent >= 80
        ? "from-amber-500 to-yellow-400"
        : "from-indigo-500 to-fuchsia-500";

  return (
    <div className={compact ? "" : "bg-[var(--bg-elev)] border border-[var(--border)] rounded-[14px] p-5"}>
      {!compact && (
        <div className="font-mono text-[10px] text-[var(--indigo-text)] uppercase tracking-[0.12em] mb-3">
          → token usage (חודשי)
        </div>
      )}
      <div className="flex justify-between items-baseline mb-2 text-[13px]">
        <span className="text-white font-semibold">
          {used.toLocaleString("he-IL")} / {limit.toLocaleString("he-IL")}
        </span>
        <span className={`text-[11px] font-mono ${percent >= 95 ? "text-red-300" : percent >= 80 ? "text-amber-300" : "text-[var(--fg-muted)]"}`}>
          {percent}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${color} transition-all`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex justify-between items-center mt-2 text-[11px] text-[var(--fg-muted)] font-mono">
        <span>מתאפס בעוד {resetInDays} ימים</span>
        {percent >= 80 && plan !== "pro" && (
          <Link href="/upgrade" className="text-[var(--indigo-bright)] hover:underline">
            שדרג ל-Pro →
          </Link>
        )}
      </div>
    </div>
  );
}
