"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { initial: string };

export default function EditableDisplayName({ initial }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    const cleaned = value.trim();
    if (!cleaned || cleaned === initial) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: cleaned }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה בשמירה");
      setEditing(false);
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-[18px] font-semibold text-white hover:text-indigo-300 transition-colors text-right"
        title="לחץ לעריכה"
      >
        {initial || "—"}
        <span className="text-[10px] text-[var(--fg-muted)] mr-2">✎</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void save();
          if (e.key === "Escape") { setEditing(false); setValue(initial); }
        }}
        disabled={saving}
        className="bg-white/[0.05] border border-white/[0.12] rounded-lg px-3 py-1.5 text-[16px] text-white focus:outline-none focus:border-indigo-400/40"
        maxLength={60}
      />
      <button
        onClick={save}
        disabled={saving}
        className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white"
        style={{ background: "linear-gradient(135deg, #5E6AD2, #B867FF)" }}
      >
        {saving ? "..." : "שמור"}
      </button>
      <button
        onClick={() => { setEditing(false); setValue(initial); setErr(null); }}
        disabled={saving}
        className="px-2 py-1.5 rounded-lg text-[12px] text-[var(--fg-dim)] hover:text-white"
      >
        ביטול
      </button>
      {err && <span className="text-[11px] text-red-300/80">{err}</span>}
    </div>
  );
}
