"use client";

import { useState } from "react";

type Props = {
  standupId: string;
  decisionIndex: number;
  decisionText: string;
  initialResponse?: { response: string; at: string } | null;
};

export default function DecisionReply({ standupId, decisionIndex, decisionText, initialResponse }: Props) {
  const [response, setResponse] = useState(initialResponse?.response ?? "");
  const [saved, setSaved] = useState<{ at: string } | null>(initialResponse ? { at: initialResponse.at } : null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!initialResponse);

  async function save() {
    const text = response.trim();
    if (!text) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/team/standups/${standupId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision_index: decisionIndex, response: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "save_failed");
      setSaved({ at: new Date().toISOString() });
      setExpanded(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-white/[0.06] pt-3 mt-3 first:border-t-0 first:pt-0 first:mt-0">
      <div className="flex gap-2 text-[14px] text-white/90 mb-2">
        <span className="text-amber-300/60 mt-0.5">▸</span>
        <span className="flex-1">{decisionText}</span>
      </div>

      {!expanded && saved && (
        <div className="mr-6 bg-emerald-500/[0.06] border border-emerald-500/20 rounded-lg p-3 text-[13px]">
          <div className="text-emerald-300/80 text-[11px] font-mono mb-1">✓ ענית · {new Date(saved.at).toLocaleString("he-IL")}</div>
          <div className="text-white/80 whitespace-pre-wrap">{response}</div>
          <button onClick={() => setExpanded(true)} className="text-[11px] text-[var(--fg-muted)] hover:text-white mt-2">
            ערוך תשובה
          </button>
        </div>
      )}

      {expanded && (
        <div className="mr-6">
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="תשובה לתמר..."
            rows={3}
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-indigo-400/40"
            maxLength={2000}
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={save}
              disabled={busy || !response.trim()}
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #5E6AD2, #B867FF)" }}
            >
              {busy ? "..." : (saved ? "עדכן תשובה" : "שלח לתמר")}
            </button>
            {saved && (
              <button onClick={() => setExpanded(false)} className="text-[11px] text-[var(--fg-muted)]">
                ביטול
              </button>
            )}
            {err && <span className="text-[11px] text-red-300/80">{err}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
