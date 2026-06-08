# Deployment guide · generagent.io

מדריך מהיר לפריסה ראשונה. הקוד מוכן — אלה השלבים שאתה צריך לעשות פעם אחת.

---

## תוצרים שמוכנים בקוד

```
src/
├── app/
│   ├── layout.tsx       ← RTL + Heebo/Inter/Mono fonts
│   ├── page.tsx         ← Landing v3 כ-React (Hero + Orb + CTA)
│   └── globals.css      ← כל ה-design tokens של aurora
├── components/
│   ├── Orb.tsx          ← The signature orb (5 layers + cursor follow)
│   └── Button.tsx       ← 4 variants × 3 sizes
package.json             ← Next.js 16 + Supabase + Anthropic SDK
AGENTS.md                ← הוראות לסוכן עתידי שיעבוד על הקוד
mockups/                 ← 26 קבצי HTML מהשלבים הקודמים (reference)
```

---

## שלב 1 · בדיקה מקומית (5 דק׳)

```bash
cd /Users/roniapter/Documents/GenerAgent
npm install           # אם עוד לא רץ
npm run dev           # יפתח על http://localhost:3000
```

תראה את ה-Landing באוויר — בדיוק כמו `mockups/Design_Phase_06b_Landing_v3.html`, אבל בקוד React.

---

## שלב 2 · GitHub (5 דק׳)

1. צור repo חדש ב-GitHub בשם `generagent` (private מומלץ).
2. מהפרויקט:
```bash
cd /Users/roniapter/Documents/GenerAgent
git add .
git commit -m "feat: initial scaffold + landing page"
git remote add origin git@github.com:<your-username>/generagent.git
git push -u origin main
```

---

## שלב 3 · Vercel (5 דק׳)

1. כנס ל-[vercel.com](https://vercel.com), Sign in עם GitHub.
2. `New Project` → בחר את ה-repo `generagent`.
3. Framework Preset: **Next.js** (זוהה אוטומטית).
4. אל תוסיף Environment Variables בינתיים (נוסיף בהמשך).
5. `Deploy` — ייקח ~90 שניות.
6. תקבל URL זמני: `generagent.vercel.app`. תפתח אותו — ה-Landing חי!

---

## שלב 4 · חיבור הדומיין generagent.io (10 דק׳)

### ב-Vercel
1. Project → `Settings` → `Domains`.
2. הוסף `generagent.io` ו-`www.generagent.io`.
3. Vercel יציג לך הוראות DNS.

### ב-GoDaddy
1. כנס ל-`https://dcc.godaddy.com/control/portfolio` → `generagent.io` → `DNS`.
2. **מחק** רשומות `A` ו-`CNAME` ברירת מחדל ש-GoDaddy יצרה.
3. **הוסף 2 רשומות:**
   - `Type: A` · `Name: @` · `Value: 76.76.21.21` · TTL: 1 hour
   - `Type: CNAME` · `Name: www` · `Value: cname.vercel-dns.com` · TTL: 1 hour
4. שמור. SSL ייווצר ע"י Vercel תוך 5-30 דק׳ (Let's Encrypt).

✅ **אחרי 30 דק׳** — `https://generagent.io` יפתח את ה-Landing שלך.

---

## שלב 5 · Supabase (15 דק׳ — לפני Phase 2)

1. צור חשבון ב-[supabase.com](https://supabase.com).
2. `New Project`:
   - Name: `generagent`
   - DB Password: שמור בצד (בעוז סיסמה)
   - Region: `Europe (Frankfurt)` או `Europe (London)` — קרוב לישראל
3. אחרי שהפרויקט נוצר — `Settings` → `API`:
   - העתק `Project URL` (נראה כמו `https://xxxx.supabase.co`)
   - העתק `anon public key`
   - העתק `service_role secret key` (סוד! אל תחשוף בקוד)

---

## שלב 6 · Anthropic API key (5 דק׳)

1. כנס ל-[console.anthropic.com](https://console.anthropic.com).
2. `API Keys` → `Create Key`.
3. שם: `generagent-prod`. העתק את ה-key (יוצג פעם אחת בלבד).
4. הוסף קרדיט: `Settings` → `Billing` → התחל עם $10-20.

---

## שלב 7 · Environment variables ב-Vercel

חזור ל-Vercel → Project → `Settings` → `Environment Variables`. הוסף:

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | מה-Supabase | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key | All |
| `SUPABASE_SERVICE_ROLE_KEY` | service role (סוד!) | All |
| `ANTHROPIC_API_KEY` | מ-Anthropic | All |
| `NEXT_PUBLIC_APP_URL` | `https://generagent.io` | Production |

אחרי שמירה — `Deployments` → 3 נקודות ליד הdeployment האחרון → `Redeploy`.

---

## איפה אנחנו עכשיו

- ✅ Phase 0: Next.js scaffold + design tokens
- ✅ Phase 1: Landing page חי
- ⏳ Phase 2: Auth + Legal Gate (הבא)
- ⏳ Phase 3: Dashboard + Supabase schema
- ⏳ Phase 4: Bot interface + Claude API
- ⏳ Phase 5: Package generation
- ⏳ Phase 6: Production launch

אחרי שעשית את שלבים 1-4 — תגיד לי "מוכן" ואמשיך לבנות את Phase 2.

---

## הערה על Google Fonts בסנדבוקס

הסביבה שבה אני רץ כאן חוסמת את Google Fonts CDN, אז `npm run build` נכשל פה — אבל **Vercel ירוץ בלי בעיה** (להם יש גישה ל-CDN). אם תרצה לבדוק build מקומי לפני שאתה דוחף, נעבור ל-self-hosted fonts (להעתיק את ה-woff2 ל-`/public/fonts/`).
