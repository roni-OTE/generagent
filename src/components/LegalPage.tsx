import Link from "next/link";
import Button from "./Button";
import { ReactNode } from "react";

interface LegalPageProps {
  title: string;
  version: string;
  effectiveDate: string;
  children: ReactNode;
}

export default function LegalPage({ title, version, effectiveDate, children }: LegalPageProps) {
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
            >
              G
            </span>
            <span className="font-bold text-[15px]">GenerAgent</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">חזרה לדף הבית</Button>
          </Link>
        </div>
      </nav>

      <main className="max-w-[760px] mx-auto px-6 py-16 flex-1">
        <div className="font-mono text-[11px] text-[var(--indigo-text)] uppercase tracking-[0.12em] mb-3">
          legal · {version} · effective {effectiveDate}
        </div>
        <h1 className="text-[clamp(32px,4vw,44px)] font-bold tracking-[-0.025em] leading-[1.1] mb-10 bg-gradient-to-b from-white to-[#B0B5C0] bg-clip-text text-transparent">
          {title}
        </h1>
        <article className="prose-content">{children}</article>
      </main>

      <footer className="border-t border-[var(--border)] py-4 font-mono text-[11px] text-[var(--fg-muted)] flex-shrink-0">
        <div className="max-w-[1180px] mx-auto px-6 flex justify-between items-center gap-4 flex-wrap">
          <div>© 2026 GenerAgent · OTE Group</div>
          <div className="flex gap-5">
            <Link href="/legal/terms" className="text-[var(--fg-muted)] no-underline hover:text-[var(--fg-dim)]">תנאי שימוש</Link>
            <Link href="/legal/privacy" className="text-[var(--fg-muted)] no-underline hover:text-[var(--fg-dim)]">פרטיות</Link>
            <Link href="/docs" className="text-[var(--fg-muted)] no-underline hover:text-[var(--fg-dim)]">תיעוד</Link>
          </div>
        </div>
      </footer>

      <style>{`
        .prose-content h2 {
          font-size: 20px; font-weight: 700; color: var(--fg);
          margin: 32px 0 12px;
          letter-spacing: -0.015em;
        }
        .prose-content h2:first-child { margin-top: 0; }
        .prose-content p {
          color: var(--fg-dim);
          font-size: 15px;
          line-height: 1.75;
          margin-bottom: 12px;
        }
        .prose-content strong { color: var(--fg); font-weight: 600; }
        .prose-content ul {
          color: var(--fg-dim);
          font-size: 15px;
          line-height: 1.75;
          padding-right: 22px;
          margin-bottom: 12px;
        }
        .prose-content li { margin-bottom: 6px; }
        .prose-content code {
          font-family: var(--font-mono), 'JetBrains Mono', monospace;
          font-size: 12px;
          background: var(--bg-deep);
          color: var(--magenta);
          padding: 2px 6px;
          border-radius: 4px;
          direction: ltr;
          display: inline-block;
        }
      `}</style>
    </>
  );
}
