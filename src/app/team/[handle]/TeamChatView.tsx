"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Message = {
  id: string;
  role: "user" | "agent";
  content: string;
  created_at: string;
};

type Props = {
  agent: { handle: string; name: string; role: string };
  chatId: string;
  activeChats: { id: string; title: string | null; updated_at: string }[];
  initialMessages: Message[];
};

export default function TeamChatView({ agent, chatId, activeChats, initialMessages }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    setErr(null);
    const optimistic: Message = {
      id: "tmp-" + Date.now(),
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setDraft("");

    try {
      const res = await fetch(`/api/team/chat/${chatId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "send_failed");
      if (data.agent_reply) {
        setMessages((m) => [
          ...m,
          { id: data.agent_reply.id ?? "tmp-r", role: "agent", content: data.agent_reply.content, created_at: data.agent_reply.created_at ?? new Date().toISOString() },
        ]);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  async function newChat() {
    setBusy(true);
    try {
      const res = await fetch("/api/team/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_handle: agent.handle }),
      });
      const data = await res.json();
      if (data.id) router.push(`/team/${agent.handle}?chat=${data.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex" dir="rtl">
      {/* Sidebar — chats with this agent */}
      <aside className="w-[240px] shrink-0 border-l border-[var(--border)] bg-[rgba(2,2,3,0.4)] flex flex-col hidden md:flex">
        <div className="px-4 pt-4 pb-3 border-b border-[var(--border)]">
          <Link href="/team" className="text-[11px] text-[var(--fg-dim)] hover:text-white font-mono">
            ← כל הצוות
          </Link>
          <div className="mt-3 text-[14px] font-bold text-white">{agent.name}</div>
          <div className="text-[11px] text-[var(--fg-muted)] font-mono">@{agent.handle}</div>
          <button
            onClick={newChat}
            disabled={busy}
            className="w-full mt-3 px-3 py-2 rounded-lg text-[12px] font-medium text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #5E6AD2, #B867FF)" }}
          >
            + שיחה חדשה
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {activeChats.length === 0 ? (
            <div className="px-3 py-3 text-[11px] text-[var(--fg-muted)]">אין שיחות פתוחות</div>
          ) : (
            activeChats.map((c) => (
              <Link
                key={c.id}
                href={`/team/${agent.handle}?chat=${c.id}`}
                className={`block px-3 py-2 rounded-lg text-[12px] no-underline ${chatId === c.id ? "bg-[rgba(94,106,210,0.12)] text-white" : "text-[var(--fg-dim)] hover:bg-[var(--surface)] hover:text-white"}`}
              >
                <div className="truncate">{c.title ?? "שיחה חדשה"}</div>
                <div className="text-[10px] text-[var(--fg-muted)] mt-0.5">
                  {new Date(c.updated_at).toLocaleDateString("he-IL")}
                </div>
              </Link>
            ))
          )}
        </div>
      </aside>

      {/* Main chat */}
      <main className="flex-1 min-w-0 flex flex-col h-screen">
        <header className="border-b border-white/[0.06] px-4 md:px-6 py-3 flex items-center justify-between">
          <div>
            <div className="text-[14px] font-semibold text-white">{agent.name}</div>
            <div className="text-[11px] text-[var(--fg-muted)] font-mono">{agent.role}</div>
          </div>
          <Link href="/team" className="text-[11px] text-[var(--fg-dim)] hover:text-white font-mono md:hidden">
            ← צוות
          </Link>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
          <div className="max-w-2xl mx-auto space-y-4">
            {messages.length === 0 && !busy && (
              <div className="text-center py-12 text-[13px] text-[var(--fg-muted)]">
                כתוב הודעה כדי להתחיל לדבר עם {agent.name.split(" — ")[0]}.
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={m.role === "user" ? "flex justify-start" : "flex justify-end"}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[80%] bg-white/[0.04] border border-white/[0.06] rounded-2xl px-4 py-3 text-sm text-white/90"
                      : "max-w-[80%] rounded-2xl px-4 py-3 text-sm"
                  }
                  style={
                    m.role === "agent"
                      ? {
                          background: "linear-gradient(135deg, rgba(94,106,210,0.10), rgba(184,103,255,0.06))",
                          border: "1px solid rgba(94,106,210,0.18)",
                          color: "rgba(255,255,255,0.92)",
                        }
                      : undefined
                  }
                >
                  <div className="text-[10px] font-mono mb-1 opacity-60">
                    {m.role === "user" ? "אתה" : agent.name.split(" — ")[0]} ·{" "}
                    {new Date(m.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="leading-relaxed whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-end">
                <div className="text-xs text-white/40 px-4 py-3">{agent.name.split(" — ")[0]} כותב/ת…</div>
              </div>
            )}
            {err && (
              <div className="text-xs text-red-300/80 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {err}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-white/[0.06] px-4 md:px-6 py-3">
          <div className="max-w-2xl mx-auto flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              disabled={busy}
              rows={1}
              placeholder={`כתוב ל-${agent.name.split(" — ")[0]}... (Enter לשליחה)`}
              className="flex-1 resize-none bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-indigo-400/40 disabled:opacity-50"
              style={{ maxHeight: "120px" }}
            />
            <button
              onClick={() => void send()}
              disabled={busy || !draft.trim()}
              className="px-4 py-3 rounded-xl text-sm font-medium text-white disabled:opacity-30"
              style={{ background: "linear-gradient(135deg, #5E6AD2, #B867FF)" }}
            >
              שלח
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
