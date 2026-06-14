import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import WorkspaceShell from "@/components/WorkspaceShell";
import CopyableCode from "@/components/CopyableCode";

export const dynamic = "force-dynamic";

type Manifest = {
  agent_name?: string;
  agent_description?: string;
  archetype?: string;
  persona_match?: string;
  core_capabilities?: string[];
  required_connectors?: string[];
  system_prompt_he?: string;
  first_tasks_he?: string[];
  guardrails_he?: string[];
  target_platform?: "claude-code" | "codex" | "both";
  install_difficulty?: "easy" | "medium" | "advanced";
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

export default async function PackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, plan")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  const { data: pkg } = await supabase
    .from("packages")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!pkg) redirect("/dashboard");

  const m: Manifest = (pkg.manifest_json as Manifest) ?? {};

  return (
    <WorkspaceShell
      userEmail={user.email ?? ""}
      displayName={profile.display_name}
      isAdmin={profile.plan === "admin"}
    >
      <div className="max-w-[820px] mx-auto w-full px-8 py-12 flex-1">
        <Link href="/dashboard" className="text-[12px] text-[var(--fg-dim)] hover:text-[var(--fg)] inline-flex items-center gap-1 mb-6">
          <span>→</span> חזרה לסוכנים
        </Link>

        {/* Header */}
        <div className="mb-7">
          <div className="font-mono text-[11px] text-[var(--indigo-text)] uppercase tracking-[0.12em] mb-2">
            {m.archetype ?? "agent"} · v{pkg.version}
          </div>
          <h1 className="text-[28px] font-bold tracking-[-0.02em] leading-[1.15] bg-gradient-to-b from-white to-[#B0B5C0] bg-clip-text text-transparent mb-2">
            {pkg.name}
          </h1>
          {pkg.description && (
            <p className="text-[14px] text-[var(--fg-dim)] leading-relaxed">{pkg.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-4 text-[11px] text-[var(--fg-dim)]">
            {m.target_platform && (
              <span className="px-2 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
                {PLATFORM_LABEL[m.target_platform] ?? m.target_platform}
              </span>
            )}
            {m.install_difficulty && (
              <span className="px-2 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
                {DIFFICULTY_LABEL[m.install_difficulty] ?? m.install_difficulty}
              </span>
            )}
            {pkg.is_template_clone && (
              <span className="px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300/80">
                ★ template
              </span>
            )}
          </div>
        </div>

        {/* Capabilities */}
        {m.core_capabilities && m.core_capabilities.length > 0 && (
          <Section title="מה הסוכן יודע">
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

        {/* Connectors */}
        {m.required_connectors && m.required_connectors.length > 0 && (
          <Section title="חיבורים נדרשים">
            <div className="flex flex-wrap gap-2">
              {m.required_connectors.map((c) => (
                <span key={c} className="px-3 py-1.5 rounded-lg text-xs bg-white/[0.04] border border-white/[0.06] text-white/70">
                  {c}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Install — both platforms */}
        <Section title="התקנה — בחר את הכלי שלך">
          <div className="space-y-4">
            <CopyableCode
              label="Claude Code"
              code={`npx generagent install ${pkg.id}`}
              alt={`curl -fsSL https://generagent.io/i/${pkg.id} | bash`}
            />
            <CopyableCode
              label="Codex CLI"
              code={`codex agents add @generagent/${pkg.id}`}
              alt={`curl -fsSL https://generagent.io/c/${pkg.id} | codex install -`}
            />
          </div>
        </Section>

        {/* First tasks */}
        {m.first_tasks_he && m.first_tasks_he.length > 0 && (
          <Section title="משימות ראשונות לנסות">
            <ol className="space-y-2 text-sm text-white/80">
              {m.first_tasks_he.map((t, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-white/30 tabular-nums">{i + 1}.</span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {/* Guardrails */}
        {m.guardrails_he && m.guardrails_he.length > 0 && (
          <Section title="גבולות הסוכן">
            <ul className="space-y-2 text-sm text-white/70">
              {m.guardrails_he.map((g, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-amber-400/60 mt-1">!</span>
                  <span>{g}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* System prompt */}
        {m.system_prompt_he && (
          <Section title="System prompt (להעתקה ידנית)">
            <pre className="text-xs text-white/80 bg-black/30 border border-white/[0.06] rounded-lg p-4 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
              {m.system_prompt_he}
            </pre>
          </Section>
        )}
      </div>
    </WorkspaceShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <div className="text-[11px] text-white/40 mb-3 tracking-widest">{title}</div>
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5">{children}</div>
    </div>
  );
}

