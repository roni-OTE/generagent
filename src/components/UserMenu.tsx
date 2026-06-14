"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Props = {
  email: string;
  displayName: string | null;
  isAdmin?: boolean;
};

export default function UserMenu({ email, displayName, isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const initial = (displayName?.[0] || email[0] || "?").toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="תפריט משתמש"
        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-[12px] border border-white/[0.12] hover:border-white/[0.25] transition-colors"
        style={{ background: "linear-gradient(135deg, var(--indigo), var(--magenta))" }}
        title={email}
      >
        {initial}
      </button>

      {open && (
        <div
          className="absolute left-0 mt-2 w-[220px] rounded-xl border border-[var(--border)] bg-[rgba(8,8,12,0.95)] backdrop-blur-[16px] shadow-[0_20px_60px_rgba(0,0,0,0.55)] z-50 overflow-hidden"
          dir="rtl"
        >
          <div className="px-3 py-2.5 border-b border-[var(--border)]">
            <div className="text-[13px] text-white truncate">{displayName || email}</div>
            <div className="text-[11px] text-[var(--fg-muted)] truncate" dir="ltr">{email}</div>
          </div>

          <div className="py-1">
            <MenuItem href="/dashboard" icon="→">לדאשבורד</MenuItem>
            <MenuItem href="/account" icon="◉">החשבון שלי</MenuItem>
            {isAdmin && (
              <MenuItem href="/admin" icon="★" highlight>admin console</MenuItem>
            )}
          </div>

          <form action="/api/auth/signout" method="post" className="border-t border-[var(--border)]">
            <button
              type="submit"
              className="w-full text-right px-3 py-2.5 text-[13px] text-[var(--fg-dim)] hover:bg-white/[0.04] hover:text-white transition-colors flex items-center gap-2"
            >
              <span className="text-[var(--fg-muted)]">↩</span>
              <span>התנתק</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  href,
  icon,
  children,
  highlight,
}: {
  href: string;
  icon: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`w-full px-3 py-2 text-[13px] hover:bg-white/[0.04] transition-colors flex items-center gap-2 no-underline ${
        highlight ? "text-[var(--magenta)]" : "text-[var(--fg-dim)] hover:text-white"
      }`}
    >
      <span className={highlight ? "" : "text-[var(--fg-muted)]"}>{icon}</span>
      <span>{children}</span>
    </Link>
  );
}
