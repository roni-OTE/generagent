"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export default function NewChatButton({ children, className, style }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function start() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/consult/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.consultation_id) {
        router.push(`/consult/${data.consultation_id}`);
      } else {
        setBusy(false);
      }
    } catch {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={start}
      disabled={busy}
      className={className}
      style={style}
    >
      {busy ? "פותח..." : children}
    </button>
  );
}
