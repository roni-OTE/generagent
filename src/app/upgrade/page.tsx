import ComingSoon from "@/components/ComingSoon";

export const metadata = { title: "שדרוג · GenerAgent" };

export default function UpgradePage() {
  return (
    <ComingSoon
      eyebrow="upgrade · coming soon"
      title="תוכנית Pro בדרך."
      description="סוכנים ללא הגבלה · עדכונים אוטומטיים · עדיפות בתמיכה · API לאינטגרציה. בינתיים אתה יכול להמשיך להוריד טמפלייטים מהקהילה ללא הגבלה."
      back={{ label: "חזרה ל-Dashboard", href: "/dashboard" }}
    />
  );
}
