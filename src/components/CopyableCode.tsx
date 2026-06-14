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
      <div
        className="rounded-lg border border-indigo-500/20 bg-black/40 overflow-hidden mb-1.5"
        dir="ltr"
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.06] bg-white/[0.02]">
          <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--indigo-text)]">
            {label ?? "bash"}
          </span>
          <button
            onClick={() => copy(code, "main")}
            aria-label="העתק"
            title={copied === "main" ? "הועתק" : "העתק"}
            className={`p-1 rounded transition-colors ${
              copied === "main" ? "text-emerald-300" : "text-white/40 hover:text-white"
            }`}
          >
            {copied === "main" ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>

        {/* Code */}
        <pre className="text-[13px] text-white/90 px-3 py-2.5 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
{code}
        </pre>
      </div>

      {alt && (
        <div className="flex items-center gap-2" dir="ltr">
          <div className="text-[10px] text-[var(--fg-muted)] font-mono flex-1 truncate">
            או: {alt}
          </div>
          <button
            onClick={() => copy(alt, "alt")}
            aria-label="העתק אלטרנטיבה"
            title={copied === "alt" ? "הועתק" : "העתק"}
            className={`shrink-0 p-0.5 rounded transition-colors ${
              copied === "alt" ? "text-emerald-300" : "text-white/40 hover:text-white"
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
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
