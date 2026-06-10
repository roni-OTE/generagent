import Orb from "./Orb";
import Button from "./Button";
import Link from "next/link";

interface ComingSoonProps {
  eyebrow?: string;
  title: string;
  description: string;
  back?: { label: string; href: string };
}

/**
 * Reusable "Coming soon" stage for unbuilt routes during MVP buildout.
 * Same aurora aesthetic as Landing — small orb + headline + back link.
 */
export default function ComingSoon({
  eyebrow = "coming soon",
  title,
  description,
  back = { label: "חזרה לדף הבית", href: "/" },
}: ComingSoonProps) {
  return (
    <>
      <nav className="backdrop-blur-[20px] bg-[rgba(2,2,3,0.6)] border-b border-[var(--border)] py-3.5">
        <div className="max-w-[1180px] mx-auto px-6 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 text-[var(--fg)] no-underline">
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                background: "linear-gradient(135deg, var(--indigo), var(--magenta))",
                boxShadow: "0 0 14px rgba(94,106,210,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              G
            </span>
            <span className="font-bold text-[15px] tracking-[-0.005em]">GenerAgent</span>
          </Link>
          <Link href={back.href}>
            <Button variant="ghost" size="sm">
              {back.label}
            </Button>
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6 py-12 text-center">
        <div className="max-w-[520px]">
          <div className="flex justify-center mb-8">
            <div className="relative w-[140px] h-[140px]">
              <Orb size="hero" cursorFollow={false} />
              <style>{`.orb-hero { width: 140px !important; height: 140px !important; }`}</style>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 font-mono text-[11px] text-[var(--indigo-text)] bg-[rgba(94,106,210,0.08)] border border-[rgba(94,106,210,0.25)] rounded-[20px] px-3 py-1.5 mb-6 uppercase tracking-[0.1em]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--magenta)] shadow-[0_0_10px_var(--magenta)]" />
            {eyebrow}
          </div>

          <h1 className="text-[clamp(28px,4vw,40px)] font-bold tracking-[-0.025em] leading-[1.1] mb-4 bg-gradient-to-b from-white to-[#B0B5C0] bg-clip-text text-transparent">
            {title}
          </h1>

          <p className="text-[var(--fg-dim)] text-[15px] leading-[1.6] mb-8">{description}</p>

          <Link href={back.href}>
            <Button variant="primary" size="lg">
              <span className="inline-block">←</span> {back.label}
            </Button>
          </Link>
        </div>
      </main>

      <footer className="border-t border-[var(--border)] py-4 font-mono text-[11px] text-[var(--fg-muted)] flex-shrink-0">
        <div className="max-w-[1180px] mx-auto px-6 flex justify-between items-center gap-4 flex-wrap">
          <div>© 2026 GenerAgent · OTE Group</div>
          <div className="flex gap-5">
            <Link href="/legal/terms" className="text-[var(--fg-muted)] no-underline hover:text-[var(--fg-dim)] transition-colors">
              תנאי שימוש
            </Link>
            <Link href="/legal/privacy" className="text-[var(--fg-muted)] no-underline hover:text-[var(--fg-dim)] transition-colors">
              פרטיות
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
