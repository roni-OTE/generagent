"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";

/**
 * Post-consultation refinement: the user reads the final agent spec and asks
 * for a targeted change ("שהוא ישלח גם ב-WhatsApp", "בלי פוסטים פוליטיים"...).
 * Calls /api/consult/revise which regenerates the analysis AND the package,
 * so the install command always serves the refined agent.
 */
export default function ReviseBox({
  consultationId,
  revisionsLeft: initialLeft,
}: {
  consultationId: string;
  revisionsLeft: number;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(initialLeft);
  const [error, setError] = useState<string | null>(null);
  const [justRevised, setJustRevised] = useState(false);

  function friendlyError(code: string): string {
    const map: Record<string, string> = {
      revision_cap_reached: "ניצלת את כל הדיוקים לסוכן הזה. לשינוי גדול — התחל שיחה חדשה עם נועם.",
      quota_exceeded: "נגמר הקצב החודשי שלך. הוא יתאפס בתחילת התקופה הבאה.",
      parse_failed: "משהו השתבש בניסוח. נסה שוב — זה בדרך כלל עובד בפעם השנייה.",
      not_completed: "האפיון עדיין לא הושלם — רענן את הדף.",
      unauthenticated: "צריך לחדש את החיבור — רענן את הדף ונסה שוב.",
      timeout: "זה לוקח יותר מדי זמן — כנראה עומס רגעי. נסה שוב.",
    };
    return map[code] ?? "הדיוק נכשל. נסה שוב.";
  }

  // Hard client-side timeout so the UI never hangs if the function dies mid-flight.
  async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      return await fetch(url, { ...init, signal: ctrl.signal });
    } catch (e) {
      if (ctrl.signal.aborted) throw new Error("timeout");
      throw e;
    } finally {
      clearTimeout(t);
    }
  }

  async function submit() {
    const request = text.trim();
    if (request.length < 3 || busy) return;
    setBusy(true);
    setError(null);
    setJustRevised(false);
    try {
      const res = await fetchWithTimeout(
        "/api/consult/revise",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ consultation_id: consultationId, revision_request: request }),
        },
        180_000
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || friendlyError(data?.error || "revise_failed"));
      }
      setText("");
      setLeft(typeof data.revisions_left === "number" ? data.revisions_left : left - 1);
      setJustRevised(true);
      router.refresh(); // server component re-reads the updated analysis
    } catch (e) {
      const msg = e instanceof Error ? e.message : "revise_failed";
      setError(msg === "timeout" ? friendlyError("timeout") : msg);
    } finally {
      setBusy(false);
    }
  }

  // Rendered inside the page's <Section> card — no card wrapper of its own.
  if (left <= 0 && !justRevised) {
    return (
      <div className="text-center text-xs text-white/40">
        ניצלת את כל הדיוקים לסוכן הזה. רוצה משהו אחר לגמרי? התחל שיחה חדשה עם נועם.
      </div>
    );
  }

  return (
    <div>
      {justRevised && (
        <div className="mb-3 text-xs text-[var(--success,#4ade80)]">
          ✓ הסוכן עודכן — הדף והפקודה למטה כבר משקפים את הדיוק.
        </div>
      )}
      <p className="text-sm text-white/70 mb-3 leading-relaxed">
        משהו לא מדויק? תכתוב מה לשנות — והסוכן יעודכן, כולל פקודת ההתקנה.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void submit();
          }
        }}
        disabled={busy}
        rows={2}
        maxLength={2000}
        placeholder='למשל: "שישלח את הסיכום גם למייל, לא רק לטלגרם"'
        className="w-full rounded-lg bg-black/30 border border-white/[0.08] px-3 py-2.5 text-sm text-white/90 placeholder:text-white/25 focus:outline-none focus:border-indigo-400/40 resize-none disabled:opacity-50"
        dir="rtl"
      />
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] text-white/30">
          {busy ? "מעדכן את הסוכן… זה לוקח עד דקה" : `נשארו ${left} דיוקים`}
        </span>
        <Button
          onClick={() => void submit()}
          disabled={busy || text.trim().length < 3}
          className="min-h-[44px]"
        >
          {busy ? "מדייק…" : "דייק את הסוכן"}
        </Button>
      </div>
      {error && <div className="mt-2 text-xs text-red-400/80">{error}</div>}
    </div>
  );
}
