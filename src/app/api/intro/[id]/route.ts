import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Analysis = {
  agent_name?: string;
  agent_description?: string;
  intro_message_he?: string;
  core_capabilities?: string[];
  first_tasks_he?: string[];
};

/**
 * Plain-text Hebrew greeting + activation hint, printed in the user's terminal
 * right after the agent file is downloaded.
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

  const supabase = createServiceClient();

  // Try packages first
  let name = "הסוכן שלך";
  let intro: string | null = null;
  let firstTasks: string[] = [];

  const { data: pkg } = await supabase
    .from("packages")
    .select("id, name, manifest_json")
    .eq("id", id)
    .single();

  if (pkg) {
    const m = (pkg.manifest_json as Analysis) ?? {};
    name = m.agent_name ?? pkg.name ?? name;
    intro = m.intro_message_he ?? null;
    firstTasks = m.first_tasks_he ?? [];
  } else {
    // Fallback to consultation
    const { data: consultation } = await supabase
      .from("consultations")
      .select("id, analysis_json")
      .eq("id", id)
      .single();
    if (consultation?.analysis_json) {
      const a = consultation.analysis_json as Analysis;
      name = a.agent_name ?? name;
      intro = a.intro_message_he ?? null;
      firstTasks = a.first_tasks_he ?? [];
    }
  }

  // Derive short handle: prefer ASCII chars from the name, else fall back to id slice
  const handle = makeHandle(name) || `generagent-${id.slice(0, 8)}`;

  const lines: string[] = [];
  lines.push("");
  lines.push("─".repeat(60));
  lines.push("");
  lines.push(`👋  ${name}  הותקן בהצלחה`);
  lines.push("");

  if (intro) {
    lines.push(intro);
    lines.push("");
  } else {
    lines.push(`היי, אני הסוכן שהוקם לפי הראיון שלך ב-GenerAgent.`);
    lines.push(`מהרגע שתפעיל אותי — אני זמין לעזור לך עם המשימות שאיפיינו ביחד.`);
    lines.push("");
  }

  if (firstTasks.length > 0) {
    lines.push("דברים שאפשר לבקש ממני מיד:");
    firstTasks.slice(0, 3).forEach((t) => lines.push(`  • ${t}`));
    lines.push("");
  }

  lines.push("להפעלה:");
  if (platform === "claude-code") {
    lines.push(`  בשיחה ב-Claude Code, תכתוב:  @${handle}`);
    lines.push(`  או:                           use the ${handle} subagent`);
  } else {
    lines.push(`  בשיחה ב-Codex CLI, תפנה אלי בשם:  @${handle}`);
    lines.push(`  או:                                use the ${handle} agent`);
  }
  lines.push("");
  lines.push("─".repeat(60));
  lines.push("");

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}

function makeHandle(name: string): string {
  // Try to extract Latin chars; if all Hebrew, return ""
  const latin = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .match(/[a-z0-9]+/g);
  if (latin && latin.length > 0) {
    return latin.join("-").slice(0, 30);
  }
  // No Latin chars — try to transliterate a few common Hebrew first names
  const map: Record<string, string> = {
    "תמר": "tamar",
    "יואב": "yoav",
    "אריאל": "ariel",
    "נועם": "noam",
    "דנה": "dana",
    "רוני": "roni",
    "איתי": "itay",
    "מאיה": "maya",
    "שי": "shai",
    "אורי": "ori",
    "ניר": "nir",
    "עומר": "omer",
  };
  for (const [heb, en] of Object.entries(map)) {
    if (name.includes(heb)) return en;
  }
  return "";
}
