import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "תמיכה · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminSupportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  if (me?.plan !== "admin") redirect("/dashboard");

  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id, email, name, subject, category, status, escalated, last_message_at, created_at")
    .order("last_message_at", { ascending: false })
    .limit(100);

  const escalated = (tickets ?? []).filter((t) => t.escalated);
  const answered = (tickets ?? []).filter((t) => !t.escalated);

  const badge = (status: string, escalated: boolean) => {
    if (escalated) return { color: "amber", label: "🚨 escalated" };
    if (status === "answered") return { color: "success", label: "✓ answered" };
    if (status === "closed") return { color: "muted", label: "closed" };
    return { color: "indigo", label: "open" };
  };

  return (
    <>
      <nav className="backdrop-blur-[20px] bg-[rgba(2,2,3,0.6)] border-b border-[var(--border)] py-3.5">
        <div className="max-w-[1100px] mx-auto px-6 flex items-center gap-4">
          <Link href="/admin" className="text-[var(--fg-dim)] hover:text-[var(--fg)] font-mono text-[12px]">← admin</Link>
          <span className="text-[var(--fg-muted)]">/</span>
          <span className="font-mono text-[12px] text-[var(--fg)]">support</span>
        </div>
      </nav>

      <main className="max-w-[1100px] mx-auto px-6 py-10 flex-1" dir="rtl">
        <div className="mb-6">
          <div className="font-mono text-[11px] text-[var(--indigo-text)] uppercase tracking-[0.12em] mb-2">
            support tickets
          </div>
          <h1 className="text-[28px] font-bold tracking-[-0.02em] mb-2">פניות תמיכה</h1>
          <p className="text-[var(--fg-dim)] text-[14px]">
            כל פנייה שהגיעה דרך <code className="font-mono text-[12px] text-[var(--indigo-text)]">/support</code> או support@generagent.io. דנה עונה אוטומטית ומסלימה אליך כשצריך.
          </p>
        </div>

        {escalated.length > 0 && (
          <section className="mb-8">
            <h2 className="text-[16px] font-bold text-[#F59E0B] mb-3">
              🚨 דורש התייחסות שלך <span className="text-[var(--fg-muted)] font-normal">({escalated.length})</span>
            </h2>
            <div className="space-y-2">
              {escalated.map((t) => (
                <TicketRow key={t.id} t={t} badge={badge(t.status, true)} />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-[15px] font-semibold text-[var(--fg-dim)] mb-3">
            כל הפניות <span className="text-[var(--fg-muted)] font-normal">({tickets?.length ?? 0})</span>
          </h2>
          {(tickets ?? []).length === 0 ? (
            <div className="bg-[var(--bg-elev)] border border-[var(--border)] rounded-[14px] p-6 text-center text-[var(--fg-dim)] text-[13px]">
              עוד לא הגיעו פניות. הן יופיעו כאן.
            </div>
          ) : (
            <div className="space-y-2">
              {answered.map((t) => (
                <TicketRow key={t.id} t={t} badge={badge(t.status, false)} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

type Ticket = {
  id: string;
  email: string;
  name: string | null;
  subject: string | null;
  category: string | null;
  status: string;
  escalated: boolean;
  last_message_at: string;
  created_at: string;
};

function TicketRow({ t, badge }: { t: Ticket; badge: { color: string; label: string } }) {
  const colorClasses: Record<string, string> = {
    amber: "bg-[rgba(245,158,11,0.12)] text-[#F59E0B] border-[rgba(245,158,11,0.3)]",
    success: "bg-[rgba(74,222,128,0.12)] text-[var(--success)] border-[rgba(74,222,128,0.3)]",
    muted: "bg-[var(--surface)] text-[var(--fg-muted)] border-[var(--border)]",
    indigo: "bg-[rgba(94,106,210,0.12)] text-[var(--indigo-text)] border-[rgba(94,106,210,0.3)]",
  };
  return (
    <Link href={`/admin/support/${t.id}`} className="block bg-[var(--bg-elev)] border border-[var(--border)] rounded-[12px] p-4 hover:border-[var(--indigo)] transition-colors no-underline">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-white font-medium text-[14px]">{t.subject || "(אין נושא)"}</span>
            <span className={`font-mono text-[10px] uppercase tracking-[0.08em] border rounded px-2 py-0.5 ${colorClasses[badge.color]}`}>
              {badge.label}
            </span>
            {t.category && (
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] bg-[var(--surface)] text-[var(--fg-dim)] border border-[var(--border)] rounded px-2 py-0.5">
                {t.category}
              </span>
            )}
          </div>
          <div className="text-[12px] text-[var(--fg-dim)]">
            {t.name || t.email.split("@")[0]} · <span className="font-mono" dir="ltr">{t.email}</span>
          </div>
        </div>
        <div className="text-[11px] text-[var(--fg-muted)] font-mono whitespace-nowrap" dir="ltr">
          {new Date(t.last_message_at).toLocaleDateString("he-IL")}
        </div>
      </div>
    </Link>
  );
}
