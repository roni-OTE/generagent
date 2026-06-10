import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { acceptLegal } from "./actions";
import Link from "next/link";

export const metadata = { title: "אישור תנאי שימוש · GenerAgent" };

const TOS_VERSION = "v1.0";

export default async function LegalAcceptPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Already accepted this version?
  const { data: existing } = await supabase
    .from("legal_acceptances")
    .select("id")
    .eq("user_id", user.id)
    .eq("document", "terms")
    .eq("version", TOS_VERSION)
    .maybeSingle();
  if (existing) redirect("/dashboard");

  return (
    <>
      <nav className="backdrop-blur-[20px] bg-[rgba(2,2,3,0.6)] border-b border-[var(--border)] py-3.5">
        <div className="max-w-[1180px] mx-auto px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span
              style={{
                width: 26, height: 26, borderRadius: 7,
                background: "linear-gradient(135deg, var(--indigo), var(--magenta))",
                boxShadow: "0 0 14px rgba(94,106,210,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 800, fontSize: 13,
              }}
            >G</span>
            <span className="font-bold text-[15px]">GenerAgent</span>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-[580px] bg-[var(--bg-elev)] border border-[var(--border)] rounded-[24px] p-9">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 font-mono text-[10px] text-[var(--indigo-text)] uppercase tracking-[0.12em] mb-3">
              <span className="w-1 h-px bg-[var(--indigo-text)]" /> step 02 of 03 · legal acceptance
            </div>
            <h1 className="text-[26px] font-bold tracking-[-0.022em] mb-2 bg-gradient-to-b from-white to-[#B0B5C0] bg-clip-text text-transparent">
              תנאי שימוש
            </h1>
            <p className="text-[var(--fg-dim)] text-[14px]">
              אנא קרא ואשר. החתימה נשמרת עם IP, תאריך, ו-version לצרכים משפטיים.
            </p>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[12px] p-4 mb-4 font-mono text-[11px] flex justify-between gap-3">
            <div>
              <div className="text-[var(--fg-muted)] uppercase tracking-[0.08em] mb-1">→ user</div>
              <div className="text-[var(--fg)]" dir="ltr">{user.email}</div>
            </div>
            <div>
              <div className="text-[var(--fg-muted)] uppercase tracking-[0.08em] mb-1">→ version</div>
              <div className="text-[var(--fg)]" dir="ltr">TOS {TOS_VERSION}</div>
            </div>
          </div>

          <div className="bg-[var(--bg-deep)] border border-[var(--border)] rounded-[12px] p-5 max-h-[280px] overflow-y-auto text-[13px] text-[var(--fg-dim)] leading-[1.7] mb-4">
            <p className="mb-2"><strong className="text-[var(--fg)]">1. השירות:</strong> GenerAgent היא פלטפורמת ייעוץ בעברית שמאפיינת איזה סוכן AI מתאים לך ומפיקה חבילת התקנה ל-Claude Code/Codex CLI.</p>
            <p className="mb-2"><strong className="text-[var(--fg)]">2. ללא אחריות:</strong> השירות "כמות שהוא" — בדוק התאמה לפני שימוש.</p>
            <p className="mb-2"><strong className="text-[var(--fg)]">3. תוכנית חינם:</strong> 14 יום או 2 סוכנים אישיים (המוקדם). הורדת טמפלייטים — חופשי וללא הגבלה.</p>
            <p className="mb-2"><strong className="text-[var(--fg)]">4. שיפוט:</strong> ישראל.</p>
            <p className="mb-2"><strong className="text-[var(--fg)]">5. הגבלת אחריות:</strong> מוגבל לסכום ששולם או 100 ש"ח — הנמוך מבניהם.</p>
            <p className="mb-2"><strong className="text-[var(--fg)]">6. איסור:</strong> אסור לייצר סוכנים שמייעצים בנושאי כספים, השקעות, או בריאות.</p>
            <p className="mb-2"><strong className="text-[var(--fg)]">7. עיבוד נתונים:</strong> תשובות בוט נשמרות 90 יום. לא נאסף תוכן שהסוכן מעבד.</p>
            <p>מסמך מלא: <Link href="/legal/terms" target="_blank" className="text-[var(--indigo-text)] hover:text-[var(--indigo-bright)]">תנאי שימוש</Link> · <Link href="/legal/privacy" target="_blank" className="text-[var(--indigo-text)] hover:text-[var(--indigo-bright)]">מדיניות פרטיות</Link></p>
          </div>

          <form action={acceptLegal}>
            <label className="flex items-start gap-3 p-3.5 bg-[var(--surface)] border border-[var(--border)] rounded-[12px] cursor-pointer hover:bg-[var(--surface-strong)] hover:border-[rgba(94,106,210,0.25)] transition-all mb-4 has-[:checked]:bg-[rgba(94,106,210,0.06)] has-[:checked]:border-[rgba(94,106,210,0.3)]">
              <input type="checkbox" name="accept" required className="mt-0.5 accent-[var(--indigo)] w-4 h-4" />
              <div className="text-[13px] text-[var(--fg)] leading-[1.55]">
                <strong className="font-semibold">אני קראתי, הבנתי, ואני מסכים לתנאי השימוש.</strong>
                <span className="block text-[11px] text-[var(--fg-muted)] mt-1 font-mono">חתימה זו נשמרת עם IP · UA · timestamp לצרכים משפטיים</span>
              </div>
            </label>
            <button
              type="submit"
              className="w-full px-6 py-3.5 rounded-xl text-[15px] font-semibold text-white bg-[var(--indigo)] hover:bg-[var(--indigo-hover)] shadow-[0_0_28px_rgba(94,106,210,0.3),inset_0_1px_0_rgba(255,255,255,0.18)] transition-all"
            >
              אשר והמשך לדאשבורד →
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
