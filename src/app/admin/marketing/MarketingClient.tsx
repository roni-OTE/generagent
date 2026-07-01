"use client";

import { useState } from "react";

type Item = {
  id: string;
  format: string;
  topic: string | null;
  title: string;
  body: string;
  hook: string | null;
  used_at: string | null;
  created_at: string;
};

const FORMATS: { key: string; label: string; emoji: string }[] = [
  { key: "whatsapp", label: "WhatsApp / מחדשין", emoji: "💬" },
  { key: "linkedin", label: "LinkedIn", emoji: "💼" },
  { key: "landing_hero", label: "Landing Hero", emoji: "✨" },
  { key: "email_teaser", label: "Newsletter teaser", emoji: "📧" },
  { key: "blog", label: "פוסט בלוג", emoji: "📝" },
];

export default function MarketingClient({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [format, setFormat] = useState("whatsapp");
  const [topic, setTopic] = useState("");
  const [angle, setAngle] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/marketing/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, topic, angle }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "יצירה נכשלה");
      } else {
        setItems((prev) => [data.item, ...prev]);
        setTopic("");
        setAngle("");
      }
    } catch {
      setErr("בעיית חיבור. נסה שוב.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("למחוק את הטיוטה?")) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/marketing/generate?id=${id}`, { method: "DELETE" });
  }

  async function toggleUsed(id: string, used: boolean) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, used_at: used ? new Date().toISOString() : null } : i)));
    await fetch(`/api/marketing/generate?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ used }),
    });
  }

  return (
    <>
      {/* Composer */}
      <div className="bg-[var(--bg-elev)] border border-[var(--border)] rounded-[16px] p-5 mb-8">
        <div className="text-[13px] font-semibold text-white mb-3">💜 בקש משירה תוכן חדש</div>

        <div className="mb-3">
          <label className="font-mono text-[11px] text-[var(--fg-dim)] uppercase tracking-[0.08em] block mb-1.5">→ פורמט</label>
          <div className="flex gap-2 flex-wrap">
            {FORMATS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFormat(f.key)}
                disabled={busy}
                className={`px-3 py-1.5 rounded-[8px] text-[12px] border transition-colors ${
                  format === f.key
                    ? "bg-[rgba(94,106,210,0.12)] border-[var(--indigo)] text-white"
                    : "bg-[var(--bg-deep)] border-[var(--border-strong)] text-[var(--fg-dim)] hover:text-[var(--fg)]"
                }`}
              >
                {f.emoji} {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="font-mono text-[11px] text-[var(--fg-dim)] uppercase tracking-[0.08em] block mb-1.5">→ נושא (אופציונלי)</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="למשל: איך מפרילנסר בוחר את הסוכן הנכון"
              disabled={busy}
              className="w-full bg-[var(--bg-deep)] border border-[var(--border-strong)] rounded-[10px] px-3.5 py-2.5 text-[13px] text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--indigo)]"
            />
          </div>
          <div>
            <label className="font-mono text-[11px] text-[var(--fg-dim)] uppercase tracking-[0.08em] block mb-1.5">→ זווית (אופציונלי)</label>
            <input
              type="text"
              value={angle}
              onChange={(e) => setAngle(e.target.value)}
              placeholder="למשל: מסיפור אישי, מפתיע"
              disabled={busy}
              className="w-full bg-[var(--bg-deep)] border border-[var(--border-strong)] rounded-[10px] px-3.5 py-2.5 text-[13px] text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--indigo)]"
            />
          </div>
        </div>

        {err && (
          <div className="p-3 mb-3 bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.3)] rounded-[10px] text-[12px] text-[var(--danger)]">
            ⚠ {err}
          </div>
        )}

        <button
          onClick={generate}
          disabled={busy}
          className="w-full sm:w-auto px-6 py-2.5 rounded-[10px] text-[13px] font-medium text-white transition-opacity disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #5E6AD2, #B867FF)" }}
        >
          {busy ? "שירה כותבת..." : "✨ בקש טיוטה"}
        </button>
      </div>

      {/* Items */}
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="bg-[var(--bg-elev)] border border-[var(--border)] rounded-[14px] p-8 text-center text-[var(--fg-dim)] text-[13px]">
            עדיין אין טיוטות. בחר פורמט וסמל, ותתקבל טיוטה תוך שניות.
          </div>
        ) : (
          items.map((item) => <MarketingItem key={item.id} item={item} onRemove={remove} onToggleUsed={toggleUsed} />)
        )}
      </div>
    </>
  );
}

function MarketingItem({
  item,
  onRemove,
  onToggleUsed,
}: {
  item: Item;
  onRemove: (id: string) => void;
  onToggleUsed: (id: string, used: boolean) => void;
}) {
  const [copied, setCopied] = useState<null | "body" | "hook">(null);
  const label = FORMATS.find((f) => f.key === item.format)?.label ?? item.format;
  const emoji = FORMATS.find((f) => f.key === item.format)?.emoji ?? "•";

  async function copy(text: string, which: "body" | "hook") {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className={`bg-[var(--bg-elev)] border rounded-[14px] p-4 ${item.used_at ? "border-[rgba(74,222,128,0.3)] opacity-70" : "border-[var(--border)]"}`}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] bg-[rgba(192,132,252,0.12)] text-[var(--magenta)] border border-[rgba(192,132,252,0.3)] rounded px-2 py-0.5">
            {emoji} {label}
          </span>
          {item.used_at && (
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--success)]">
              ✓ פורסם
            </span>
          )}
        </div>
        <span className="text-[11px] text-[var(--fg-muted)] font-mono whitespace-nowrap" dir="ltr">
          {new Date(item.created_at).toLocaleString("he-IL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      <div className="font-semibold text-white text-[15px] mb-3">{item.title}</div>

      {item.hook && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--fg-muted)]">Hook / סטטוס</div>
            <button
              onClick={() => copy(item.hook!, "hook")}
              className="text-[11px] text-[var(--indigo-text)] hover:text-[var(--indigo-bright)]"
            >
              {copied === "hook" ? "✓ הועתק" : "העתק"}
            </button>
          </div>
          <div className="bg-[var(--bg-deep)] border border-[var(--border)] rounded-[8px] px-3 py-2 text-[13px] text-[var(--fg)] italic">
            {item.hook}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--fg-muted)]">גוף הפוסט</div>
          <button
            onClick={() => copy(item.body, "body")}
            className="text-[11px] text-[var(--indigo-text)] hover:text-[var(--indigo-bright)]"
          >
            {copied === "body" ? "✓ הועתק" : "📋 העתק הכל"}
          </button>
        </div>
        <div className="bg-[var(--bg-deep)] border border-[var(--border)] rounded-[10px] px-3 py-3 text-[13px] text-[var(--fg-dim)] whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto">
          {item.body}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onToggleUsed(item.id, !item.used_at)}
          className="flex-1 py-1.5 rounded-[8px] text-[12px] text-[var(--fg-dim)] hover:text-[var(--success)] hover:bg-[rgba(74,222,128,0.06)] border border-[var(--border)] transition-colors"
        >
          {item.used_at ? "בטל סימון" : "✓ סמן כפורסם"}
        </button>
        <button
          onClick={() => onRemove(item.id)}
          className="px-4 py-1.5 rounded-[8px] text-[12px] text-[var(--fg-muted)] hover:text-[var(--danger)] hover:bg-[rgba(248,113,113,0.06)] border border-[var(--border)] transition-colors"
        >
          מחק
        </button>
      </div>
    </div>
  );
}
