import FeedbackForm from "./FeedbackForm";

export const metadata = { title: "משוב · GenerAgent" };

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ src?: string; email?: string }>;
}) {
  const params = await searchParams;
  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 md:p-8">
        <div className="text-[11px] tracking-widest text-[var(--indigo-text)] mb-2 font-mono">
          FEEDBACK →
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">שתי דקות של כנות?</h1>
        <p className="text-sm text-[var(--fg-dim)] mb-6 leading-relaxed">
          המשוב שלך הולך ישירות לרוני (המייסד) ומשפיע על מה שנבנה בשבוע הקרוב.
        </p>
        <FeedbackForm
          source={params.src === "abandoned" ? "abandoned_email" : params.src === "followup" ? "followup_email" : "site"}
          initialEmail={params.email ?? ""}
        />
      </div>
    </div>
  );
}
