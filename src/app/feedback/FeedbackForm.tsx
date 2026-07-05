"use client";

import { useState } from "react";

export default function FeedbackForm({
  source,
  initialEmail,
}: {
  source: string;
  initialEmail: string;
}) {
  const [rating, setRating] = useState<number | null>(null);
  const [whatWorked, setWhatWorked] = useState("");
  const [whatMissing, setWhatMissing] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!rating || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          what_worked: whatWorked,
          what_missing: whatMissing,
          email,
          source,
        }),
      });
      if (!res.ok) throw new Error("save_failed");
      setSent(true);
    } catch {
      setError("לא הצלחנו לשמור — נסה שוב בעוד רגע.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center py-8">
        <div className="text-3xl mb-3">🙏</div>
        <div className="text-white font-medium mb-1">תודה!</div>
        <div className="text-sm text-[var(--fg-dim)]">רוני קורא כל משוב. באמת.</div>
        <a
          href="/dashboard"
          className="inline-block mt-6 px-5 py-2.5 rounded-xl text-sm text-white"
          style={{ background: "linear-gradient(135deg, #5E6AD2, #B867FF)" }}
        >
          חזרה למערכת
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm text-white/80 mb-2">איך הייתה החוויה עד עכשיו?</label>
        <div className="flex gap-2" role="radiogroup" aria-label="דירוג 1 עד 5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-pressed={rating === n}
              className={`flex-1 min-h-[44px] rounded-lg border text-sm transition-colors ${
                rating === n
                  ? "border-indigo-400/60 bg-indigo-500/20 text-white"
                  : "border-white/[0.08] bg-white/[0.02] text-white/60 hover:bg-white/[0.05]"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-white/30 mt-1">
          <span>מאכזב</span>
          <span>מעולה</span>
        </div>
      </div>

      <div>
        <label className="block text-sm text-white/80 mb-1.5">מה עבד טוב? (אופציונלי)</label>
        <textarea
          value={whatWorked}
          onChange={(e) => setWhatWorked(e.target.value)}
          rows={2}
          className="w-full resize-none bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-indigo-400/40"
          placeholder="השיחה עם נועם, התוצאה, משהו אחר…"
        />
      </div>

      <div>
        <label className="block text-sm text-white/80 mb-1.5">מה חסר או הפריע? (אופציונלי)</label>
        <textarea
          value={whatMissing}
          onChange={(e) => setWhatMissing(e.target.value)}
          rows={2}
          className="w-full resize-none bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-indigo-400/40"
          placeholder="כאן הכי שווה להיות כן…"
        />
      </div>

      <div>
        <label className="block text-sm text-white/80 mb-1.5">אימייל (אופציונלי — אם תרצה שנחזור אליך)</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          dir="ltr"
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-indigo-400/40"
          placeholder="you@example.com"
        />
      </div>

      {error && (
        <div className="text-xs text-red-300/80 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button
        onClick={submit}
        disabled={!rating || busy}
        className="w-full min-h-[44px] rounded-xl text-sm font-medium text-white disabled:opacity-30 transition-opacity"
        style={{ background: "linear-gradient(135deg, #5E6AD2, #B867FF)" }}
      >
        {busy ? "שולח…" : "שלח משוב"}
      </button>
    </div>
  );
}
