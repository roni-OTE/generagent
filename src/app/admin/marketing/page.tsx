import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MarketingClient from "./MarketingClient";

export const metadata = { title: "שיווק · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminMarketingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  if (me?.plan !== "admin") redirect("/dashboard");

  const { data: items } = await supabase
    .from("marketing_content")
    .select("id, format, topic, title, body, hook, used_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <>
      <nav className="backdrop-blur-[20px] bg-[rgba(2,2,3,0.6)] border-b border-[var(--border)] py-3.5">
        <div className="max-w-[1100px] mx-auto px-6 flex items-center gap-4">
          <Link href="/admin" className="text-[var(--fg-dim)] hover:text-[var(--fg)] font-mono text-[12px]">← admin</Link>
          <span className="text-[var(--fg-muted)]">/</span>
          <span className="font-mono text-[12px] text-[var(--fg)]">marketing</span>
        </div>
      </nav>

      <main className="max-w-[1100px] mx-auto px-6 py-10 flex-1" dir="rtl">
        <div className="mb-6">
          <div className="font-mono text-[11px] text-[var(--indigo-text)] uppercase tracking-[0.12em] mb-2">
            content by shira
          </div>
          <h1 className="text-[28px] font-bold tracking-[-0.02em] mb-2">חומרי שיווק</h1>
          <p className="text-[var(--fg-dim)] text-[14px] leading-relaxed">
            שירה, ה-Marketing & Content של הצוות, כותבת פוסטים לוואטסאפ / לינקדין / בלוג / hero לפי דרישה.
            כל טיוטה נשמרת עם כפתור להעתקה. הטון כבר מכוון לקהל היעד שלנו.
          </p>
        </div>

        <MarketingClient initialItems={items ?? []} />
      </main>
    </>
  );
}
