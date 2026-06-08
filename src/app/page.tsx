import Orb from "@/components/Orb";
import Button from "@/components/Button";
import Link from "next/link";

export default function Home() {
  return (
    <>
      {/* NAV */}
      <nav className="backdrop-blur-[20px] bg-[rgba(2,2,3,0.6)] border-b border-[var(--border)] py-3.5">
        <div className="max-w-[1180px] mx-auto px-6 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-[var(--fg)] no-underline"
          >
            <span className="brand-mark">G</span>
            <span className="font-bold text-[15px] tracking-[-0.005em]">
              GenerAgent
            </span>
          </Link>
          <div className="flex gap-2 items-center">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                התחבר
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="primary" size="sm">
                התחל <span className="inline-block">←</span>
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <main className="max-w-[1180px] mx-auto px-6 flex-1 grid grid-cols-1 md:grid-cols-2 items-center gap-12 py-10 md:py-0 text-center md:text-right">
        <div className="max-w-[480px] mx-auto md:mx-0">
          <div className="inline-flex items-center gap-2 font-mono text-[11px] text-[var(--indigo-text)] bg-[rgba(94,106,210,0.08)] border border-[rgba(94,106,210,0.25)] rounded-[20px] px-3 py-1.5 mb-6 uppercase tracking-[0.1em]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--indigo)] shadow-[0_0_10px_var(--indigo)]" />
            agent consulting · v1.0
          </div>
          <h1 className="text-[clamp(38px,5.5vw,64px)] font-bold tracking-[-0.032em] leading-[1.02] mb-5 bg-gradient-to-b from-white to-[#B0B5C0] bg-clip-text text-transparent">
            איזה סוכן AI<br />
            <span className="bg-gradient-to-r from-[var(--indigo-bright)] to-[var(--magenta)] bg-clip-text text-transparent">
              אתה באמת צריך?
            </span>
          </h1>
          <p className="text-[var(--fg-dim)] text-[clamp(15px,1.3vw,17px)] leading-[1.6] mb-8">
            ליצור סוכן זה קל. להבין{" "}
            <strong className="text-[var(--fg)]">איזה</strong> סוכן יעזור לך — זו השאלה.
            נראיין אותך כיועץ, נאפיין את הצרכים, ונמסור חבילת התקנה מוכנה ל-Claude
            Code או Codex CLI.
          </p>
          <div className="flex gap-2.5 flex-wrap items-center justify-center md:justify-start mb-6">
            <Link href="/consult">
              <Button variant="primary" size="lg">
                התחל ייעוץ <span className="inline-block">←</span>
              </Button>
            </Link>
          </div>
          <div className="flex gap-5 flex-wrap justify-center md:justify-start font-mono text-[11px] text-[var(--fg-muted)]">
            <span className="meta-dot">ראיון בעברית · 5 דק׳</span>
            <span className="meta-dot">חבילת ZIP להורדה</span>
            <span className="meta-dot">חינם להתחיל</span>
          </div>
        </div>

        <div className="relative flex items-center justify-center min-h-[280px] md:min-h-[380px]">
          <Orb size="hero" cursorFollow />
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[var(--border)] py-4 font-mono text-[11px] text-[var(--fg-muted)] flex-shrink-0">
        <div className="max-w-[1180px] mx-auto px-6 flex justify-between items-center gap-4 flex-wrap">
          <div>© 2026 GenerAgent · OTE Group</div>
          <div className="flex gap-5">
            <Link
              href="/legal/terms"
              className="text-[var(--fg-muted)] no-underline hover:text-[var(--fg-dim)] transition-colors"
            >
              תנאי שימוש
            </Link>
            <Link
              href="/legal/privacy"
              className="text-[var(--fg-muted)] no-underline hover:text-[var(--fg-dim)] transition-colors"
            >
              פרטיות
            </Link>
            <Link
              href="/docs"
              className="text-[var(--fg-muted)] no-underline hover:text-[var(--fg-dim)] transition-colors"
            >
              תיעוד
            </Link>
          </div>
        </div>
      </footer>

      <style>{`
        .brand-mark {
          width: 26px; height: 26px; border-radius: 7px;
          background: linear-gradient(135deg, var(--indigo), var(--magenta));
          box-shadow: 0 0 14px rgba(94,106,210,0.4);
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-weight: 800; font-size: 13px;
        }
        .meta-dot {
          display: inline-flex; align-items: center; gap: 6px;
        }
        .meta-dot::before {
          content: '';
          width: 4px; height: 4px;
          border-radius: 50%;
          background: var(--success);
          box-shadow: 0 0 6px var(--success);
        }
      `}</style>
    </>
  );
}
