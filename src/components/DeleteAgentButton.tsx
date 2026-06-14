"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { packageId: string; agentName: string };

export default function DeleteAgentButton({ packageId, agentName }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`למחוק את הסוכן "${agentName}"? (אי אפשר לשחזר)`)) return;
    setBusy(true);
    try {
      await fetch(`/api/packages/${packageId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      aria-label="מחיקת סוכן"
      title="מחיקה"
      className="absolute top-3 left-3 w-7 h-7 rounded-md flex items-center justify-center text-white/30 hover:text-red-300 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all z-10"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
      </svg>
    </button>
  );
}
