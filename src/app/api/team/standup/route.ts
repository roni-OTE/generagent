import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAnthropic, BOT_MODEL } from "@/lib/anthropic";
import { TEAM_AGENTS, type TeamAgent } from "@/lib/team/agents";
import { sendEmail, markdownToBasicHtml } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 60;

type AgentReport = {
  did: string;
  next: string;
  blockers: string;
  wow: string;
};

type TamarSummary = {
  highlights: string[];
  decisions_needed: string[];
  metrics_snapshot: string;
  summary_md: string;
};

function extractJson<T>(text: string): T {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    try { return JSON.parse(fence[1]) as T; } catch {}
  }
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last > first) {
    return JSON.parse(trimmed.slice(first, last + 1)) as T;
  }
  return JSON.parse(trimmed) as T;
}

async function askAgent(agent: TeamAgent, context: string): Promise<AgentReport | null> {
  const anthropic = getAnthropic();
  const baseSystem = agent.system_prompt + `\n\nהחזר *רק* JSON תקני, התחל ב-{ סיים ב-}.\nשדות חובה: did, next, blockers, wow (כולם מחרוזות, אסור null).`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await anthropic.messages.create({
        model: BOT_MODEL,
        max_tokens: 500,
        temperature: 0.4,
        system:
          baseSystem +
          (attempt === 1 ? "\n\n⚠️ ניסיון קודם לא היה JSON תקני. החזר JSON בלבד." : ""),
        messages: [
          { role: "user" as const, content: `הקשר השבוע:\n${context}\n\nתן את הסטנדאפ שלך.` },
          { role: "assistant" as const, content: "{" },
        ],
      });
      const textBlock = resp.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") continue;
      const raw = "{" + textBlock.text;
      try {
        return extractJson<AgentReport>(raw);
      } catch {
        // try again
      }
    } catch {
      // network/API failure — try again
    }
  }

  // Fallback: at least return a placeholder so Tamar knows this agent was silent
  return {
    did: "(לא הצליח להחזיר דיווח בפורמט תקין)",
    next: "(לא ידוע)",
    blockers: "parse_failed — לבדוק את ה-prompt",
    wow: "—",
  };
}

async function buildMetricsContext(): Promise<string> {
  const supabase = createServiceClient();
  const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();

  const [{ count: consults }, { count: packages }, { count: users }, { data: recentMessages }] = await Promise.all([
    supabase.from("consultations").select("id", { count: "exact", head: true }).gte("created_at", since),
    supabase.from("packages").select("id", { count: "exact", head: true }).gte("created_at", since),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since),
    supabase.from("messages").select("role").gte("created_at", since).limit(200),
  ]);

  const totalMsgs = recentMessages?.length ?? 0;

  return `### מטריקות 48 שעות אחרונות
- שיחות שנפתחו: ${consults ?? 0}
- סוכנים שנוצרו: ${packages ?? 0}
- משתמשים חדשים: ${users ?? 0}
- הודעות בצ׳אט: ${totalMsgs}`;
}

export async function POST(req: Request) {
  // Optional shared-secret check for Vercel cron
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const context = await buildMetricsContext();

  // Collect reports from non-Tamar agents in PARALLEL (Tamar synthesizes after)
  const nonTamar = TEAM_AGENTS.filter((a) => a.handle !== "tamar");
  const reportResults = await Promise.all(
    nonTamar.map(async (agent) => ({
      handle: agent.handle,
      report: await askAgent(agent, context),
    }))
  );
  const reports: Record<string, AgentReport> = {};
  for (const r of reportResults) {
    if (r.report) reports[r.handle] = r.report;
  }

  // Tamar synthesizes
  const tamar = TEAM_AGENTS.find((a) => a.handle === "tamar")!;
  const tamarContext = `${context}

### דיווחי הצוות

${nonTamar
  .map((a) => {
    const r = reports[a.handle];
    if (!r) return `- ${a.name}: (לא דיווח)`;
    return `**${a.name}**
- עשיתי: ${r.did}
- הלאה: ${r.next}
- בלוקרים: ${r.blockers}
- טיוואק: ${r.wow}`;
  })
  .join("\n\n")}`;

  const anthropic = getAnthropic();
  let tamarOut: TamarSummary | null = null;
  try {
    const resp = await anthropic.messages.create({
      model: BOT_MODEL,
      max_tokens: 2500,
      temperature: 0.4,
      system: tamar.system_prompt + `\n\nכשתי, סכמי את כל הדיווחים לפגישה אחת ידידותית למייסד רוני. החזירי JSON תקני בלבד.\n\nפורמט summary_md (חובה):\n\n# Standup <YYYY-MM-DD HH:mm>\n\n## 🎯 Highlights\n1. ...\n2. ...\n3. ...\n\n## ⚠️ צריך החלטה ממך\n- [ ] ...\n- [ ] ...\n\n## 📊 מטריקות\n...\n\n## 🚀 ב-48h הבאות\n...\n\n## 🤝 השתתפו\n...`,
      messages: [
        { role: "user", content: tamarContext },
        { role: "assistant", content: "{" },
      ],
    });
    const textBlock = resp.content.find((b) => b.type === "text");
    if (textBlock && textBlock.type === "text") {
      tamarOut = extractJson<TamarSummary>("{" + textBlock.text);
    }
  } catch {
    tamarOut = null;
  }

  const summaryMd = tamarOut?.summary_md ?? "(תמר לא הצליחה לסכם — בדוק logs)";

  // Persist
  const supabase = createServiceClient();
  const { data: standupRow } = await supabase
    .from("team_standups")
    .insert({
      summary_md: summaryMd,
      highlights: tamarOut?.highlights ?? [],
      decisions_needed: tamarOut?.decisions_needed ?? [],
      metrics_json: { snapshot: tamarOut?.metrics_snapshot ?? null },
      agent_inputs: reports,
    })
    .select("id, standup_date")
    .single();

  // Email
  const founderEmail = process.env.FOUNDER_EMAIL ?? "roni@otegroup.co.il";
  const subject = `📋 Standup הצוות — ${new Date().toLocaleDateString("he-IL")}`;
  const html = markdownToBasicHtml(summaryMd);
  const emailRes = await sendEmail({ to: founderEmail, subject, html });

  if (standupRow && emailRes.success) {
    await supabase.from("team_standups").update({ email_sent: true }).eq("id", standupRow.id);
  }

  return NextResponse.json({
    ok: true,
    standup_id: standupRow?.id ?? null,
    email: emailRes,
    agent_count: Object.keys(reports).length,
  });
}

export async function GET(req: Request) {
  // Vercel cron uses GET by default
  return POST(req);
}
