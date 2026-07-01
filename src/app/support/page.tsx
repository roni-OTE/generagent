"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import Logo from "@/components/Logo";

export default function SupportPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ escalated: boolean } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !message.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/support/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          subject: subject.trim(),
          message: message.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "משהו השתבש");
      } else {
        setDone({ escalated: !!data.escalated });
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

      <main className="flex-1 flex items-start justify-center px-6 py-12">
        <div className="w-full max-w-[520px]" dir="rtl">
          <div className="bg-[var(--bg-elev)] border border-[var(--border)] rounded-[24px] p-9 relative overflow-hidden">
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent 20%, rgba(255,255,255,0.18) 50%, transparent 80%)" }}
            />

            {done ? (
              <div className="text-center py-4">
                <div className="text-[var(--success)] font-mono text-[11px] uppercase tracking-[0.1em] mb-3">
                  ✓ נשלח
                </div>
                <h2 className="text-[22px] font-bold mb-3">קיבלנו את הפנייה שלך</h2>
                <p className="text-[var(--fg-dim)] text-[14px] leading-relaxed mb-4">
                  {done.escalated ? (
                    <>דנה קראה את הפנייה שלך וסימנה אותה לרוני. הוא יחזור אליך תוך 24 שעות במייל.</>
                  ) : (
                    <>דנה כבר שלחה לך תשובה למייל. בדוק את התיבה שלך (וגם את הספאם ליתר ביטחון).</>
                  )}
                </p>
                <Link href="/">
                  <Button variant="secondary" size="md">חזרה לעמוד הבית</Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 font-mono text-[10px] text-[var(--indigo-text)] uppercase tracking-[0.12em] mb-3">
                    <span className="w-1 h-px bg-[var(--indigo-text)]" /> support
                  </div>
                  <h1 className="text-[24px] font-bold tracking-[-0.02em] mb-2 bg-gradient-to-b from-white to-[#B0B5C0] bg-clip-text text-transparent">
                    צריך עזרה? כתוב לדנה
                  </h1>
                  <p className="text-[var(--fg-dim)] text-[13px] leading-relaxed">
                    דנה מהצוות שלנו קוראת את כל הפניות ועונה במייל תוך כמה דקות.
                    לשאלות מוצריות עמוקות היא מעבירה לרוני אישית.
                  </p>
                  <p className="text-[11px] text-[var(--fg-muted)] mt-3 font-mono" dir="ltr">
                    or write to{" "}
                    <a href="mailto:support@generagent.io" className="text-[var(--indigo-text)] hover:text-[var(--indigo-bright)]">
                      support@generagent.io
                    </a>
                  </p>
                </div>

                <form onSubmit={submit} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  </div>

                  <div>
                    <label className="font-mono text-[11px] text-[var(--fg-dim)] uppercase tracking-[0.08em] block mb-1.5">→ נושא (אופציונלי)</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="לדוגמה: לא מצליח להתקין את הסוכן"
                      disabled={busy}
                      className="w-full bg-[var(--bg-deep)] border border-[var(--border-strong)] rounded-[10px] px-3.5 py-3 text-[14px] text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--indigo)] focus:shadow-[0_0_0_3px_rgba(94,106,210,0.15)] transition-all"
                    />
                  </div>

                  <div>
                    <label className="font-mono text-[11px] text-[var(--fg-dim)] uppercase tracking-[0.08em] block mb-1.5">→ ההודעה שלך</label>
                    <textarea
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="פרט את השאלה או הבעיה, ככל שיותר מדויק — כך התשובה תהיה טובה יותר"
                      rows={6}
                      disabled={busy}
                      className="w-full bg-[var(--bg-deep)] border border-[var(--border-strong)] rounded-[10px] px-3.5 py-3 text-[14px] text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--indigo)] focus:shadow-[0_0_0_3px_rgba(94,106,210,0.15)] transition-all resize-y"
                    />
                  </div>

                  {err && (
                    <div className="p-3 bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.3)] rounded-[10px] text-[12px] text-[var(--danger)]">
                      ⚠ {err}
                    </div>
                  )}

                  <Button type="submit" variant="primary" size="md" className="w-full" disabled={busy || !email.trim() || !message.trim()}>
                    {busy ? "דנה כותבת תשובה..." : "שלח לדנה"}
                  </Button>
                  <p className="text-[10px] text-[var(--fg-muted)] text-center">
                    דנה תענה תוך שניות במייל. עד 3 פניות בשעה מאותה כתובת.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
