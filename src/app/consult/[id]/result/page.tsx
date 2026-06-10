import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Orb from "@/components/Orb";

export const dynamic = "force-dynamic";

type Analysis = {
  agent_name: string;
  agent_description: string;
  archetype: string;
  persona_match: string;
  core_capabilities: string[];
  required_connectors: string[];
  system_prompt_he: string;
  first_tasks_he: string[];
  guardrails_he: string[];
  target_platform: "claude-code" | "codex" | "both";
  install_difficulty: "easy" | "medium" | "advanced";
  confidence: number;
};

const PLATFORM_LABEL: Record<string, string> = {
  "claude-code": "Claude Code",
  codex: "Codex CLI",
  both: "Claude Code · Codex CLI",
};

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "קל · 5 דקות",
  medium: "בינוני · 15 דקות",
  advanced: "מתקדם · 30+ דקות",
};

export default async function ConsultResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: consultation } = await supabase
    .from("consultations")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!consultation) redirect("/dashboard");

  if (consultation.status !== "completed" || !consultation.analysis_json) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="mx-auto mb-6 w-20 h-20"><Orb size="thinking" cursorFollow={false} /></div>
          <div className="text-sm text-white/60">מאפיין את הסוכן… זה לוקח רגע.</div>
          <Link href="/dashboard" className="text-xs text-white/40 underline mt-4 inline-block">
            חזרה ל-Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const a = consultation.analysis_json as Analysis;

  return (
    <div className="min-h-screen px-6 py-12" dir="rtl">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-[11px] text-white/40 mb-3 tracking-widest">הסוכן שמתאים לך</div>
          <h1 className="text-3xl font-medium text-white mb-3">{a.agent_name}</h1>
          <p className="text-sm text-white/60 max-w-xl mx-auto leading-relaxed">
            {a.agent_description}
          </p>
          <div className="flex items-center justify-center gap-3 mt-5 text-[11px] text-white/40">
            <span className="px-2 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
              {PLATFORM_LABEL[a.target_platform] ?? a.target_platform}
            </span>
            <span className="px-2 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
              {DIFFICULTY_LABEL[a.install_difficulty] ?? a.install_difficulty}
            </span>
            <span className="px-2 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
              אמון {Math.round(a.confidence * 100)}%
            </span>
          </div>
        </div>

        {/* Capabilities */}
        <Section title="מה הסוכן יודע לעשות">
          <ul className="space-y-2 text-sm text-white/80">
            {a.core_capabilities.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-indigo-400/80 mt-1">•</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Required connectors */}
        {a.required_connectors.length > 0 && (
          <Section title="חיבורים נדרשים">
            <div className="flex flex-wrap gap-2">
              {a.required_connectors.map((c) => (
                <span
                  key={c}
                  className="px-3 py-1.5 rounded-lg text-xs bg-white/[0.04] border border-white/[0.06] text-white/70"
                >
                  {c}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* First tasks */}
        <Section title="משימות ראשונות לנסות">
          <ol className="space-y-2 text-sm text-white/80">
            {a.first_tasks_he.map((t, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-white/30 tabular-nums">{i + 1}.</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
        </Section>

        {/* Guardrails */}
        {a.guardrails_he.length > 0 && (
          <Section title="גבולות הסוכן">
            <ul className="space-y-2 text-sm text-white/70">
              {a.guardrails_he.map((g, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-amber-400/60 mt-1">!</span>
                  <span>{g}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* System prompt */}
        <Section title="System prompt (להעתקה)">
          <pre className="text-xs text-white/80 bg-black/30 border border-white/[0.06] rounded-lg p-4 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
            {a.system_prompt_he}
          </pre>
        </Section>

        {/* CTA */}
        <div className="mt-10 flex justify-center gap-3">
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl text-sm text-white/80 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] transition-colors"
          >
            חזרה ל-Dashboard
          </Link>
          <span className="px-5 py-2.5 rounded-xl text-sm text-white/40 bg-white/[0.02] border border-white/[0.06] cursor-not-allowed">
            הורדת חבילה · בקרוב
          </span>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="text-[11px] text-white/40 mb-3 tracking-widest">{title}</div>
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5">{children}</div>
    </div>
  );
}
