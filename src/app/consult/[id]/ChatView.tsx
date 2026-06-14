"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

type Turn = {
  phase: "discovery" | "deep_dive" | "refinement" | "done";
  question_id: string;
  micro_explanation: string;
  question: string;
  detected_persona: string | null;
  confidence: number;
  should_continue: boolean;
};

type Message = { role: "bot" | "user" | "system"; content: string; micro?: string };

const PHASE_LABEL: Record<string, string> = {
  discovery: "מכיר אותך",
  deep_dive: "מבין את הכאב",
  refinement: "מחדד תכולה",
  done: "מאפיין סוכן",
};

type Props = {
  consultationId: string;
  initialMessages: Message[];
  initialPhase: string;
  initialQuestionCount: number;
  initialConfidence: number;
  initialDone: boolean;
  autoFinalize?: boolean;
};

export default function ChatView({
  consultationId,
  initialMessages,
  initialPhase,
  initialQuestionCount,
  initialConfidence,
  initialDone,
  autoFinalize,
}: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [phase, setPhase] = useState<string>(initialPhase);
  const [questionCount, setQuestionCount] = useState(initialQuestionCount);
  const [confidence, setConfidence] = useState(initialConfidence);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(initialDone);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    inputRef.current?.focus();
    if (autoFinalize) {
      void finalize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendAnswer() {
    const answer = input.trim();
    if (!answer || busy || done) return;
    setBusy(true);
    setError(null);
    setMessages((m) => [...m, { role: "user", content: answer }]);
    setInput("");
    try {
      const res = await fetch("/api/consult/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultation_id: consultationId, user_answer: answer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "turn_failed");
      const t: Turn = data.turn;
      setPhase(t.phase);
      setQuestionCount(data.question_count);
      setConfidence(t.confidence);
      setMessages((m) => [...m, { role: "bot", content: t.question, micro: t.micro_explanation }]);
      if (data.done) {
        setDone(true);
        await finalize();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  async function finalize() {
    try {
      const res = await fetch("/api/consult/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultation_id: consultationId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = data?.detail ? ` (${data.detail})` : "";
        throw new Error(`${data?.error || "finalize_failed"}${detail}`);
      }
      router.push(`/consult/${consultationId}/result`);
    } catch (e: unknown) {
      setError(
        (e instanceof Error ? e.message : "שגיאה בסיום") +
          " — נסה לרענן או ללחוץ 'נסה שוב' למטה."
      );
      setDone(false); // re-enable the input
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendAnswer();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-48px)] md:h-screen">
      {/* Header */}
      <header className="border-b border-white/[0.06] px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-[12px] text-[var(--fg-dim)] hover:text-[var(--fg)] flex items-center gap-1"
            title="חזרה לדאשבורד"
          >
            <span>→</span>
            <span>חזרה</span>
          </button>
          <span className="text-[var(--fg-muted)]">·</span>
          <div className="text-[11px] text-white/40">{PHASE_LABEL[phase] ?? phase}</div>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-white/40 tabular-nums">
          <span>שאלה {questionCount}/15</span>
          <span>אמון {Math.round(confidence * 100)}%</span>
        </div>
      </header>

      {/* Transcript */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-6 md:py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {messages.length === 0 && busy && (
            <div className="text-center text-xs text-white/40 py-12">פותח שיחה...</div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-start" : "flex justify-end"}>
              <div
                className={
                  m.role === "user"
                    ? "max-w-[80%] bg-white/[0.04] border border-white/[0.06] rounded-2xl px-4 py-3 text-sm text-white/90"
                    : "max-w-[80%] rounded-2xl px-4 py-3 text-sm"
                }
                style={
                  m.role === "bot"
                    ? {
                        background:
                          "linear-gradient(135deg, rgba(94,106,210,0.10), rgba(184,103,255,0.06))",
                        border: "1px solid rgba(94,106,210,0.18)",
                        color: "rgba(255,255,255,0.92)",
                      }
                    : undefined
                }
              >
                {m.role === "bot" && m.micro && (
                  <div className="text-[11px] text-white/40 mb-1.5 leading-snug">{m.micro}</div>
                )}
                <div className="leading-relaxed whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          ))}
          {busy && messages.length > 0 && (
            <div className="flex justify-end">
              <div className="text-xs text-white/40 px-4 py-3">חושב…</div>
            </div>
          )}
          {error && (
            <div className="text-xs text-red-300/80 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          {done && !error && (
            <div className="text-xs text-white/50 text-center py-4">
              מסיים את האפיון… מעביר אותך לתוצאה.
            </div>
          )}
          {error && done && (
            <div className="text-center py-4">
              <button
                onClick={() => { setError(null); void finalize(); }}
                className="px-4 py-2 rounded-lg text-xs bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 hover:bg-indigo-500/25"
              >
                נסה שוב לסיים אפיון
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-white/[0.06] px-4 md:px-6 py-3 md:py-4 pb-safe">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              disabled={busy || done}
              rows={1}
              placeholder={done ? "השיחה הסתיימה" : "תכתוב את התשובה שלך… (Enter כדי לשלוח)"}
              className="flex-1 resize-none bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-indigo-400/40 disabled:opacity-50"
              style={{ maxHeight: "120px" }}
            />
            <button
              onClick={() => void sendAnswer()}
              disabled={busy || done || !input.trim()}
              className="px-4 py-3 rounded-xl text-sm font-medium text-white disabled:opacity-30 transition-opacity"
              style={{ background: "linear-gradient(135deg, #5E6AD2, #B867FF)" }}
            >
              שלח
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
