import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import CopyableCode from "@/components/CopyableCode";
import { buildInstallCommand } from "@/lib/handle";

export const dynamic = "force-dynamic";

type Manifest = {
  agent_name?: string;
  agent_description?: string;
  core_capabilities?: string[];
  required_connectors?: string[];
  first_tasks_he?: string[];
  guardrails_he?: string[];
  system_prompt_he?: string;
  target_platform?: "claude-code" | "codex" | "both";
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createServiceClient();
  const { data: t } = await supabase
    .from("templates")
    .select("name, description")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (!t) return { title: "מרקטפלייס · GenerAgent" };
  return { title: `${t.name} · מרקטפלייס GenerAgent`, description: t.description ?? undefined };
}

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createServiceClient();
  const { data: t } = await supabase
    .from("templates")
    .select("id, name, description, tags, manifest_json, install_count")
    .eq("slug", slug)
    .eq("published", true)
    .eq("admin_blocked", false)
    .maybeSingle();

  if (!t) notFound();

  const m = (t.manifest_json ?? {}) as Manifest;
  const agentName = m.agent_name ?? t.name;

  return (
    <div dir="rtl" className="min-h-screen px-4 py-12 md:py-16">
      <div className="max-w-2xl mx-auto">
        <Link href="/templates" className="text-sm text-[var(--indigo-text)] hover:underline">
          → כל המרקטפלייס
        </Link>

        <div className="mt-6 mb-8">
          <h1 className="text-3xl font-bold text-white mb-3">{agentName}</h1>
          {t.description && (
            <p className="text-[var(--fg-dim)] text-sm leading-relaxed">{t.description}</p>
          )}
        </div>

        {m.core_capabilities && m.core_capabilities.length > 0 && (
          <Section title="מה הסוכן יודע לעשות">
            <ul className="space-y-2 text-sm text-white/80">
              {m.core_capabilities.map((c, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-indigo-400/80 mt-1">•</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {m.required_connectors && m.required_connectors.length > 0 && (
          <Section title="חיבורים נדרשים">
            <div className="flex flex-wrap gap-2">
              {m.required_connectors.map((c) => (
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

        <Section title="התקנה — בחר את הכלי שלך">
          <p className="text-[12px] text-white/50 mb-3 leading-relaxed">
            הפקודה כותבת קובץ סוכן בפרויקט שלך. הרץ בתוך תיקיית הפרויקט.
          </p>
          <div className="space-y-3">
            <CopyableCode
              label="CLAUDE CODE"
              code={buildInstallCommand({
                id: t.id,
                platform: "claude-code",
                agentName,
                firstTasks: m.first_tasks_he ?? [],
              })}
            />
            <CopyableCode
              label="CODEX CLI"
              code={buildInstallCommand({
                id: t.id,
                platform: "codex",
                agentName,
                firstTasks: m.first_tasks_he ?? [],
              })}
            />
          </div>
        </Section>

        <div className="mt-10 rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.06] p-6 text-center">
          <div className="text-white font-semibold mb-2">רוצה סוכן מותאם אישית לך?</div>
          <p className="text-sm text-[var(--fg-dim)] mb-4">
            5 דקות שיחה עם נועם — וסוכן שנבנה בדיוק לצרכים שלך.
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-3 rounded-xl text-sm font-medium text-white no-underline"
            style={{ background: "linear-gradient(135deg, #5E6AD2, #B867FF)" }}
          >
            מתחילים ←
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-[13px] text-white/40 mb-3 tracking-wide">{title}</h2>
      {children}
    </div>
  );
}
