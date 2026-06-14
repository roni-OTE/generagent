export function firstWord(name: string): string {
  return name
    .split(/[—\-\s,·•|/]+/u)
    .map((s) => s.trim())
    .find((s) => s.length > 0) ?? name;
}

export function makeHandle(name: string): string {
  const fw = firstWord(name);

  const latin = fw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .match(/[a-z0-9]+/g);
  if (latin && latin.length > 0) {
    return latin.join("-").slice(0, 30);
  }

  const map: Record<string, string> = {
    "תמר": "tamar", "יואב": "yoav", "יוסי": "yossi", "אריאל": "ariel",
    "נועם": "noam", "נועה": "noa", "דנה": "dana", "דניאל": "daniel",
    "רוני": "roni", "איתי": "itay", "מאיה": "maya", "שי": "shai",
    "אורי": "ori", "ניר": "nir", "עומר": "omer", "עמית": "amit",
    "אלון": "alon", "אביב": "aviv", "אבי": "avi", "שירה": "shira",
    "תום": "tom", "יעל": "yael", "הילה": "hila", "ליאור": "lior",
    "ליאת": "liat", "גלית": "galit", "גל": "gal", "אסף": "asaf",
    "רונית": "ronit", "מיכל": "michal", "מיכאל": "michael", "ברק": "barak",
    "אופיר": "ofir", "אילן": "ilan", "אילנה": "ilana", "טל": "tal",
    "מור": "mor", "עידן": "idan", "סער": "saar", "סיון": "sivan",
    "אייל": "eyal", "יהודה": "yehuda", "שרון": "sharon", "אהוד": "ehud",
    "רחל": "rachel", "שרה": "sara", "לאה": "leah", "אסתר": "esther",
    "חיים": "haim", "ירון": "yaron",
  };
  if (map[fw]) return map[fw];

  const charMap: Record<string, string> = {
    "א": "a", "ב": "b", "ג": "g", "ד": "d", "ה": "h", "ו": "v", "ז": "z",
    "ח": "h", "ט": "t", "י": "y", "כ": "k", "ך": "k", "ל": "l", "מ": "m",
    "ם": "m", "נ": "n", "ן": "n", "ס": "s", "ע": "a", "פ": "p", "ף": "p",
    "צ": "tz", "ץ": "tz", "ק": "k", "ר": "r", "ש": "sh", "ת": "t",
  };
  return Array.from(fw).map((c) => charMap[c] ?? "").join("").slice(0, 20) || "agent";
}

/** Bash-safe single-quote escaping */
function shq(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

/**
 * Build a self-contained install command that:
 *  1. creates the directory
 *  2. downloads the .md
 *  3. prints a beautiful Hebrew greeting + activation instructions
 * The printf is intentionally short so Codex/Claude Code display it verbatim.
 */
// Note: shq() kept for backward compat but no longer used by buildInstallCommand
export { shq };

/**
 * Clean install command using the short alias /i/<id> or /c/<id>.
 * The endpoint returns a shell script that writes the file AND prints
 * the rich Hebrew greeting — so the displayed command is short and
 * mysterious, and the magic happens when it runs.
 */
export function buildInstallCommand(opts: {
  id: string;
  platform: "claude-code" | "codex";
  agentName: string;
  shortName?: string;
  firstTasks?: string[];
}): string {
  const { id, platform } = opts;
  const alias = platform === "claude-code" ? "i" : "c";
  return `curl -fsSL https://generagent.io/${alias}/${id} | bash`;
}
