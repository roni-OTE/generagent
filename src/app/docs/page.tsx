import ComingSoon from "@/components/ComingSoon";

export const metadata = { title: "תיעוד · GenerAgent" };

export default function DocsPage() {
  return (
    <ComingSoon
      eyebrow="documentation · coming soon"
      title="התיעוד בדרך."
      description="מדריכי התקנה, רשימת ה-skills, איך ה-MCP עובד עם Claude Code ו-Codex CLI. בקרוב."
      back={{ label: "חזרה", href: "/" }}
    />
  );
}
