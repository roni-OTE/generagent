import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "תמליל שיחה · Admin" };

interface PageProps { params: Promise<{ id: string }>; }

export default async function ConsultationTranscriptPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  if (me?.plan !== "admin") redirect("/dashboard");

  const { data: consultation } = await supabase
    .from("consultations")
    .select("*, profiles!consultations_user_id_fkey(email, display_name)")
    .eq("id", id)
    .single();
  if (!consultation) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("consultation_id", id)
    .order("created_at", { ascending: true });

  return (
    <>
      <nav className="backdrop-blur-[20px] bg-[rgba(2,2,3,0.6)] border-b border-[var(--border)] py-3.5">
        <div className="max-w-[900px] mx-auto px-6 flex items-center gap-4">
          <Link href="/admin" className="text-[var(--fg-dim)] hover:text-[var(--fg)] font-mono text-[12px]">← admin</Link>
          <span className="text-[var(--fg-muted)]">/</span>
          <Link href={`/admin/users/${consultation.user_id}`} className="text-[var(--fg-dim)] hover:text-[var(--fg)] font-mono text-[12px]">
            {consultation.profiles?.email ?? "user"}
          </Link>
          <span className="text-[var(--fg-muted)]">/</span>
          <span className="font-mono text-[12px] text-[var(--fg)]">consultation {id.slice(0,8)}</span>
        </div>
      </nav>

      <main className="max-w-[900px] mx-auto px-6 py-10 flex-1">
        <div className="bg-[var(--bg-elev)] border border-[var(--border)] rounded-[16px] p-5 mb-6 flex justify-between gap-4 flex-wrap font-mono text-[11px]">
          <div><span className="text-[var(--fg-muted)] uppercase tracking-[0.1em] block mb-1">status</span>{consultation.status}</div>
          <div><span className="text-[var(--fg-muted)] uppercase tracking-[0.1em] block mb-1">phase</span>{consultation.phase}</div>
          <div><span className="text-[var(--fg-muted)] uppercase tracking-[0.1em] block mb-1">questions</span>{consultation.question_count}</div>
          <div><span className="text-[var(--fg-muted)] uppercase tracking-[0.1em] block mb-1">confidence</span>{consultation.confidence ?? "—"}</div>
          <div><span className="text-[var(--fg-muted)] uppercase tracking-[0.1em] block mb-1">persona</span>{consultation.detected_persona ?? "—"}</div>
        </div>

        <h2 className="text-[18px] font-bold mb-4">תמליל מלא ({messages?.length ?? 0} הודעות)</h2>
        <div className="flex flex-col gap-2 mb-10">
          {messages?.map((m) => (
            <div
              key={m.id}
              className={
                m.role === "user"
                  ? "bg-gradient-to-br from-[var(--indigo)] to-[#7B85DC] text-white rounded-[14px] px-4 py-3 max-w-[75%] ml-auto shadow-[0_4px_16px_rgba(94,106,210,0.25)]"
                  : m.role === "bot"
                  ? "bg-[var(--surface)] backdrop-blur-[10px] border border-[var(--border)] rounded-[14px] px-4 py-3 max-w-[75%] mr-auto"
                  : "bg-[var(--surface)] border border-[rgba(192,132,252,0.25)] rounded-[14px] px-4 py-3 max-w-full font-mono text-[12px] text-[var(--magenta)]"
              }
            >
              <div className="text-[14px] leading-[1.6]">{m.content}</div>
              {m.micro_explanation && (
                <div className="text-[11px] text-[var(--fg-muted)] font-mono mt-2 opacity-70" dir="ltr">→ {m.micro_explanation}</div>
              )}
              <div className="text-[10px] text-[var(--fg-muted)] font-mono mt-2 opacity-50" dir="ltr">
                {m.role} · {new Date(m.created_at).toLocaleString("en-GB")}
              </div>
            </div>
          ))}
          {(!messages || messages.length === 0) && (
            <div className="text-center py-12 text-[var(--fg-dim)]">אין הודעות בשיחה זו.</div>
          )}
        </div>

        {consultation.analysis_json && (
          <>
            <h2 className="text-[18px] font-bold mb-4">ניתוח מערכתי</h2>
            <pre className="bg-[var(--bg-deep)] border border-[var(--border)] rounded-[12px] p-4 font-mono text-[12px] text-[var(--fg)] overflow-auto" dir="ltr">
{JSON.stringify(consultation.analysis_json, null, 2)}
            </pre>
          </>
        )}
      </main>
    </>
  );
}
