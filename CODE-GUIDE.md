# CODE-GUIDE — איך לעבוד עם הקוד הזה
*מיועד לכל מי שנוגע בקוד: מפתחים, מודלים של AI, וסוכני הצוות. קרא לפני שינוי ראשון.*

## מפת הפרויקט — איפה מה נמצא

```
src/
  app/                       # Next.js App Router
    page.tsx                 # דף הבית (סטטי, מהיר)
    consult/[id]/            # הצ'אט עם נועם: page.tsx (server) + ChatView.tsx (client)
    dashboard/               # דשבורד משתמש
    admin/                   # דפי אדמין (standups, users, support, marketing...)
    api/
      consult/               # start / turn / finalize — הזרימה המרכזית של נועם
      team/standup/          # סטנדאפ יומי (digest מבוסס נתונים, cron 06:00)
      health/                # בדיקת תקינות (cron כל 10 דק' + מייל התראה)
      support/submit/        # טופס תמיכה → דנה עונה אוטומטית במייל
  components/                # Logo, Orb, Button, WorkspaceShell...
  lib/
    llm.ts                   # ⭐ הדרך היחידה לקרוא ל-Claude ולפרסר JSON
    events.ts                # ⭐ logEvent — כל כשל נרשם ל-app_events
    anthropic.ts             # client + BOT_MODEL (מודל אחד לכל המערכת)
    bot/prompts.ts           # ה-system prompts של נועם + האנליסט
    quota.ts                 # מגבלות טוקנים למשתמש
    email.ts                 # Resend wrapper (no-op אם אין RESEND_API_KEY)
    supabase/server.ts       # createClient (עם RLS) / createServiceClient (עוקף RLS)
    team/ support/ marketing/ # צוות הסוכנים (agents, tools, dana, shira)
supabase/migrations/         # כל שינוי סכמה = קובץ ממוספר חדש. לא עורכים ישנים!
mockups/                     # עיצובי מקור — לקריאה בלבד
```

## חוקי ברזל (הפרה = באג ב-production)

1. **קריאת LLM שמצפה ל-JSON → רק דרך `askClaudeJson` מ-`@/lib/llm`.**
   אסור לכתוב עוד `extractJson` או לולאת retry. היו 5 עותקים שנסחפו אחד מהשני — אוחדו. אם חסר לך פרמטר — הוסף אותו ל-lib, אל תעקוף.

2. **כל catch של קריאת LLM חייב `logEvent(...)`** מ-`@/lib/events` עם source בפורמט `"תחום.פעולה"` (למשל `consult.turn`). בלי זה הצוות עיוור לתקלה.

3. **אל תדווח כשל API בתור parse_failed.** `LlmError.code` כבר מבדיל (api_credit / api_rate_limit / api_error / parse_failed). השתמש בו.

4. **סטטוסים של consultation מוגבלים ב-CHECK constraint:** רק `in_progress | analyzing | completed | abandoned`. להוסיף סטטוס = migration חדש, לא סתם קוד.

5. **maxDuration חשוב:** finalize=300 (מחולל 8K טוקנים!), turn=120, start/standup=60-120. אם אתה מוסיף route עם קריאת LLM ארוכה — הגדר `export const maxDuration` בהתאם, אחרת Vercel יהרוג באמצע והמשתמש "יתקע".

6. **`createClient` vs `createServiceClient`:** הראשון מכבד RLS (למשתמשים), השני עוקף (ל-cron/admin/tools). אל תשתמש ב-service בקוד שמשרת בקשת משתמש רגילה בלי סיבה מנומקת בהערה.

7. **UI בעברית, RTL.** קוד ומזהים באנגלית. הודעות שגיאה למשתמש — תמיד עברית ידידותית, אף פעם לא קוד גולמי (ראה `friendlyError` ב-ChatView).

8. **צד לקוח: כל fetch ל-API עם timeout** (ראה `fetchWithTimeout` ב-ChatView). בלי זה function שנהרג = "חושב..." אינסופי.

9. **שינוי סכמה = קובץ migration חדש ממוספר** (`00NN_name.sql`). רוני מריץ ידנית ב-Supabase SQL Editor — ציין בהודעת ה-commit שיש migration.

10. **לפני כל commit: `npx tsc --noEmit` נקי.** אין push ישיר מסביבות AI — מכינים commit ורוני דוחף.

## הזרימה המרכזית (נועם) — מה קורה איפה

```
משתמש לוחץ "+ שיחה חדשה"
  → POST /api/consult/start    יוצר consultation + שאלה ראשונה (מוחק אם נכשל)
משתמש עונה
  → POST /api/consult/turn     שומר תשובה → askClaudeJson → שאלה הבאה
                               גבולות: מינ' 7 שאלות, מקס' 15, סגירה ב-confidence≥0.85
                               בסגירה: turn.question מוחלף בהודעת פרידה (גם בתגובה וגם ב-DB!)
                               status: in_progress → analyzing
  → POST /api/consult/finalize askClaudeJson (8K, streaming) → analysis + package
                               idempotent: קריאה כפולה מחזירה את הקיים
                               status: analyzing → completed
  → redirect ל-/consult/[id]/result
```

מצבי קצה מטופלים: שיחה תקועה ב-analyzing → הדף הבא שולח autoFinalize; turn מחזיר `needs_finalize` → הלקוח מפעיל finalize לבד.

## ניטור — איך יודעים שמשהו נשבר

- `app_events` (טבלה) — כל הכשלים. שאילתת בדיקה: `select * from app_events order by created_at desc limit 50`
- `/api/health` — רץ כל 10 דק'. DB + Anthropic. מייל לרוני על תקלה, מייל "ירוק" בהתאוששות.
- סטנדאפ יומי 06:00 — digest אמיתי ב-/admin/standups + מייל.
- Vercel logs — https://vercel.com/roni-otes-projects/generagent/logs

## מוקשים ידועים (דברים שכבר עקצו אותנו)

- **Anthropic credits אוזלים** → הכל נופל עם api_credit. הפתרון: Auto-reload ב-console. ה-health תופס את זה.
- **הודעת prefill "{"** — התשובה של המודל מתחילה בלי ה-{, חובה להחזיר אותו לפני parse. `askClaudeJson` עושה את זה — עוד סיבה לא לעקוף אותו.
- **git locks בסביבת sandbox** — אם commit נכשל על HEAD.lock, מוחקים את הקובץ ומנסים שוב.
- **דף הבית סטטי** — שינויים בו דורשים rebuild; אל תוסיף שם קריאות דינמיות בלי לשנות את ההגדרה.
- **השם בגוגל הוא שם מלא** — הבוט פונה בשם פרטי בלבד (נחתך ב-prompts.ts). אל תחזיר את המלא.

## פקודות שימושיות

```bash
npx tsc --noEmit        # בדיקת טיפוסים — חובה לפני commit
npm run build           # build מלא (איטי יותר)
npm run dev             # שרת פיתוח מקומי
git log --oneline -10   # מה קרה לאחרונה
```
