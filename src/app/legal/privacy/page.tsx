import LegalPage from "@/components/LegalPage";

export const metadata = { title: "מדיניות פרטיות · GenerAgent" };

export default function PrivacyPage() {
  return (
    <LegalPage title="מדיניות פרטיות" version="v1.0" effectiveDate="2026-06-08">
      <h2>1. מי אנחנו</h2>
      <p>
        <strong>GenerAgent</strong> מופעלת ע"י OTE Group, ישראל. מנהל הפרטיות:
        <code>privacy@generagent.io</code>.
      </p>

      <h2>2. מה אנחנו אוספים</h2>
      <ul>
        <li><strong>פרטי חשבון:</strong> שם, כתובת מייל (דרך Google OAuth)</li>
        <li><strong>תשובות הבוט:</strong> מה שאתה כותב בראיון</li>
        <li><strong>מטא-דאטה של חבילות:</strong> שמות, גרסאות, תאריכי יצירה</li>
        <li><strong>נתונים טכניים:</strong> IP, user agent, timestamp לכל חתימה משפטית</li>
        <li><strong>שימוש (analytics):</strong> מצרפי בלבד, ללא זיהוי אישי</li>
      </ul>

      <h2>3. מה אנחנו לא אוספים</h2>
      <ul>
        <li>תוכן שהסוכן שלך מעבד אצלך (מיילים, מסמכים, וכו')</li>
        <li>נתונים מ-MCP connectors מקומיים</li>
        <li>סיסמאות (אנו משתמשים ב-OAuth בלבד)</li>
      </ul>

      <h2>4. שיתוף נתונים</h2>
      <p>
        אנו <strong>אינם מוכרים</strong> נתונים. שיתוף עם צדדים שלישיים מוגבל ל:
      </p>
      <ul>
        <li><strong>Anthropic:</strong> תשובות הבוט נשלחות ל-Claude API לעיבוד (לא נשמרות אצלם, ראה ה-DPA שלהם)</li>
        <li><strong>Supabase:</strong> אחסון מסד נתונים ואימות (מבוסס Postgres + RLS)</li>
        <li><strong>Vercel:</strong> אירוח האתר</li>
      </ul>

      <h2>5. זכויותיך (GDPR)</h2>
      <ul>
        <li>גישה לכל הנתונים שלך</li>
        <li>תיקון מידע שגוי</li>
        <li>מחיקה מלאה (right to be forgotten)</li>
        <li>ייצוא JSON של כל הנתונים</li>
        <li>צמצום שימוש</li>
      </ul>
      <p>לכל בקשה — <code>privacy@generagent.io</code>. מענה תוך 30 יום.</p>

      <h2>6. תקופות שמירה</h2>
      <ul>
        <li>חשבון פעיל: לכל אורך הקשר</li>
        <li>תשובות בוט: 90 יום מסיום הראיון</li>
        <li>חתימות משפטיות: 7 שנים (חובת רגולציה)</li>
        <li>חבילות: עד למחיקה ידנית או סגירת חשבון</li>
      </ul>

      <h2>7. עוגיות</h2>
      <p>
        אנו משתמשים בעוגיות חיוניות בלבד (session, auth). <strong>אין</strong> עוגיות שיווק או tracking
        של צדדים שלישיים.
      </p>

      <h2>8. אבטחה</h2>
      <p>
        הצפנת TLS 1.3 בכל הקשרים. נתונים at-rest מוצפנים. RLS (Row Level Security) ב-Postgres
        מבטיח שכל משתמש רואה רק את הנתונים שלו.
      </p>

      <h2>9. AI Disclaimer</h2>
      <p>
        השירות משתמש ב-AI (Claude) לעיבוד תשובות הבוט. המלצות שמתקבלות הן <strong>תוצאה של מודל סטטיסטי</strong>,
        לא ייעוץ מקצועי. אל תסתמך על המלצות לקבלת החלטות קריטיות בלי ייעוץ נוסף.
      </p>
    </LegalPage>
  );
}
