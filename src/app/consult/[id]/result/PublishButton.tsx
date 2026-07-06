"use client";

import { useState } from "react";

export default function PublishButton({
  consultationId,
  initialSlug,
}: {
  consultationId: string;
  initialSlug: string | null;
}) {
  const [published, setPublished] = useState(!!initialSlug);
  const [slug, setSlug] = useState(initialSlug);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publish() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/packages/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultation_id: consultationId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "publish_failed");
      setPublished(true);
      setSlug(data.slug ?? null);
      setConfirming(false);
    } catch {
      setError("הפרסום נכשל. נסה שוב.");
    } finally {
      setBusy(false);
    }
  }

  async function unpublish() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/packages/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultation_id: consultationId, unpublish: true }),
      });
      if (!res.ok) throw new Error();
      setPublished(false);
    } catch {
      setError("הפעולה נכשלה. נסה שוב.");
    } finally {
      setBusy(false);
    }
  }

  if (published) {
    return (
      <div className="rounded-2xl border border-[rgba(74,222,128,0.25)] bg-[rgba(74,222,128,0.05)] p-5 text-center">
        <div className="text-[var(--success)] font-medium text-sm mb-1">✓ הסוכן פורסם במרקטפלייס</div>
        <p className="text-xs text-white/50 mb-3">כל אחד יכול למצוא ולהתקין אותו עכשיו.</p>
        <div className="flex items-center justify-center gap-3">
          {slug && (
            <a
              href={`/templates/${slug}`}
              className="text-xs text-[var(--indigo-text)] hover:underline"
            >
              צפייה בעמוד הציבורי ←
            </a>
          )}
          <button
            onClick={unpublish}
            disabled={busy}
            className="text-xs text-white/40 hover:text-white/70 disabled:opacity-50"
          >
            {busy ? "מסיר…" : "הסר מהמרקטפלייס"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
      <div className="text-white font-medium text-sm mb-1">רוצה לשתף את הסוכן הזה?</div>
      <p className="text-xs text-white/50 leading-relaxed mb-3">
        פרסם אותו במרקטפלייס הציבורי כטמפלייט חינמי. כל אחד יוכל למצוא ולהתקין אותו — נהדר אם בנית משהו
        שימושי.
      </p>
      <div className="text-[11px] text-amber-300/80 bg-amber-500/[0.06] border border-amber-500/20 rounded-lg px-3 py-2 mb-4 leading-relaxed">
        ⚠️ שים לב: ה-system prompt המלא יהיה גלוי וניתן להורדה לכל אחד. אם הזנת בשיחה פרטים עסקיים
        רגישים (מחירים, שמות לקוחות, נתונים פנימיים) — הם עלולים להיכלל בו. אפשר להסיר בכל רגע.
      </div>
      {error && <div className="text-xs text-red-300/80 mb-3">{error}</div>}
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="px-5 py-2.5 rounded-xl text-sm font-medium text-white"
          style={{ background: "linear-gradient(135deg, #5E6AD2, #B867FF)" }}
        >
          פרסם במרקטפלייס
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={publish}
            disabled={busy}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #5E6AD2, #B867FF)" }}
          >
            {busy ? "מפרסם…" : "כן, פרסם לכולם"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={busy}
            className="px-4 py-2.5 rounded-xl text-sm text-white/60 hover:text-white/90 disabled:opacity-50"
          >
            ביטול
          </button>
        </div>
      )}
    </div>
  );
}
