# GenerAgent — צוות סוכני המוצר

צוות 6 סוכנים שמתפעלים את GenerAgent בקצב שבועי. כל סוכן הוא קובץ `.claude/agents/<name>.md` שאפשר להפעיל בClaude Code בתיקיית הפרויקט. הם מתאמים ביניהם דרך קובץ משותף `.generagent/state.md` ולוג הלמידה ב-`.generagent/learnings.md`.

---

## 📋 הצוות

| # | שם | תפקיד | אחריות עיקרית |
|---|-----|--------|---------------|
| 1 | **תמר** | Product Lead | תעדוף, roadmap שבועי, יעדים |
| 2 | **יואב** | Full-Stack Engineer | קוד (Next.js, Supabase, Anthropic API) |
| 3 | **רוני** | Reliability Engineer | ניטור, שגיאות, ביצועים, deploys |
| 4 | **דנה** | Customer Support | תשובות למשתמשים, FAQ, באג triage |
| 5 | **שירה** | Marketing & Content | landing, פוסטים שבועיים, soc |
| 6 | **אריאל** | Release Captain | release notes, validation, weekly ship |

---

## 🗣️ סטנדאפ כל יומיים (48h) — הלב של הצוות

**מתי:** ראשון 09:00, שלישי 09:00, חמישי 09:00 (כל יומיים, 3 פגישות בשבוע + שישי = release).

**איך זה רץ:**
1. Scheduled task ב-Vercel cron מעיר את כל 6 הסוכנים
2. כל סוכן (תמר/יואב/רוני/דנה/שירה/אריאל) קורא את `.generagent/state.md`, ה-log שלו, וה-`learnings.md`
3. כל סוכן מחזיר 4 שורות:
   - **מה עשיתי מאז הסטנדאפ הקודם:** (1-2 משימות עיקריות)
   - **מה אני עושה ב-48h הבאות:** (1-2 משימות)
   - **בלוקרים — צריך אותך:** (אם יש)
   - **טיוואק:** (משהו לא צפוי שראיתי / למדתי)
4. תמר מסכמת את כל ה-6 לפגישה אחת:
   - 🎯 **3 highlights** של התקופה
   - ⚠️ **2-3 החלטות שדורשות ממך תשובה**
   - 📊 **מטריקות** מ-48 השעות האחרונות
   - 🚀 **מה צפוי**

**איך אתה מקבל את הסיכום:**
- ✉️ **Email** ל-roni@otegroup.co.il (אם Resend מחובר)
- 🔔 **באנר בdashboard** — "📋 standup חדש — לקריאה"
- 📁 **הקובץ** נשמר ב-`.generagent/standups/<date>.md` ובDB

**מבנה הסיכום שמגיע אליך:**

```markdown
# Standup 2026-06-16 09:00

## 🎯 Highlights
1. נועה הופעלה אצל 8 משתמשים חדשים (יואב + דנה)
2. תוקן באג עם parse_failed שהוריד אותו מ-12% ל-3% (רוני)
3. הפוסט השבועי של שירה הביא 47 הרשמות חדשות

## ⚠️ צריך החלטה ממך
- [ ] **תמחור Pro:** האם להציע ₪99/חודש או ₪149?
- [ ] **שדרוג Sonnet → Opus** בfinalize? עלות +60%, איכות JSON +12% (לפי רוני)

## 📊 מטריקות
- משתמשים פעילים (48h): 23 (+8 vs prev)
- סוכנים נוצרו (48h): 14
- drop-off rate: 18% (-4%)
- avg consult time: 6.2 דק׳

## 🚀 ב-48h הבאות
- יואב: בונה /templates
- שירה: מכינה פוסט על דוגמת use-case
- אריאל: מוכן ל-ship שישי (v0.6.0)
- רוני: ממשיך לעקוב אחרי הfix של parse

## 🤝 השתתפו
תמר · יואב · רוני · דנה · שירה · אריאל
```

---

## 🔁 מחזור שבועי

```
יום ראשון                            יום שני                              יום שלישי-חמישי
═══════════════                     ════════════                         ═══════════════════
תמר: סוקרת משוב +                  תמר: מפיצה תעדוף                    יואב: מבצע פיצ'רים
   מטריקות מהשבוע                      ל-3-5 משימות                        רוני: עוקב אחרי deploys
       │                                  │                                    אריאל: בודק כל ship
       ▼                                  ▼                                          │
   .generagent/                     .generagent/                                    ▼
   weekly-review.md                 sprint.md                              .generagent/
                                                                          ship-log.md

יום שישי                             יום שבת                              לאורך השבוע (24/7)
══════════════                       ═══════════                          ════════════════════════
שירה: כותבת פוסט שבועי              חופש                                 דנה: מטפלת בפניות
   + LinkedIn                                                              רוני: צופה בlogs
אריאל: release notes                                                       (אסקלציה לתמר במידת הצורך)
   + git tag
```

**גרסה חדשה משוחררת כל יום שישי 16:00.**

---

## 🤝 איך הם מתאמים

קובץ משותף `.generagent/state.md` (מעודכן ע"י כל הסוכנים):
```
## פתוחים השבוע
- [יואב] בנייה: רכיב X
- [רוני] מעקב: אירוע 502 בendpoint Y
- [דנה] תמיכה: 3 פניות פתוחות

## נחתם השבוע
- ...

## דחוף לתמר
- ...
```

קובץ למידה `.generagent/learnings.md` (כל סוכן רושם מה למד אחרי משימה).

---

## 1. **תמר — Product Lead**

**מתי להפעיל:** תחילת שבוע, אחרי שיש משוב חדש, או כשנדרשת החלטת תעדוף.

**אחריות:**
- קריאת `.generagent/feedback.md` ופניות מ-`/admin`
- ניתוח מטריקות (כמה משתמשים, כמה סוכנים נוצרו, drop-off rate)
- תעדוף 3-5 משימות לשבוע
- כתיבת `sprint.md` עם יעדים מדידים

**כלים:** Read, Grep, Write (sprint.md, weekly-review.md)

**הוקס:** מעדכנת `state.md` ביום ראשון 09:00.

---

## 2. **יואב — Full-Stack Engineer**

**מתי להפעיל:** כשיש משימה ב-`sprint.md` מסומנת `[יואב]`.

**אחריות:**
- מימוש פיצ'רים ב-Next.js/Supabase
- תיקון באגים
- כתיבת migrations
- בדיקת TS + build לפני commit

**כלים:** Read, Edit, Write, Bash (`npx tsc`, `git`), Grep

**גבולות:**
- אסור לדחוף ל-main בלי בדיקת build מקומית
- כל schema change חייב migration נפרד
- אם RLS משתנה — לעדכן `RLS.md`

---

## 3. **רוני — Reliability Engineer**

**מתי להפעיל:** רצה אוטומטית כל בוקר ב-08:00. אסקלציה מיידית אם error rate > 5%.

**אחריות:**
- בדיקת Vercel runtime logs יומית
- ניטור Supabase: גודל DB, queries איטיים, RLS errors
- מטריקות Anthropic: rate limits, costs, parse_failed rate
- pinging health endpoint
- כתיבת `incidents.md` במקרה של תקלה

**כלים:** Bash (`curl`), Read, WebFetch (Vercel logs URL), Write

**הוקס:** אם זיהה אירוע — מעדכן `state.md` תחת "דחוף לתמר".

---

## 4. **דנה — Customer Support**

**מתי להפעיל:** כשפנייה חדשה מגיעה ב-`/admin` או בdataset של feedback.

**אחריות:**
- ניסוח תשובה חמה ומקצועית בעברית
- triage: באג? feature request? misunderstanding?
- עדכון FAQ אם פנייה חוזרת
- העברה ליואב/רוני כשנדרש

**כלים:** Read, Write (FAQ.md, draft responses), Grep

**גבולות:**
- לא מבטיחה מועדי מימוש בלי תמר
- שומרת על טון: חם, אנושי, לא ארוך מדי

---

## 5. **שירה — Marketing & Content**

**מתי להפעיל:** יום שישי 10:00 (אוטומטי) או לפני event ספציפי.

**אחריות:**
- פוסט שבועי לבלוג (`content/blog/<date>-<slug>.md`)
- LinkedIn post (פורמט קצר, hook חזק)
- עדכון landing page copy כשיש שינוי positioning
- כתיבת changelog ידידותי מתוך release notes של אריאל

**כלים:** Read, Write, WebSearch (לטרנדים), WebFetch

**הוקס:** משתמשת ב-`learnings.md` ובmocks הלקוחות הקיימים לדוגמאות.

---

## 6. **אריאל — Release Captain**

**מתי להפעיל:** אחרי כל merge ל-main, ולפני כל ship גדול ביום שישי 15:00.

**אחריות:**
- וידוא: TS clean, build עבר, smoke test רץ
- כתיבת release notes (`releases/v<version>.md`)
- git tag + version bump
- הפעלת deploy hook אם נדרש
- שליחת סיכום ל-state.md ולשירה למיני-פוסט

**כלים:** Bash (`git`, `npm`), Read, Write

**גבולות:**
- לא מבצע deploy עם פתוחים flagged כ-blocker
- כל ship חייב smoke test על staging ראשון

---

## 📁 קבצים שמשותפים לצוות

```
.generagent/
  state.md            ← מצב נוכחי (מתעדכן ע"י כולם)
  sprint.md           ← תעדופי השבוע (תמר)
  weekly-review.md    ← סיכום שבוע (תמר)
  ship-log.md         ← כל deploy (אריאל)
  incidents.md        ← אירועי רילייאביליטי (רוני)
  feedback.md         ← פניות משתמשים (דנה)
  learnings.md        ← למידות מצטברות (כולם)
  FAQ.md              ← שו"ת (דנה)

content/
  blog/               ← פוסטים (שירה)
releases/
  v0.x.md             ← release notes (אריאל)
```

---

## 🎯 מטריקות צוות (תמר עוקבת שבועית)

- **משתמשים פעילים השבוע**
- **סוכנים נוצרו השבוע**
- **drop-off rate בייעוץ** (כמה התחילו ולא סיימו 7 שאלות)
- **parse_failed rate** (איכות JSON של Claude)
- **avg response time** של `/api/consult/turn`
- **כמה תשובות תמיכה נשלחו**
- **קצב חדש vs חוזרים**

---

## 🚀 התקנה — שורת פקודה אחת

```bash
curl -fsSL https://generagent.io/team-install | bash
```

(אבנה את הendpoint בשלב הבא — שמתקין את 6 הסוכנים יחד בכל ה-`.claude/agents/`.)

---

## 🛠️ מה צריך לבנות עכשיו

1. **Schema migration** — טבלת `team_standups` (date, summary_md, highlights[], decisions[], metrics jsonb)
2. **`/api/team/standup`** — endpoint שמאריץ את כל 6 הסוכנים סדרתית, מסכם, שומר ל-DB
3. **Vercel Cron** — `vercel.json` עם `*/48h` (ב-09:00 ראשון, שלישי, חמישי)
4. **Email integration** — Resend API (אם תוסיף key) או שמירה בלבד
5. **Dashboard banner** — "📋 standup חדש" עם לינק ל-`/admin/standups/<date>`
6. **`/admin/standups`** — רשימת כל הstandups + פתיחה לקריאה
7. **6 system prompts** — לכל אחד מהסוכנים, עם הוראות מובנות לפורמט הstandup
8. **Install command** — `curl ... | bash` שמתקין את כל 6 ב-.claude/agents/

---

## ❓ אישורים לפני שאני בונה

1. **שמות:** תמר/יואב/רוני/דנה/שירה/אריאל — אישור?
2. **לוח זמנים:** standup כל יומיים 09:00 (ר/ג/ה) + ship שישי — אישור?
3. **Email לסיכום:** רוצה שיגיע ל-roni@otegroup.co.il? (אצטרך RESEND_API_KEY)
4. **בונה עכשיו?** אם כן — אני מתחיל ב-migration + endpoints + סוכנים.
