"use client";

import { useState } from "react";

type Entry = {
  id: string;
  email: string;
  name: string | null;
  note: string | null;
  source_hint: string | null;
  status: string;
  approved_at: string | null;
  invite_code_id: string | null;
  created_at: string;
};

export default function WaitlistRow({ entry }: { entry: Entry }) {
  const [status, setStatus] = useState<"idle" | "approving" | "rejecting" | "approved" | "rejected" | "error">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function approve() {
    setStatus("approving");
    setErrMsg(null);
    const res = await fetch(`/api/waitlist/${entry.id}/approve`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setStatus("approved");
    } else {
      setStatus("error");
      setErrMsg(data.error || "אישור נכשל");
    }
  }

  async function reject() {
    if (!confirm(`לדחות את הבקשה מ-${entry.email}? (הם לא יקבלו הודעה)`)) return;
    setStatus("rejecting");
    const res = await fetch(`/api/waitlist/${entry.id}/approve`, { method: "DELETE" });
    if (res.ok) setStatus("rejected");
    else setStatus("error");
  }

  if (status === "approved") {
    return (
      <div className="bg-[rgba(74,222,128,0.06)] border border-[rgba(74,222,128,0.3)] rounded-[12px] p-4">
        <div className="flex items-center gap-2 text-[var(--success)] font-medium text-[13px]">
          ✓ אושר · מייל נשלח ל-{entry.email}
        </div>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="bg-[var(--bg-elev)] border border-[var(--border)] rounded-[12px] p-4 opacity-50">
        <div className="text-[12px] text-[var(--fg-dim)]">נדחה: {entry.email}</div>
      </div>
    );
  }

  const sourceLabel =
    entry.source_hint === "mechadshin" ? "מחדשין" :
    entry.source_hint === "linkedin" ? "LinkedIn" : "אחר";

  return (
    <div className="bg-[var(--bg-elev)] border border-[var(--border)] rounded-[12px] p-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-white font-medium text-[14px]">{entry.name || entry.email.split("@")[0]}</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] bg-[rgba(94,106,210,0.12)] text-[var(--indigo-text)] border border-[rgba(94,106,210,0.3)] rounded px-2 py-0.5">
              {sourceLabel}
            </span>
          </div>
          <div className="text-[12px] text-[var(--fg-dim)] font-mono" dir="ltr">{entry.email}</div>
        </div>
        <div className="text-[11px] text-[var(--fg-muted)] font-mono whitespace-nowrap" dir="ltr">
          {new Date(entry.created_at).toLocaleDateString("he-IL")}
        </div>
      </div>

      {entry.note && (
        <div className="mb-3 px-3 py-2 bg-[var(--surface)] rounded-[8px] text-[12px] text-[var(--fg-dim)] leading-relaxed whitespace-pre-wrap">
          {entry.note}
        </div>
      )}

      {errMsg && (
        <div className="mb-3 text-[11px] text-[var(--danger)]">⚠ {errMsg}</div>
      )}

      <div className="flex gap-2">
        <button
          onClick={approve}
          disabled={status !== "idle"}
          className="flex-1 py-2 rounded-[8px] text-[13px] font-medium text-white transition-opacity disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #5E6AD2, #B867FF)" }}
        >
          {status === "approving" ? "מאשר..." : "✓ אשר ושלח מייל"}
        </button>
        <button
          onClick={reject}
          disabled={status !== "idle"}
          className="px-4 py-2 rounded-[8px] text-[13px] text-[var(--fg-dim)] hover:text-[var(--danger)] hover:bg-[rgba(248,113,113,0.06)] transition-colors disabled:opacity-50"
        >
          דחה
        </button>
      </div>
    </div>
  );
}
