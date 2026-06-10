"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Orb from "@/components/Orb";
import Button from "@/components/Button";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const e = params.get("error");
    const d = params.get("detail");
    if (e) setErr(d ? `${e} — ${d}` : e);
  }, [params]);

  async function signInWithGoogle() {
    setBusy("google");
    setErr(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setErr(error.message);
      setBusy(null);
    }
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setBusy("email");
    setErr(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setErr(error.message);
      setBusy(null);
      return;
    }
    setEmailSent(true);
    setBusy(null);
  }

  return (
    <>
      <nav className="backdrop-blur-[20px] bg-[rgba(2,2,3,0.6)] border-b border-[var(--border)] py-3.5">
        <div className="max-w-[1180px] mx-auto px-6 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 text-[var(--fg)] no-underline">
            <span
              style={{
                width: 26, height: 26, borderRadius: 7,
                background: "linear-gradient(135deg, var(--indigo), var(--magenta))",
                boxShadow: "0 0 14px rgba(94,106,210,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 800, fontSize: 13,
              }}
            >G</span>
            <span className="font-bold text-[15px]">GenerAgent</span>
          </Link>
          <Link href="/"><Button variant="ghost" size="sm">חזרה</Button></Link>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px]">
          <div className="flex justify-center mb-6">
            <div className="w-[100px] h-[100px] relative">
              <Orb size="hero" cursorFollow={false} />
              <style>{`.orb-hero { width: 100px !important; height: 100px !important; }`}</style>
            </div>
          </div>

          <div className="bg-[var(--bg-elev)] border border-[var(--border)] rounded-[24px] p-9 relative overflow-hidden">
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent 20%, rgba(255,255,255,0.18) 50%, transparent 80%)" }}
            />

            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 font-mono text-[10px] text-[var(--indigo-text)] uppercase tracking-[0.12em] mb-3">
                <span className="w-1 h-px bg-[var(--indigo-text)]" /> step 01 of 03 · sign in
              </div>
              <h1 className="text-[24px] font-bold tracking-[-0.02em] mb-2 bg-gradient-to-b from-white to-[#B0B5C0] bg-clip-text text-transparent">
                בוא נכיר
              </h1>
              <p className="text-[var(--fg-dim)] text-[14px]">חיבור מהיר עם Google או Email.</p>
            </div>

            {emailSent ? (
              <div className="text-center py-6 px-2">
                <div className="text-[var(--success)] font-mono text-[11px] uppercase tracking-[0.1em] mb-3">✓ נשלח</div>
                <p className="text-[var(--fg)] text-[15px] mb-2">בדוק את המייל שלך</p>
                <p className="text-[var(--fg-dim)] text-[13px]">לחץ על הקישור ב-<strong>{email}</strong> כדי להמשיך.</p>
                <button
                  onClick={() => { setEmailSent(false); setEmail(""); }}
                  className="mt-5 text-[12px] text-[var(--indigo-text)] hover:text-[var(--indigo-bright)]"
                >שלח שוב לכתובת אחרת</button>
              </div>
            ) : (
              <>
                <Button
                  variant="google"
                  size="md"
                  className="w-full mb-3"
                  onClick={signInWithGoogle}
                  disabled={busy !== null}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                    <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                  </svg>
                  {busy === "google" ? "מתחבר..." : "המשך עם Google"}
                </Button>

                <div className="flex items-center gap-3 my-4 text-[var(--fg-muted)] font-mono text-[11px] uppercase tracking-[0.2em]">
                  <div className="flex-1 h-px bg-[var(--border)]" />או<div className="flex-1 h-px bg-[var(--border)]" />
                </div>

                <form onSubmit={sendMagicLink} className="flex flex-col gap-2">
                  <label className="font-mono text-[11px] text-[var(--fg-dim)] uppercase tracking-[0.08em]">→ email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={busy !== null}
                    className="bg-[var(--bg-deep)] border border-[var(--border-strong)] rounded-[10px] px-3.5 py-3 text-[14px] text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--indigo)] focus:shadow-[0_0_0_3px_rgba(94,106,210,0.15)] transition-all"
                  />
                  <Button type="submit" variant="secondary" size="md" className="w-full" disabled={busy !== null || !email}>
                    {busy === "email" ? "שולח..." : "שלח קישור התחברות"}
                  </Button>
                </form>
              </>
            )}

            {err && (
              <div className="mt-4 p-3 bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.3)] rounded-[10px] text-[12px] text-[var(--danger)]">
                ⚠ {err}
              </div>
            )}

            <p className="text-center text-[var(--fg-muted)] text-[11px] mt-5">
              בלחיצה אתה מסכים ל<Link href="/legal/terms" className="text-[var(--indigo-text)] hover:text-[var(--indigo-bright)]">תנאי השימוש</Link>
              {" "}ול<Link href="/legal/privacy" className="text-[var(--indigo-text)] hover:text-[var(--indigo-bright)]">מדיניות הפרטיות</Link>.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
