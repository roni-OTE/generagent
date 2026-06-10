# Phase 4 — מה צריך כדי שזה ירוץ live

Phase 4 (בוט + Claude API) מוכן מקומית. TypeScript נקי. 3 פעולות שלך:

---

## 1. דחיפה ל-GitHub

```bash
cd /Users/roniapter/Documents/GenerAgent
git add -A
git commit -m "feat(phase4): adaptive bot + claude api + result page"
git push
```

Vercel יפרוס אוטומטית תוך ~90 שניות.

---

## 2. סיים את התצורה ב-Supabase (90 שניות, מהדפדפן הרגיל שלך)

הדפדפן ב-Cowork נתקע בלי לטעון את העמוד. תעשה ידנית:

### URL Configuration
פתח: https://supabase.com/dashboard/project/uiyypknnbadirzkxfiyq/auth/url-configuration

- **Site URL**: `https://generagent.io`
- **Redirect URLs** (Add URL פעמיים):
  - `https://generagent.io/auth/callback`
  - `http://localhost:3000/auth/callback`
- Save

### Google OAuth
פתח: https://supabase.com/dashboard/project/uiyypknnbadirzkxfiyq/auth/providers

- מצא **Google** → לחץ
- הפעל toggle "Enable Sign in with Google"
- **המהיר**: בחר "Use Supabase pre-configured Google OAuth" (קליק אחד, חינמי, עובד מיד)
- Save

---

## 3. תוודא ש-ANTHROPIC_API_KEY ב-Vercel

זה כבר אמור להיות שם (הכנסנו ב-Phase 2). אם לא — הוסף ב-https://vercel.com/roni-otes-projects/generagent/settings/environment-variables

---

## מה ייעבד אחרי

- ✅ `/login` → התחברות עם Google
- ✅ הסכמה ל-TOS אוטומטית → `/dashboard`
- ✅ **`/consult`** — הבוט האדפטיבי החי. 7-15 שאלות, 3 שלבים (discovery → deep_dive → refinement), מסתעף לפי persona
- ✅ סיום אוטומטי כש-confidence ≥ 0.85 או 15 שאלות
- ✅ **`/consult/[id]/result`** — אפיון מלא של הסוכן המומלץ: שם, יכולות, system prompt לcopy, משימות ראשונות, guardrails, פלטפורמה, רמת קושי
- ✅ הכל נשמר ב-DB: profiles · consultations · messages · analysis_json
- ✅ admin רואה את הכל ב-`/admin/consultations/[id]`

## מה עוד לא

- ⏳ Phase 5 — ZIP package + download (גיטהאב/אחסון)
- ⏳ Phase 5 — `/templates` עם הזרעה ראשונית
- ⏳ הכפתור "הורדת חבילה" בעמוד התוצאה עדיין disabled

---

תכתוב לי "פרסתי" כשגמרת. אקפוץ לאתר החי, אעשה ייעוץ מלא, ואטפל בבאגים שצצים.
