# Phase 2 setup — 3 פעולות שאתה עושה (15 דק׳)

הכל כתוב מקומית. רץ TypeScript נקי. עכשיו 3 צעדים שאתה צריך לעשות פיזית.

---

## 1. הרץ את ה-SQL ב-Supabase (5 דק׳)

1. כנס ל-Supabase Dashboard → **SQL Editor**
2. לחץ **New query**
3. פתח את הקובץ `supabase/migrations/0001_init.sql` במק שלך
4. העתק את כל התוכן → הדבק ב-SQL Editor
5. לחץ **Run** (פינה שמאלית למטה, או Cmd+Enter)
6. אמור להופיע **Success. No rows returned**

זה יצור:
- `profiles` · `legal_acceptances` · `consultations` · `messages` · `packages` · `templates`
- RLS policies (כל משתמש רואה רק את שלו · `roni@otegroup.co.il` רואה הכל)
- trigger אוטומטי שיוצר profile בכל הרשמה — `roni@otegroup.co.il` מקבל אוטומטית `plan='admin'`
- view `user_entitlement` שמחשב על-המקום: trial active? days left? agents left?

---

## 2. הפעל Google OAuth ב-Supabase (5 דק׳)

1. ב-Supabase Dashboard → **Authentication** → **Providers**
2. מצא **Google** → לחץ עליו
3. הפעל את ה-toggle "Enable Sign in with Google"
4. תקבל הודעה שצריך Google OAuth credentials. שתי אופציות:
   - **המהיר:** לחץ "Use Supabase pre-configured Google OAuth" — קליק אחד והכל עובד (זמין בכל פרויקט חינמי)
   - **המקצועי:** צור client ב-Google Cloud Console והדבק client_id + secret (15 דק׳ נוספות)
5. שמור.

עכשיו ב-**Authentication** → **URL Configuration**:
- Site URL: `https://generagent.io`
- Redirect URLs: הוסף `https://generagent.io/auth/callback` ו-`http://localhost:3000/auth/callback`

---

## 3. דחוף את הקוד ל-GitHub (3 דק׳)

בטרמינל שלך:

```bash
cd /Users/roniapter/Documents/GenerAgent
git add -A
git commit -m "feat(phase2): supabase auth + legal gate + admin console + trial system"
git push
```

Vercel יפרוס אוטומטית תוך ~90 שניות (יש לו את כל ה-env vars).

---

## מה ייעבד מיד אחרי שלוש הפעולות

- ✅ `https://generagent.io/login` — מסך התחברות עם Google + Email magic link
- ✅ הרשמה → אוטומטית נוצר profile עם trial 14 יום
- ✅ אחרי auth — מוביל ל-`/legal/accept` (click-wrap עם IP + UA + version)
- ✅ אחרי אישור — `/dashboard` עם trial banner + רשימת חבילות ריקה
- ✅ `roni@otegroup.co.il` נכנס לפלאן `admin` אוטומטית → רואה כפתור "★ admin" בנאב
- ✅ `/admin` — רשימת כל המשתמשים + לחיצה → פרטים + שיחות + חבילות
- ✅ `/admin/consultations/[id]` — תמליל מלא של שיחה
- ⏳ `/consult` עדיין stub (Phase 4 — בוט עם Claude API)
- ⏳ `/templates` עדיין stub
- ⏳ `/upgrade` עדיין stub

---

## תיקונים שיכולים להידרש בפעולה הבאה

1. אם Google OAuth נכשל — בדוק שה-redirect URL בדיוק `https://generagent.io/auth/callback`
2. אם הדאשבורד מציג Profile not found — תריץ את ה-SQL שוב (probably trigger לא רץ)
3. אם trial לא מתחיל מ-14 יום — בדוק את ה-trigger handle_new_user

תכתוב לי "פרסתי" אחרי שעשית את שלוש הפעולות. אבדוק את האתר החי + אטפל בבאגים שצצים.
