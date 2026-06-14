"use client";

import { useState } from "react";

type Props = {
  code: string;
  label?: string;
  alt?: string;
};

export default function CopyableCode({ code, label, alt }: Props) {
  const [copied, setCopied] = useState<"main" | "alt" | null>(null);

  async function copy(text: string, which: "main" | "alt") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      try { document.execCommand("copy"); setCopied(which); setTimeout(() => setCopied(null), 1600); } catch {}
      document.body.removeChild(el);
    }
  }

  return (
    <div>
      {label && (
        <div className="text-[11px] text-[var(--indigo-text)] uppercase tracking-[0.1em] mb-1.5">
          {label}
        </div>
      )}
      <div className="relative">
        <pre
          className="text-[13px] text-white/90 bg-black/40 border border-indigo-500/20 rounded-lg py-3 pl-3 pr-12 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed mb-1.5"
          dir="ltr"
        >
{code}
        </pre>
        <button
          onClick={() => copy(code, "main")}
          aria-label="העתק פקודה"
          title={copied === "main" ? "הועתק" : "העתק"}
          className={`absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-md border transition-all ${
            copied === "main"
              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
              : "bg-white/[0.04] border-white/[0.08] text-white/60 hover:bg-white/[0.08] hover:text-white"
          }`}
        >
          {copied === "main" ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>
      {alt && (
        <div className="flex items-center gap-2">
          <div className="text-[10px] text-[var(--fg-muted)] font-mono flex-1 truncate" dir="ltr">
            או: {alt}
          </div>
          <button
            onClick={() => copy(alt, "alt")}
            aria-label="העתק אלטרנטיבה"
            title={copied === "alt" ? "הועתק" : "העתק"}
            className={`shrink-0 w-6 h-6 flex items-center justify-center rounded border transition-all ${
              copied === "alt"
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                : "bg-white/[0.03] border-white/[0.06] text-white/50 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            {copied === "alt" ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>
      )}
    </div>
  );
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
