"use client";

import { useState } from "react";

export default function TemplateModRow({
  id,
  slug,
  name,
  description,
  published,
  adminBlocked,
  installCount,
}: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  published: boolean;
  adminBlocked: boolean;
  installCount: number;
}) {
  const [state, setState] = useState<{ published: boolean; blocked: boolean }>({
    published,
    blocked: adminBlocked,
  });
  const [busy, setBusy] = useState(false);

  async function act(action: "block" | "unblock" | "unpublish") {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: id, action }),
      });
      if (!res.ok) throw new Error();
      if (action === "block") setState({ published: false, blocked: true });
      if (action === "unblock") setState((s) => ({ ...s, blocked: false }));
      if (action === "unpublish") setState((s) => ({ ...s, published: false }));
    } catch {
      alert("הפעולה נכשלה. נסה שוב.");
    } finally {
      setBusy(false);
    }
  }

  const status = state.blocked
    ? { label: "חסום", color: "text-red-300 border-red-500/30 bg-red-500/10" }
    : state.published
      ? { label: "חי", color: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" }
      : { label: "לא מפורסם", color: "text-white/40 border-white/10 bg-white/[0.03]" };

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-medium text-sm">{name}</span>
            <span className={`text-[10px] font-mono rounded px-2 py-0.5 border ${status.color}`}>
              {status.label}
            </span>
          </div>
          {description && (
            <p className="text-[12px] text-[var(--fg-dim)] mt-1 line-clamp-2">{description}</p>
          )}
        </div>
        <div className="text-[11px] text-[var(--fg-muted)] font-mono whitespace-nowrap">
          {installCount} התקנות
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <a href={`/templates/${slug}`} target="_blank" className="text-[12px] text-[var(--indigo-text)] hover:underline">
          עמוד ציבורי ↗
        </a>
        <span className="text-white/20">·</span>
        {state.blocked ? (
          <button onClick={() => act("unblock")} disabled={busy} className="text-[12px] text-emerald-300/80 hover:text-emerald-300 disabled:opacity-50">
            בטל חסימה
          </button>
        ) : (
          <>
            {state.published && (
              <button onClick={() => act("unpublish")} disabled={busy} className="text-[12px] text-white/50 hover:text-white/80 disabled:opacity-50">
                הסתר
              </button>
            )}
            <span className="text-white/20">·</span>
            <button onClick={() => act("block")} disabled={busy} className="text-[12px] text-red-300/80 hover:text-red-300 disabled:opacity-50">
              חסום לצמיתות
            </button>
          </>
        )}
      </div>
    </div>
  );
}
