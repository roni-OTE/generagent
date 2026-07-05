/**
 * Blog content loader — reads markdown files from content/blog/.
 * File naming convention: YYYY-MM-DD-slug.md
 * First line must be "# Title". The rest is the body (markdown).
 *
 * Shira's weekly Cowork task drops new posts here; a git push publishes them.
 */
import fs from "fs";
import path from "path";

export type BlogPost = {
  slug: string;
  date: string; // YYYY-MM-DD
  title: string;
  body: string; // markdown without the title line
  excerpt: string;
};

const BLOG_DIR = path.join(process.cwd(), "content", "blog");
const FILE_RE = /^(\d{4}-\d{2}-\d{2})-(.+)\.md$/;

export function listPosts(): BlogPost[] {
  let files: string[] = [];
  try {
    files = fs.readdirSync(BLOG_DIR);
  } catch {
    return [];
  }
  const posts: BlogPost[] = [];
  for (const f of files) {
    const m = f.match(FILE_RE);
    if (!m) continue;
    const post = readPost(`${m[1]}-${m[2]}`);
    if (post) posts.push(post);
  }
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function readPost(slug: string): BlogPost | null {
  // slug includes the date prefix: YYYY-MM-DD-my-post
  const m = slug.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
  if (!m) return null;
  const file = path.join(BLOG_DIR, `${slug}.md`);
  let raw = "";
  try {
    raw = fs.readFileSync(file, "utf-8");
  } catch {
    return null;
  }
  const lines = raw.trim().split("\n");
  const titleLine = lines[0] ?? "";
  const title = titleLine.replace(/^#\s*/, "").trim() || slug;
  const body = lines.slice(1).join("\n").trim();
  const firstPara = body.split("\n\n")[0]?.replace(/[#*_>`]/g, "").trim() ?? "";
  return {
    slug,
    date: m[1],
    title,
    body,
    excerpt: firstPara.slice(0, 180) + (firstPara.length > 180 ? "…" : ""),
  };
}
