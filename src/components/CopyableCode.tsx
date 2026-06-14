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
      // fallback: select the text
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
          className="text-[13px] text-white/90 bg-black/40 border border-indigo-500/20 rounded-lg p-3 pr-20 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed mb-1.5"
          dir="ltr"
        >
{code}
        </pre>
        <button
          onClick={() => copy(code, "main")}
          className={`absolute top-2 left-2 px-2.5 py-1 text-[11px] font-mono rounded-md border transition-all ${
            copied === "main"
              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
              : "bg-white/[0.04] border-white/[0.08] text-white/70 hover:bg-white/[0.08] hover:text-white"
          }`}
          title="העתק"
        >
          {copied === "main" ? "✓ הועתק" : "העתק"}
        </button>
      </div>
      {alt && (
        <div className="flex items-center gap-2">
          <div className="text-[10px] text-[var(--fg-muted)] font-mono flex-1 truncate" dir="ltr">
            או: {alt}
          </div>
          <button
            onClick={() => copy(alt, "alt")}
            className={`shrink-0 px-2 py-0.5 text-[10px] font-mono rounded border transition-all ${
              copied === "alt"
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                : "bg-white/[0.03] border-white/[0.06] text-white/60 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            {copied === "alt" ? "✓" : "העתק"}
          </button>
        </div>
      )}
    </div>
  );
}
