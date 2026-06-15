"use client";

import { useState } from "react";

type ThreadMessage = {
  role: "user" | "tamar";
  text: string;
  at: string;
};

type Props = {
  standupId: string;
  decisionIndex: number;
  decisionText: string;
  initialThread?: ThreadMessage[] | null;
};

export default function DecisionReply({
  standupId,
  decisionIndex,
  decisionText,
  initialThread,
}: Props) {
  const [thread, setThread] = useState<ThreadMessage[]>(initialThread ?? []);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    setErr(null);
    const optimistic: ThreadMessage = {
      role: "user",
      text,
      at: new Date().toISOString(),
    };
    setThread((prev) => [...prev, optimistic]);
    setDraft("");

    try {
      const res = await fetch(`/api/team/standups/${standupId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision_index: decisionIndex, response: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "send_failed");
      if (Array.isArray(data.thread)) setThread(data.thread);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "שגיאה");
      setThread((prev) => prev.slice(0, -1));
      setDraft(text);
    } finally {
      setBusy(false);
    }
  }

  async function catchUp() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/team/standups/${standupId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision_index: decisionIndex, catch_up: true }),
      });
      const data = await res.json();
      if (!res.ok && data.error !== "nothing_to_catch_up") {
        throw new Error(data.error || "catchup_failed");
      }
      if (Array.isArray(data.thread)) setThread(data.thread);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  }

  const lastMsg = thread[thread.length - 1];
  const needsCatchUp = lastMsg && lastMsg.role === "user";

  return (
    <div className="border-t border-white/[0.06] pt-4 mt-4 first:border-t-0 first:pt-0 first:mt-0">
      {/* Decision line */}
      <div className="flex gap-2 text-[14px] text-white/90 mb-3">
        <span className="text-amber-300/60 mt-0.5 shrink-0">▸</span>
        <span className="flex-1">{decisionText}</span>
      </div>

      {/* Thread */}
      {thread.length > 0 && (
        <div className="mr-6 mb-3 space-y-2">
          {thread.map((m, i) => (
            <Bubble key={i} message={m} />
          ))}
          {busy && (
            <div className="text-[11px] text-white/40 px-3 py-2">תמר כותבת…</div>
          )}
          {!busy && needsCatchUp && (
            <div className="px-3 py-2">
              <button
                onClick={() => void catchUp()}
                className="text-[12px] text-indigo-300 hover:text-indigo-200 underline"
              >
                📩 תני לתמר לקרוא ולהגיב על מה שכתבת
              </button>
            </div>
          )}
        </div>
      )}

      {/* Compose */}
      <div className="mr-6">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder={thread.length === 0 ? "תשובה לתמר... (Cmd+Enter לשליחה)" : "המשך השיחה..."}
          rows={2}
          disabled={busy}
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-indigo-400/40 disabled:opacity-50"
          maxLength={2000}
        />
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => void send()}
            disabled={busy || !draft.trim()}
            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #5E6AD2, #B867FF)" }}
          >
            {busy ? "שולח…" : (thread.length === 0 ? "שלח לתמר" : "שלח")}
          </button>
          {err && <span className="text-[11px] text-red-300/80">{err}</span>}
        </div>
      </div>
    </div>
  );
}

function Bubble({ message }: { message: ThreadMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={isUser ? "flex justify-start" : "flex justify-end"}>
      <div
        className={
          isUser
            ? "max-w-[85%] bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2 text-[13px] text-white/90"
            : "max-w-[85%] rounded-xl px-3 py-2 text-[13px]"
        }
        style={
          !isUser
            ? {
                background: "linear-gradient(135deg, rgba(94,106,210,0.10), rgba(184,103,255,0.06))",
                border: "1px solid rgba(94,106,210,0.18)",
                color: "rgba(255,255,255,0.92)",
              }
            : undefined
        }
      >
        <div className="text-[10px] font-mono mb-1 opacity-60">
          {isUser ? "אתה" : "תמר"} · {new Date(message.at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div className="leading-relaxed whitespace-pre-wrap">{message.text}</div>
      </div>
    </div>
  );
}
