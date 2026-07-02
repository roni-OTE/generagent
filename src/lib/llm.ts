/**
 * Shared LLM utilities — the ONE place for calling Claude and parsing JSON.
 *
 * Why this file exists: the extractJson + retry-with-prefill pattern was
 * copy-pasted across 5+ routes with small drifts (some had weaker parsing,
 * some swallowed API errors as parse errors). Any change to how we call
 * Claude should happen HERE, not in individual routes.
 *
 * Usage:
 *   const { data, usage } = await askClaudeJson<MyType>({
 *     system: "...",
 *     messages: [{ role: "user", content: "..." }],
 *     maxTokens: 900,
 *   });
 *
 * Guarantees:
 * - Prefills the assistant turn with "{" so the model starts with JSON.
 * - Retries (default 2 attempts) with an explicit "JSON only" reminder.
 * - Uses streaming for large maxTokens (>4000) to survive long generations.
 * - Throws LlmError with a stable `code` that distinguishes API failures
 *   (api_credit / api_rate_limit / api_overloaded / api_error) from
 *   parse failures (parse_failed). NEVER report an API failure as a parse
 *   failure — it sends whoever debugs it in the wrong direction.
 */
import { getAnthropic, BOT_MODEL } from "@/lib/anthropic";
import { classifyAnthropicError } from "@/lib/events";

export type LlmUsage = { inputTokens: number; outputTokens: number };

export class LlmError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Extract a JSON object from model output. Tolerates code fences and
 * surrounding prose. Order: fenced block → first{...last} → raw parse.
 */
export function extractJson<T>(text: string): T {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    try { return JSON.parse(fence[1]) as T; } catch { /* fall through */ }
  }
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last > first) {
    try { return JSON.parse(trimmed.slice(first, last + 1)) as T; } catch { /* fall through */ }
  }
  return JSON.parse(trimmed) as T;
}

const JSON_RETRY_SUFFIX =
  "\n\n⚠️ ניסיון קודם לא היה JSON תקין. החזר **רק** JSON, מתחיל ב-{ ומסתיים ב-}, ללא טקסט נוסף, ללא code-fence.";

export async function askClaudeJson<T>(opts: {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens: number;
  temperature?: number;
  attempts?: number;
  model?: string;
}): Promise<{ data: T; usage: LlmUsage }> {
  const anthropic = getAnthropic();
  const attempts = opts.attempts ?? 2;
  const usage: LlmUsage = { inputTokens: 0, outputTokens: 0 };
  let lastParseSnippet = "";
  let lastApiError: { code: string; message: string } | null = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const params = {
        model: opts.model ?? BOT_MODEL,
        max_tokens: opts.maxTokens,
        temperature: opts.temperature ?? 0.3,
        system: opts.system + (attempt > 0 ? JSON_RETRY_SUFFIX : ""),
        messages: [
          ...opts.messages,
          // Prefill: forces the reply to start as a JSON object.
          { role: "assistant" as const, content: "{" },
        ],
      };
      // Long generations (analysis, 8k tokens) go through streaming so the
      // connection stays alive; short ones use a plain call.
      const resp =
        opts.maxTokens > 4000
          ? await anthropic.messages.stream(params).finalMessage()
          : await anthropic.messages.create(params);

      usage.inputTokens += resp.usage?.input_tokens ?? 0;
      usage.outputTokens += resp.usage?.output_tokens ?? 0;

      const textBlock = resp.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        lastParseSnippet = "(no text block)";
        continue;
      }
      const raw = "{" + textBlock.text;
      try {
        return { data: extractJson<T>(raw), usage };
      } catch {
        lastParseSnippet = raw.slice(0, 200);
      }
    } catch (e) {
      lastApiError = classifyAnthropicError(e);
    }
  }

  // API failure takes precedence in the report — it's the actual root cause.
  if (lastApiError && !lastParseSnippet) {
    throw new LlmError(lastApiError.code, lastApiError.message);
  }
  if (lastApiError) {
    throw new LlmError(lastApiError.code, `${lastApiError.message} (וגם parse נכשל: ${lastParseSnippet})`);
  }
  throw new LlmError("parse_failed", "parse_failed: " + lastParseSnippet);
}
