import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { makeHandle, firstWord } from "@/lib/handle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Manifest = {
  agent_name?: string;
  agent_description?: string;
  archetype?: string;
  persona_match?: string;
  core_capabilities?: string[];
  required_connectors?: string[];
  intro_message_he?: string;
  system_prompt_he?: string;
  first_tasks_he?: string[];
  guardrails_he?: string[];
};

/**
 * Public install endpoint — returns the agent definition as a markdown file
 * formatted for the target platform (Claude Code or Codex CLI).
 *
 * No auth required so `curl ... -o .claude/agents/<name>.md` works from any shell.
 * Templates are always public; user packages are public-by-id (the id is the auth).
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const platform = (url.searchParams.get("platform") ?? "claude-code") as
    | "claude-code"
    | "codex";
  const format = (url.searchParams.get("format") ?? "md") as "md" | "script";

  const supabase = createServiceClient();

  type PkgRow = {
    id: string;
    name: string;
    description: string | null;
    archetype: string | null;
    manifest_json: Manifest | null;
    version: string;
  };

  // Try packages first
  const pkgRes = await supabase
    .from("packages")
    .select("id, name, description, archetype, manifest_json, version")
    .eq("id", id)
    .single();
  let pkg: PkgRow | null = (pkgRes.data as PkgRow | null) ?? null;

  // Fallback: treat id as consultation_id with completed analysis
  if (!pkg) {
    const { data: consultation } = await supabase
      .from("consultations")
      .select("id, analysis_json, status")
      .eq("id", id)
      .single();
    if (consultation && consultation.analysis_json) {
      const an = consultation.analysis_json as Manifest & { agent_name?: string };
      pkg = {
        id: consultation.id,
        name: an.agent_name ?? "GenerAgent agent",
        description: an.agent_description ?? null,
        archetype: an.archetype ?? null,
        manifest_json: an,
        version: "1.0.0",
      };
    }
  }

  if (!pkg) {
    return new NextResponse(`# Agent not found\n\nid: ${id}\n`, {
      status: 404,
      headers: { "content-type": "text/markdown; charset=utf-8" },
    });
  }

  const m: Manifest = pkg.manifest_json ?? {};
  const mdBody = renderMarkdown({
    platform,
    name: pkg.name,
    description: pkg.description,
    archetype: pkg.archetype,
    version: pkg.version,
    manifest: m,
  });

  // Shell-script format: one-liner installer that writes the file AND prints a beautiful greeting
  if (format === "script") {
    const script = renderInstallScript({
      platform,
      agentName: m.agent_name ?? pkg.name,
      mdBody,
      firstTasks: m.first_tasks_he ?? [],
    });
    return new NextResponse(script, {
      status: 200,
      headers: {
        "content-type": "text/x-shellscript; charset=utf-8",
        "cache-control": "no-cache, no-store, must-revalidate",
      },
    });
  }

  return new NextResponse(mdBody, {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "no-cache, no-store, must-revalidate",
      "content-disposition": `inline; filename="generagent-${id.slice(0, 8)}.md"`,
    },
  });
}

function renderInstallScript(args: {
  platform: "claude-code" | "codex";
  agentName: string;
  mdBody: string;
  firstTasks: string[];
}): string {
  const { platform, agentName, mdBody, firstTasks } = args;
  const handle = makeHandle(agentName);
  const short = firstWord(agentName);
  const dir = platform === "claude-code" ? ".claude/agents" : ".codex/prompts";
  const filename = `${handle}.md`;
  const activation =
    platform === "claude-code"
      ? `use the ${handle} subagent`
      : `use the ${handle} prompt`;
  const platformLabel = platform === "claude-code" ? "Claude Code" : "Codex CLI";

  // Use a heredoc with a unique sentinel to safely embed any MD content
  const sentinel = "GENERAGENT_EOF_" + Math.random().toString(36).slice(2, 10);

  const greetingLines = [
    "═══════════════════════════════════════════════════════════════",
    "",
    `  🎉  ${agentName}`,
    "",
    `  הסוכנת מוכנה לעבודה — מותקנת ב-${dir}/${filename}`,
    "",
    "───────────────────────────────────────────────────────────────",
    "",
    `  👋  היי, אני ${short}!`,
    `  אני כאן לעזור לך — ברגע שתפעיל אותי, נתחיל לעבוד יחד.`,
  ];
  if (firstTasks.length > 0) {
    greetingLines.push("");
    greetingLines.push("  💡  דברים שאפשר לבקש ממני מיד:");
    greetingLines.push("");
    firstTasks.slice(0, 3).forEach((t, i) => {
      greetingLines.push(`     ${i + 1}.  ${t}`);
    });
  }
  greetingLines.push("");
  greetingLines.push("───────────────────────────────────────────────────────────────");
  greetingLines.push("");
  greetingLines.push(`  🚀  להפעיל אותי ב-${platformLabel}, תכתוב:`);
  greetingLines.push("");
  greetingLines.push(`         ${activation}`);
  greetingLines.push("");
  greetingLines.push(`  או בעברית: "${short}, תעזרי לי עם ..."`);
  greetingLines.push("");
  greetingLines.push("═══════════════════════════════════════════════════════════════");

  // Bash-safe single-quote escape for the heredoc body & greeting block:
  // Using <<'SENTINEL' prevents shell expansion entirely, so MD content is safe as-is
  // (as long as it doesn't contain the sentinel itself, which is randomized).
  return [
    `#!/usr/bin/env bash`,
    `set -e`,
    `mkdir -p ${dir}`,
    `cat > ${dir}/${filename} <<'${sentinel}'`,
    mdBody,
    sentinel,
    `cat <<'GREET_END'`,
    "",
    ...greetingLines,
    "",
    `GREET_END`,
    "",
  ].join("\n");
}

function renderMarkdown(args: {
  platform: "claude-code" | "codex";
  name: string;
  description: string | null;
  archetype: string | null;
  version: string;
  manifest: Manifest;
}): string {
  const { platform, name, description, archetype, version, manifest } = args;
  const m = manifest;

  // Front-matter shape differs slightly between platforms.
  const frontmatter =
    platform === "claude-code"
      ? [
          "---",
          `name: ${slugify(name)}`,
          `description: ${escapeYaml(description ?? "")}`,
          ...(m.required_connectors && m.required_connectors.length > 0
            ? [`tools: ${m.required_connectors.join(", ")}`]
            : []),
          "---",
          "",
        ].join("\n")
      : [
          "---",
          `name: ${slugify(name)}`,
          `description: ${escapeYaml(description ?? "")}`,
          ...(archetype ? [`archetype: ${archetype}`] : []),
          "---",
          "",
        ].join("\n");

  const sections: string[] = [];
  sections.push(`# ${name}`);
  if (description) sections.push(description);
  sections.push(`\n_Generated by GenerAgent · v${version} · ${platform}_\n`);

  // Mandatory first-interaction directive — applies whether intro_message_he exists or not
  const taskOptions = (m.first_tasks_he && m.first_tasks_he.length > 0)
    ? m.first_tasks_he.slice(0, 3)
    : ["סקירת מצב נוכחי", "תכנון פעולה ראשונה", "ניתוח אתגר ספציפי"];

  sections.push("## אינטראקציה ראשונה — חובה\n");
  sections.push(
    [
      "כשהמשתמש פותח אותך לראשונה (או אחרי שיוצרת אותך עכשיו), **לפני שהוא מבקש משהו** — פתח בהצגה עצמית קצרה בעברית + הצעת 3 אפשרויות מסומנות במספרים.",
      "",
      m.intro_message_he
        ? `**ההצגה העצמית שלך** (השתמש בה כמו שהיא):\n\n\`\`\`\n${m.intro_message_he}\n\`\`\``
        : `**ההצגה העצמית שלך** צריכה לכלול:\n\n- היי קצר ושם — "היי, אני ${name}."\n- משפט אחד על מה אתה עושה בשבילי\n`,
      "",
      "**אחרי ההצגה — תציע 3 אפשרויות התחלה, מסומנות במספרים** כך שאני אוכל פשוט לכתוב \"1\", \"2\" או \"3\" ואתה תתחיל את אותה משימה:",
      "",
      `**1.**  ${taskOptions[0]}`,
      `**2.**  ${taskOptions[1] ?? "משימה נוספת מותאמת לקונטקסט"}`,
      `**3.**  ${taskOptions[2] ?? "אפשרות נוספת רלוונטית"}`,
      "",
      "סגור בשורה מזמינה כמו: \"איזה מהם נתחיל ממנו? (תכתוב 1, 2, 3 — או תגיד משהו אחר לגמרי, גם זה בסדר)\"",
      "",
      "**חוקים:**",
      "- אל תחכה שיבקש — תפנה אליו מיד אחרי שאתה נטען.",
      "- אם הוא כתב מספר (1/2/3) — תתחיל את אותה משימה ישר, בלי לשאול אישור.",
      "- אם הוא כתב משהו אחר — תתאים את עצמך אליו.",
      "- האפשרויות צריכות להיות מסוגננות יפה (bold, מספור ברור) — לא רשימת bullets רגילה.",
    ].join("\n")
  );

  if (m.system_prompt_he) {
    sections.push("## System prompt\n");
    sections.push(m.system_prompt_he);
  }

  // Self-improvement directive — explicit, in addition to whatever the system prompt says
  sections.push("## למידה עצמית — חובה\n");
  sections.push(
    [
      "בסוף כל אינטראקציה משמעותית, פתח/עדכן את הקובץ `.generagent/learnings.md` (צור את התיקייה אם לא קיימת).",
      "",
      "בכל רישום תכלול:",
      "- **תאריך + זמן** של האינטראקציה",
      "- **מה עבד טוב** — מה המשתמש אישר, ביקש עוד, או הגיב אליו בחיוב",
      "- **מה לא עבד** — היכן טעית, היכן המשתמש תיקן אותך, או מה היה צריך להיות אחר",
      "- **מסקנה לפעם הבאה** — שינוי קונקרטי בגישה שלך",
      "",
      "בתחילת כל שיחה חדשה — **קרא קודם את `.generagent/learnings.md`** כדי ללמוד מהעבר לפני שאתה עונה.",
    ].join("\n")
  );

  if (m.core_capabilities && m.core_capabilities.length > 0) {
    sections.push("## יכולות הליבה\n");
    sections.push(m.core_capabilities.map((c) => `- ${c}`).join("\n"));
  }

  if (m.required_connectors && m.required_connectors.length > 0) {
    sections.push("## כלים נדרשים\n");
    sections.push(m.required_connectors.map((c) => `- ${c}`).join("\n"));
  }

  if (m.first_tasks_he && m.first_tasks_he.length > 0) {
    sections.push("## משימות ראשונות לנסות\n");
    sections.push(m.first_tasks_he.map((t, i) => `${i + 1}. ${t}`).join("\n"));
  }

  if (m.guardrails_he && m.guardrails_he.length > 0) {
    sections.push("## גבולות\n");
    sections.push(m.guardrails_he.map((g) => `- ${g}`).join("\n"));
  }

  return frontmatter + sections.join("\n\n") + "\n";
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9א-ת]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function escapeYaml(s: string): string {
  // Quote if contains special chars
  if (/[:#\n"]/.test(s)) return `"${s.replace(/"/g, '\\"').replace(/\n/g, " ")}"`;
  return s;
}
