import { NextResponse } from "next/server";
import { TEAM_AGENTS } from "@/lib/team/agents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns a bash script that installs all 6 team agent .md files in .claude/agents/
 * and prints a friendly Hebrew summary.
 *
 * Usage: curl -fsSL https://generagent.io/api/team/install | bash
 */
export async function GET() {
  const lines: string[] = [];
  lines.push("#!/usr/bin/env bash");
  lines.push("set -e");
  lines.push("mkdir -p .claude/agents");
  lines.push("mkdir -p .generagent");

  for (const agent of TEAM_AGENTS) {
    const sentinel = "GA_EOF_" + Math.random().toString(36).slice(2, 10);
    const frontmatter = [
      "---",
      `name: ${agent.handle}`,
      `description: ${agent.role}`,
      "---",
      "",
    ].join("\n");

    const tasksMd = agent.first_tasks.length
      ? "\n\n## משימות ראשונות\n" + agent.first_tasks.map((t, i) => `${i + 1}. ${t}`).join("\n")
      : "";

    const intro = `## אינטראקציה ראשונה\n\nכשאני (רוני, המייסד) פותח אותך, פתח בהצגה עצמית קצרה בעברית — שם, תפקיד, ומה אתה יכול לעזור לי איתו עכשיו. ואז שאל מה הכי דחוף.`;

    const learn = `\n\n## למידה עצמית\n\nכל אינטראקציה משמעותית — עדכן את \`.generagent/learnings.md\` (תאריך, מה עבד, מה לא, מסקנה). בתחילת שיחה — קרא את הקובץ.`;

    const standup = `\n\n## פגישות צוות\n\nכל יומיים ב-09:00 נערכת פגישת standup. כשהGenerAgent app מבקש ממך דיווח — החזר JSON עם שדות: did, next, blockers, wow.`;

    const fullBody = frontmatter + agent.system_prompt + tasksMd + "\n\n" + intro + learn + standup;

    lines.push(`cat > .claude/agents/${agent.handle}.md <<'${sentinel}'`);
    lines.push(fullBody);
    lines.push(sentinel);
  }

  // Final greeting block
  const greet = [
    "",
    "═══════════════════════════════════════════════════════════════",
    "",
    "  🎉  צוות המוצר של GenerAgent הותקן בפרויקט שלך",
    "",
    "  6 סוכנים מוכנים לעבודה ב-.claude/agents/:",
    "",
    ...TEAM_AGENTS.map((a) => `     • @${a.handle.padEnd(8)} ${a.name}`),
    "",
    "  ─────────────────────────────────────────────────────────────",
    "",
    "  🚀  הפעלה ב-Claude Code:",
    "      use the tamar subagent         ← תכנון שבועי",
    "      use the yoav subagent          ← פיתוח",
    "      use the rony subagent          ← ניטור",
    "      use the dana subagent          ← תמיכה",
    "      use the shira subagent         ← שיווק",
    "      use the ariel subagent         ← release",
    "",
    "  📋  Standup אוטומטי כל ר/ג/ה ב-09:00 (Vercel cron)",
    "      תקבל סיכום במייל + יופיע באנר ב-dashboard",
    "",
    "═══════════════════════════════════════════════════════════════",
  ];
  lines.push(`cat <<'GA_GREET'`);
  lines.push(...greet);
  lines.push(`GA_GREET`);

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "content-type": "text/x-shellscript; charset=utf-8",
      "cache-control": "no-cache, no-store, must-revalidate",
    },
  });
}
