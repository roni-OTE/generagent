import ComingSoon from "@/components/ComingSoon";

export const metadata = { title: "טמפלייטים · GenerAgent" };

export default function TemplatesPage() {
  return (
    <ComingSoon
      eyebrow="community templates · coming soon"
      title="ספריית הטמפלייטים בדרך."
      description="כאן יופיעו טמפלייטי סוכן שמשתמשים אחרים יצרו ופרסמו. הורדת טמפלייט תהיה חופשית — בלי הגבלת כמות, בלי לסגור את ה-trial שלך."
      back={{ label: "חזרה ל-Dashboard", href: "/dashboard" }}
    />
  );
}
