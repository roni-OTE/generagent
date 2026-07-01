"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Orb from "@/components/Orb";
import Button from "@/components/Button";
import Logo from "@/components/Logo";

export default function WaitlistPage() {
  return (
    <Suspense fallback={null}>
      <WaitlistInner />
    </Suspense>
  );
}

function WaitlistInner() {
  const params = useSearchParams();
  const blocked = params.get("blocked") === "1";
  const prefillEmail = params.get("email") ?? "";
  const [email, setEmail] = useState(prefillEmail);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [source, setSource] = useState<"mechadshin" | "linkedin" | "other">("other");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim(), note: note.trim(), source_hint: source }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "משהו השתבש");
      } else {
        setDone(true);
      }
    } catch {
      setErr("בעיית חיבור. נסה שוב.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <nav className="backdrop-blur-[20px] bg-[rgba(2,2,3,0.6)] border-b border-[var(--border)] py-3.5">
        <div className="max-w-[1180px] mx-auto px-6 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 text-[var(--fg)] no-underline">
            <Logo size="md" />
          </Link>
          <Link href="/"><Button variant="ghost" size="sm">חזרה</Button></Link>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[460px]">
          <div className="flex justify-center mb-6">
            <div className="w-[80px] h-[80px] relative">
              <Orb size="hero" cursorFollow={false} />
              <style>{`.orb-hero { width: 80px !important; height: 80px !important; }`}</style>
            </div>
          </div>

          <div className="bg-[var(--bg-elev)] border border-[var(--border)] rounded-[24px] p-9 relative overflow-hidden">
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent 20%, rgba(255,255,255,0.18) 50%, transparent 80%)" }}
            />

            {done ? (
              <div className="text-center py-6">
                <div className="text-[var(--success)] font-mono text-[11px] uppercase tracking-[0.1em] mb-3">
                  ✓ נרשמת לרשימת ההמתנה
                </div>
                <h2 className="text-[22px] font-bold mb-3">מצוין. אני עוקב אחרי הרשימה אישית.</h2>
                <p className="text-[var(--fg-dim)] text-[14px] leading-relaxed mb-6">
                  כשהמקום שלך יתפנה — תקבל מייל עם קישור הזמנה אישי. בינתיים,
                  מוזמן לעקוב אחריי בלינקדין ובמחדשין לעדכונים.
                </p>
                <Link href="/">
                  <Button variant="secondary" size="md">חזרה לעמוד הבית</Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 font-mono text-[10px] text-[var(--indigo-text)] uppercase tracking-[0.12em] mb-3">
                    <span className="w-1 h-px bg-[var(--indigo-text)]" /> waitlist
                  </div>
                  <h1 className="text-[24px] font-bold tracking-[-0.02em] mb-2 bg-gradient-to-b from-white to-[#B0B5C0] bg-clip-text text-transparent">
                    {blocked ? "אין לך הזמנה עדיין" : "רוצה להצטרף?"}
                  </h1>
                  <p className="text-[var(--fg-dim)] text-[14px] leading-relaxed">
                    GenerAgent פתוח כרגע ל-40 משתמשים ראשונים בלבד. השאר פרטים
                    ואחזור אליך אישית כשהמקום שלך יתפנה.
                  </p>
                </div>

                <form onSubmit={submit} className="flex flex-col gap-4">
                  <div>
                    <label className="font-mono text-[11px] text-[var(--fg-dim)] uppercase tracking-[0.08em] block mb-1.5">→ אימייל</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      disabled={busy}
                      className="w-full bg-[var(--bg-deep)] border border-[var(--border-strong)] rounded-[10px] px-3.5 py-3 text-[14px] text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--indigo)] focus:shadow-[0_0_0_3px_rgba(94,106,210,0.15)] transition-all"
                    />
                  </div>

                  <div>
                    <label className="font-mono text-[11px] text-[var(--fg-dim)] uppercase tracking-[0.08em] block mb-1.5">→ שם (אופציונלי)</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="השם שלך"
                      disabled={busy}
                      className="w-full bg-[var(--bg-deep)] border border-[var(--border-strong)] rounded-[10px] px-3.5 py-3 text-[14px] text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--indigo)] focus:shadow-[0_0_0_3px_rgba(94,106,210,0.15)] transition-all"
                    />
                  </div>

                  <div>
                    <label className="font-mono text-[11px] text-[var(--fg-dim)] uppercase tracking-[0.08em] block mb-1.5">→ איך שמעת עלינו?</label>
                    <div className="flex gap-2">
                      {(["mechadshin", "linkedin", "other"] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSource(s)}
                          className={`flex-1 py-2 rounded-lg text-[12px] border transition-colors ${
                            source === s
                              ? "bg-[rgba(94,106,210,0.12)] border-[var(--indigo)] text-white"
                              : "bg-[var(--bg-deep)] border-[var(--border-strong)] text-[var(--fg-dim)] hover:text-[var(--fg)]"
                          }`}
                        >
                          {s === "mechadshin" ? "מחדשין" : s === "linkedin" ? "LinkedIn" : "אחר"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="font-mono text-[11px] text-[var(--fg-dim)] uppercase tracking-[0.08em] block mb-1.5">→ מה תרצה לבנות? (אופציונלי)</label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="לדוגמה: סוכן שיענה לפניות תמיכה במקום..."
                      rows={3}
                      disabled={busy}
                      className="w-full bg-[var(--bg-deep)] border border-[var(--border-strong)] rounded-[10px] px-3.5 py-3 text-[14px] text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--indigo)] focus:shadow-[0_0_0_3px_rgba(94,106,210,0.15)] transition-all resize-none"
                    />
                  </div>

                  {err && (
                    <div className="p-3 bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.3)] rounded-[10px] text-[12px] text-[var(--danger)]">
                      ⚠ {err}
                    </div>
                  )}

                  <Button type="submit" variant="primary" size="md" className="w-full" disabled={busy || !email.trim()}>
                    {busy ? "שולח..." : "שלח בקשה"}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
