"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";

type Chat = {
  id: string;
  status: string;
  phase: string;
  question_count: number;
  detected_persona: string | null;
  created_at: string;
  title: string | null;
  preview: string | null;
};

type Props = {
  userEmail: string;
  displayName: string | null;
  isAdmin: boolean;
  activeChatId?: string;
  children: React.ReactNode;
};

export default function WorkspaceShell({
  userEmail,
  displayName,
  isAdmin,
  activeChatId,
  children,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [chats, setChats] = useState<Chat[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    void loadChats();
  }, [pathname]);

  async function loadChats() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: rows } = await supabase
      .from("consultations")
      .select("id, status, phase, question_count, detected_persona, created_at, title")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!rows) return;

    // Fetch first user message as preview
    const ids = rows.map((r) => r.id);
    const { data: msgs } = await supabase
      .from("messages")
      .select("consultation_id, content, role")
      .in("consultation_id", ids)
      .eq("role", "user")
      .order("created_at", { ascending: true });

    const previewMap = new Map<string, string>();
    msgs?.forEach((m) => {
      if (!previewMap.has(m.consultation_id)) {
        previewMap.set(m.consultation_id, m.content);
      }
    });

    setChats(
      rows.map((r) => ({
        ...r,
        preview: previewMap.get(r.id) || null,
      }))
    );
  }

  async function deleteChat(chatId: string) {
    if (!confirm("למחוק את השיחה הזו? (אי אפשר לשחזר)")) return;
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    await fetch(`/api/consultations/${chatId}`, { method: "DELETE" });
    if (activeChatId === chatId) {
      router.push("/dashboard");
    }
  }

  async function renameChat(chatId: string, current: string | null) {
    const next = prompt("שם חדש לשיחה:", current ?? "");
    if (next === null) return; // cancelled
    const cleaned = next.trim().slice(0, 120);
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, title: cleaned || null } : c)));
    await fetch(`/api/consultations/${chatId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: cleaned }),
    });
  }

  async function createNewChat() {
    setCreating(true);
    try {
      const res = await fetch("/api/consult/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.consultation_id) {
        router.push(`/consult/${data.consultation_id}`);
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen flex" dir="rtl">
      {/* SIDEBAR — right side in RTL */}
      <aside className="w-[260px] shrink-0 border-l border-[var(--border)] bg-[rgba(2,2,3,0.4)] flex flex-col">
        {/* logo + new chat */}
        <div className="px-4 pt-4 pb-3 border-b border-[var(--border)]">
          <Link href="/dashboard" className="flex items-center gap-2 mb-4 no-underline">
            <Logo size="sm" />
          </Link>
          <button
            onClick={createNewChat}
            disabled={creating}
            className="w-full px-3 py-2.5 rounded-lg text-[13px] font-medium text-white transition-opacity disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #5E6AD2, #B867FF)" }}
          >
            {creating ? "פותח..." : "+ שיחה חדשה"}
          </button>
        </div>

        {/* chats list */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {chats.length === 0 ? (
            <div className="px-3 py-4 text-[12px] text-[var(--fg-muted)]">
              אין עדיין שיחות. תתחיל אחת חדשה ↑
            </div>
          ) : (
            chats.map((chat) => (
              <div key={chat.id} className="group relative">
                <Link
                  href={`/consult/${chat.id}`}
                  className={`block px-3 py-2 pr-14 rounded-lg text-[13px] transition-colors no-underline ${
                    activeChatId === chat.id
                      ? "bg-[rgba(94,106,210,0.12)] text-white"
                      : "text-[var(--fg-dim)] hover:bg-[var(--surface)] hover:text-[var(--fg)]"
                  }`}
                >
                  <div className="truncate">
                    {chat.title ?? (chat.preview ? truncate(chat.preview, 36) : "שיחה חדשה")}
                  </div>
                  <div className="text-[10px] text-[var(--fg-muted)] mt-0.5 flex items-center gap-2">
                    <span>{chat.question_count} שאלות</span>
                    {chat.status === "completed" && <span className="text-[var(--success)]">✓ הושלמה</span>}
                    {chat.status === "in_progress" && <span>פעילה</span>}
                    {chat.status === "analyzing" && <span className="text-amber-300/80">מאפיין…</span>}
                  </div>
                </Link>
                {/* Hover actions */}
                <div className="absolute top-1.5 left-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.preventDefault(); void renameChat(chat.id, chat.title); }}
                    className="w-6 h-6 rounded flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06]"
                    title="שינוי שם"
                    aria-label="שינוי שם"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); void deleteChat(chat.id); }}
                    className="w-6 h-6 rounded flex items-center justify-center text-white/40 hover:text-red-300 hover:bg-red-500/10"
                    title="מחיקה"
                    aria-label="מחיקה"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* footer */}
        <div className="border-t border-[var(--border)] px-2 py-2">
          <Link
            href="/account"
            className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-[var(--surface)] transition-colors no-underline"
          >
            <div
              className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-white font-semibold text-[11px]"
              style={{ background: "linear-gradient(135deg, var(--indigo), var(--magenta))" }}
              title={userEmail}
            >
              {(displayName?.[0] || userEmail[0] || "?").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] text-white truncate">{displayName || userEmail}</div>
              <div className="text-[10px] text-[var(--fg-muted)]">החשבון שלי →</div>
            </div>
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-2 px-2 py-1.5 mt-1 rounded-lg text-[11px] text-[var(--magenta)] hover:bg-[rgba(192,132,252,0.08)] transition-colors no-underline"
            >
              <span>★</span>
              <span>admin console</span>
            </Link>
          )}
        </div>
      </aside>

      {/* CENTER */}
      <main className="flex-1 min-w-0 flex flex-col">{children}</main>
    </div>
  );
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n) + "…";
}
