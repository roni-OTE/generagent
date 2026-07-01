import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "פנייה · Admin" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function TicketPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  if (me?.plan !== "admin") redirect("/dashboard");

  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("id, email, name, subject, category, status, escalated, created_at, last_message_at")
    .eq("id", id)
    .single();
  if (!ticket) notFound();

  const { data: messages } = await supabase
    .from("support_messages")
    .select("id, direction, from_role, content, metadata, created_at")
    .eq("ticket_id", ticket.id)
    .order("created_at", { ascending: true });

  return (
    <>
      <nav className="backdrop-blur-[20px] bg-[rgba(2,2,3,0.6)] border-b border-[var(--border)] py-3.5">
        <div className="max-w-[820px] mx-auto px-6 flex items-center gap-4">
          <Link href="/admin/support" className="text-[var(--fg-dim)] hover:text-[var(--fg)] font-mono text-[12px]">← support</Link>
          <span className="text-[var(--fg-muted)]">/</span>
          <span className="font-mono text-[12px] text-[var(--fg)] truncate">{ticket.subject || ticket.id.slice(0, 8)}</span>
        </div>
      </nav>

      <main className="max-w-[820px] mx-auto px-6 py-10 flex-1" dir="rtl">
        <div className="mb-6">
          {ticket.escalated && (
            <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-[rgba(245,158,11,0.12)] text-[#F59E0B] border border-[rgba(245,158,11,0.3)] font-mono text-[11px] uppercase tracking-[0.1em]">
              🚨 escalated by dana
            </div>
          )}
          <h1 className="text-[24px] font-bold mb-2">{ticket.subject || "(אין נושא)"}</h1>
          <div className="flex flex-wrap gap-4 text-[13px] text-[var(--fg-dim)]">
            <span>{ticket.name || "—"}</span>
            <span className="font-mono" dir="ltr">
              <a href={`mailto:${ticket.email}`} className="text-[var(--indigo-text)] hover:text-[var(--indigo-bright)]">{ticket.email}</a>
            </span>
            {ticket.category && (
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] bg-[var(--surface)] text-[var(--fg-dim)] rounded px-2 py-0.5">
                {ticket.category}
              </span>
            )}
            <span className="font-mono text-[11px] text-[var(--fg-muted)]" dir="ltr">
              {new Date(ticket.created_at).toLocaleString("he-IL")}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {(messages ?? []).map((m) => {
            const isUser = m.direction === "inbound";
            return (
              <div
                key={m.id}
                className={`rounded-[14px] p-4 border ${
                  isUser
                    ? "bg-[var(--bg-elev)] border-[var(--border)]"
                    : "bg-[rgba(94,106,210,0.06)] border-[rgba(94,106,210,0.25)]"
                }`}
              >
                <div className="flex items-center justify-between mb-2 text-[11px] font-mono uppercase tracking-[0.1em]">
                  <span className={isUser ? "text-[var(--fg-muted)]" : "text-[var(--indigo-text)]"}>
                    {isUser ? "👤 " + (ticket.name || ticket.email.split("@")[0]) : m.from_role === "dana" ? "💬 דנה" : "★ אדמין"}
                  </span>
                  <span className="text-[var(--fg-muted)]" dir="ltr">
                    {new Date(m.created_at).toLocaleTimeString("he-IL")}
                  </span>
                </div>
                <div className="text-[14px] text-[var(--fg)] leading-relaxed whitespace-pre-wrap">
                  {m.content}
                </div>
                {m.metadata && typeof m.metadata === "object" && "escalate_reason" in m.metadata && (m.metadata as { escalate_reason?: string }).escalate_reason && (
                  <div className="mt-3 pt-3 border-t border-[var(--border)] text-[11px] text-[#F59E0B]">
                    <strong>סיבת הסלמה:</strong> {(m.metadata as { escalate_reason: string }).escalate_reason}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 p-4 bg-[var(--surface)] rounded-[12px] text-[12px] text-[var(--fg-dim)]">
          כדי לענות אישית — פתח את המייל שלך והשב ישירות ל-<a href={`mailto:${ticket.email}`} className="text-[var(--indigo-text)] hover:text-[var(--indigo-bright)]">{ticket.email}</a>.
        </div>
      </main>
    </>
  );
}
