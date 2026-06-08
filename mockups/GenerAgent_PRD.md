# GenerAgent — מסמך תכנון מוצר (PRD)

**גרסה:** 1.0
**תאריך:** 8 ביוני 2026
**בעלים:** Roni Apter
**סטטוס:** טיוטה לאישור

---

## 1. תקציר מנהלים (Executive Summary)

**GenerAgent** היא פלטפורמת ווב בעברית/אנגלית שמייצרת **חבילות סוכן מותאמות אישית** עבור Claude Code ו-OpenAI Codex CLI. במקום שמשתמש יצטרך להבין לבד אילו skills, agents, ו-MCP connectors הוא צריך — בוט הייעוץ של GenerAgent מראיין אותו כיועץ עסקי, מבין את התפקיד, סדר היום, ותחומי האחריות, ומפיק חבילת ZIP מוכנה להתקנה עם הוראות צעד-אחר-צעד.

**הצעת ערך מרכזית:** "ספר לי על העבודה שלך — אני אכין לך את הסוכן המושלם."

**מודל עסקי מומלץ:** Freemium — חבילה אחת בחינם, מנוי חודשי לחבילות נוספות + עדכונים.

---

## 2. הבעיה והפתרון

### 2.1 הבעיה
- כלי AI Coding Agents (Claude Code, Codex) הפכו נגישים מאוד, אבל **רוב המשתמשים לא יודעים מה לבנות איתם**.
- קיימת פערה בין יכולת טכנית (קל ליצור skill) לבין הבנה עסקית (איזה skill באמת אפנה אליו 5 פעמים ביום?).
- משתמשים לא-טכניים מתקשים בהתקנת MCP, הגדרת OAuth, ועריכת קבצי הגדרה.
- אין היום מוצר שמתרגם **תיאור עבודה אנושי → חבילת אוטומציה מוכנה**.

### 2.2 הפתרון
בוט שיחה (Conversational Onboarding) מבוסס Claude שמראיין את המשתמש ב-7-12 שאלות חכמות, מנתח את הצרכים, ומפיק:
1. **חבילת קבצים מובנית** (skills, agents, MCP config, settings.json, AGENTS.md).
2. **מדריך התקנה מותאם** (markdown + סרטון hover) בשפה פשוטה.
3. **רשימת חיבורי OAuth** עם הוראות פעולה כמו "פתח את Google Calendar והעתק את ה-Client ID".
4. **הסכם משפטי מחייב** שהמשתמש חותם עליו לפני הורדה.

---

## 3. קהל יעד (Personas)

| Persona | תיאור | Pain Point | מה הוא ירוויח |
|---------|--------|------------|----------------|
| **רואה החשבון** | רו"ח עצמאי, 35-55, מנהל 40 לקוחות | מבזבז 5ש' ביום על מיילים ותזכורות | סוכן שמסכם מיילים, פותח משימות ב-Asana, בודק לוח שנה |
| **המנהל החרדי** | בעל עסק, 30-50, חלש בטכנולוגיה | פוחד לפתוח טרמינל | חבילה עם installer גרפי, הוראות וויזואליות |
| **המפתח החדש** | Junior Dev, יודע קוד אבל לא MCP | מבולבל מהאקוסיסטם | חבילה שעובדת מהקופסה |
| **יועץ ארגוני** | מנהל פרויקטים, משתמש כבד ב-Notion/Slack | רוצה אוטומציה אך לא טכני | סוכן מותאם לוורקפלואו שלו |

---

## 4. חזון המוצר (Product Vision)

> *"בעוד שלוש שנים, כל איש מקצוע יוכל להגיד לבוט מה הוא עושה ביום-יום, ולקבל סוכן AI אישי שעובד בשבילו — בלי לדעת קוד, בלי להבין MCP, ובלי לפתוח טרמינל."*

**עקרונות מנחים:**
1. **בהירות לפני שלמות** — מדריך התקנה ברור עדיף על feature מורכב.
2. **חסר משפטית = מוות** — כל חבילה חתומה דיגיטלית עם disclaimer.
3. **דמיון ל-Claude Code** — UI שחור/אפור, monospaced, מינימליסטי.
4. **אופציות שמרניות** — לא מציעים חיבורי בנק, רק כלי פרודוקטיביות.

---

## 5. תכונות מרכזיות (Core Features)

### 5.1 Tier 1 — MVP (חובה לשחרור)
1. **Auth & Legal Gate** — הרשמה + חתימה על תנאי שימוש (Click-wrap).
2. **Consultation Bot** — שיחה מובנית בת 7-12 שאלות, מבוססת Claude API.
3. **Needs Analyzer** — סוכן רקע שמנתח את התשובות וממליץ על 1-3 ארכיטיפי סוכנים.
4. **Package Builder** — יצירת ZIP עם קבצי skills/agents/MCP/settings.
5. **Install Guide Generator** — markdown מותאם אישית, בעברית, עם screenshots placeholders.
6. **Dashboard** — היסטוריית חבילות, הורדה חוזרת.

### 5.2 Tier 2 — Phase 2
7. **MCP Marketplace Integration** — בחירה מויזואלית של connectors (Gmail, Calendar, Slack...).
8. **Package Versioning** — עדכון חבילה כשהמשתמש מוסיף תפקידים.
9. **Team Mode** — חבילה משותפת לצוות.
10. **Analytics on Usage** — איזה skills באמת רץ.

### 5.3 Tier 3 — Future
11. **One-click Install** (CLI installer ייעודי שמתבסס על החבילה).
12. **Marketplace ציבורי** של חבילות שיתופיות.
13. **Self-Improving Packages** — A/B testing על prompts.

---

## 6. זרימת המשתמש (User Flows)

### 6.1 Flow ראשי — יצירת חבילה
```
Landing Page
    ↓
[Sign Up / Login]  ← Google OAuth (מומלץ — ראה סעיף 8)
    ↓
[Legal Acceptance Gate]  ← חובה לחתימה דיגיטלית
    ↓
[Welcome + פלטפורמת יעד]  ← Claude Code? Codex? שניהם?
    ↓
[Consultation Bot — 7-12 שאלות]
    ├─ במה אתה עובד? (תפקיד)
    ├─ באיזה ארגון? (סולו/חברה/צוות)
    ├─ תאר יום עבודה טיפוסי
    ├─ 3 משימות שגוזלות הכי הרבה זמן
    ├─ אילו כלים אתה משתמש? (Gmail, Calendar, Slack, Notion...)
    ├─ מה רמת הנוחות שלך עם טרמינל? (1-5)
    ├─ יש לך נתונים רגישים? (כן/לא → משפיע על המלצות)
    └─ תוצאה רצויה (חיסכון זמן / איכות / חידוש)
    ↓
[Analysis Spinner]  ← Claude מנתח, ממליץ על 3 ארכיטיפים
    ↓
[Recommendation Screen]
    ├─ ארכיטיפ A: "Personal Assistant"
    ├─ ארכיטיפ B: "Email Manager"
    └─ ארכיטיפ C: "Project Manager"
    ↓
[User Selects + מתאים]
    ↓
[Connector Wizard]  ← אם נדרש OAuth: הוראות פותחים מסך
    ↓
[Package Build]  ← יצירת ZIP בשרת
    ↓
[Download + Install Guide]  ← קבצי .md + .zip
    ↓
[Dashboard]  ← היסטוריה ועדכונים
```

### 6.2 Flow משני — חזרה למוצר
```
Dashboard → "החבילות שלי" → "ערוך" / "הורד שוב" / "חבילה חדשה"
```

---

## 7. ארכיטקטורה טכנית (Technical Architecture)

### 7.1 Stack מומלץ
| שכבה | טכנולוגיה | סיבה |
|------|----------|------|
| **Frontend** | Next.js 14 (App Router) + React 18 + TypeScript | מודרני, SSR, deployment קל |
| **UI Components** | shadcn/ui + Tailwind CSS | קל להתאים לעיצוב Claude Code |
| **Theme** | Dark mode default (#0a0a0a bg, #e5e5e5 text, JetBrains Mono) | זהה ל-Claude Code |
| **Backend** | Next.js API Routes + Edge Functions | פשוט, מאוחד |
| **Auth** | **Supabase Auth + Google OAuth** (המלצה) | מאוחד עם DB, חינמי עד 50K MAU |
| **Database** | Supabase (Postgres) | מנוהל, RLS, real-time |
| **LLM** | Anthropic Claude API (Sonnet 4.6 לבוט, Opus 4.6 לניתוח) | API ישיר כפי שביקשת |
| **File Storage** | Supabase Storage | חבילות ZIP, גרסאות |
| **Package Building** | Node.js zip stream (archiver lib) | פשוט וזריז |
| **Legal Signing** | DocuSeal Self-hosted / Click-wrap בסיסי + Audit Log | proof of consent |
| **Email** | Resend | אישורים, התראות |
| **Hosting** | Vercel | אינטגרציה מובנית עם Next.js |
| **Monitoring** | Sentry + Vercel Analytics | שגיאות + תפקוד |

### 7.2 דיאגרמת רכיבים (Component Diagram)
```
┌─────────────────────────────────────────────┐
│              Browser (Next.js)              │
│  Landing | Bot UI | Dashboard | Builder UI │
└────────────────┬────────────────────────────┘
                 │ HTTPS
                 ▼
┌─────────────────────────────────────────────┐
│         Next.js API / Edge Functions        │
│  /auth  /bot  /analyze  /build  /download   │
└──┬───────────┬───────────┬───────────┬─────┘
   ▼           ▼           ▼           ▼
┌──────┐  ┌────────┐  ┌─────────┐  ┌────────┐
│Supa- │  │Claude  │  │Package  │  │Storage │
│base  │  │API     │  │Builder  │  │(ZIPs)  │
│(DB+  │  │(LLM)   │  │(Node)   │  │        │
│Auth) │  │        │  │         │  │        │
└──────┘  └────────┘  └─────────┘  └────────┘
```

### 7.3 ההמלצה לאימות
**Supabase Auth + Google OAuth** — בחירה זו עדיפה כי:
- חינמי עד 50,000 משתמשים פעילים
- מובנה עם ה-DB → RLS (Row Level Security) פר משתמש
- Magic Link + Google + Email בקליק
- Audit log אוטומטי לצרכים משפטיים
- אם תרצה לעבור ל-Clerk בעתיד — קל

---

## 8. סכימת בסיס נתונים (Database Schema)

```sql
-- משתמשים (מנוהל ע"י Supabase Auth)
auth.users (
  id uuid PRIMARY KEY,
  email text UNIQUE,
  created_at timestamptz
);

-- פרופיל מורחב
profiles (
  user_id uuid PK REFERENCES auth.users,
  display_name text,
  role_summary text,           -- "רואה חשבון עצמאי"
  technical_comfort int,        -- 1-5
  preferred_platform text[],    -- ['claude-code', 'codex']
  legal_accepted_at timestamptz,
  legal_version text,           -- 'v1.0'
  legal_ip text,
  legal_user_agent text
);

-- שיחות ייעוץ
consultations (
  id uuid PK,
  user_id uuid REFERENCES profiles,
  status text,                  -- 'in_progress' | 'analyzed' | 'completed'
  started_at timestamptz,
  completed_at timestamptz,
  messages jsonb,               -- היסטוריית השיחה המלאה
  analysis jsonb                -- פלט הניתוח של Claude
);

-- חבילות שנוצרו
packages (
  id uuid PK,
  consultation_id uuid REFERENCES consultations,
  user_id uuid REFERENCES profiles,
  name text,                    -- "Personal Assistant for רואה חשבון"
  target_platform text,         -- 'claude-code' | 'codex' | 'both'
  archetype text,               -- 'personal-assistant'
  manifest jsonb,               -- מבנה הקבצים
  zip_storage_path text,        -- נתיב ב-Supabase Storage
  install_guide_md text,        -- המדריך המלא
  version int DEFAULT 1,
  required_connectors text[],   -- ['gmail', 'calendar']
  created_at timestamptz,
  legal_snapshot jsonb          -- העתק של ה-TOS באותו רגע
);

-- ארכיטיפים (templates)
archetypes (
  id text PK,                   -- 'personal-assistant'
  name_he text,
  description_he text,
  base_skills jsonb,
  base_agents jsonb,
  required_mcp text[]
);

-- אירועי חתימה משפטית
legal_signatures (
  id uuid PK,
  user_id uuid,
  package_id uuid,
  document_version text,
  signed_at timestamptz,
  ip_address text,
  user_agent text,
  document_snapshot text        -- הטקסט המלא של ההסכם
);

-- לוג שימוש (ל-analytics + legal)
events (
  id uuid PK,
  user_id uuid,
  event_type text,              -- 'package_downloaded', 'bot_started'
  metadata jsonb,
  created_at timestamptz
);
```

---

## 9. תכנון הבוט (Adaptive Consultation Engine)

### 9.1 פילוסופיה — סוקרטי, לא שאלון

הבוט **אינו** שואל 12 שאלות קבועות. רוב המשתמשים אינם יודעים מראש איזה סוכן הם צריכים — לכן הבוט פועל כיועץ סוקרטי: שאלה רחבה → ניתוח התשובה → שאלה הבאה מותאמת. כל שאלה מלוּוה ב**מיקרו-הסבר** שעוזר למשתמש להבין למה היא נשאלת ("שאלה זו תעזור לי להבין אם הסוכן צריך לקרוא PDFs").

המנוע בנוי משלושה שלבים פרוגרסיביים עם **גבולות קשים** למניעת לופ אינסופי.

### 9.2 שלושת השלבים

#### Phase 1 — Discovery (3-4 שאלות, תמיד נשאלות)
מטרה: לבנות תמונה כללית של המשתמש. השאלות פתוחות וקצרות.

| שלב | שאלה דוגמה | מטרת ניתוח |
|------|-----------|-------------|
| D1 | "ספר לי בכמה משפטים — מה אתה עושה ביום-יום בעבודה?" | זיהוי persona ראשוני |
| D2 | "אם הייתה לך עוד שעה ביום, מה היית עושה איתה?" | חשיפת pain point לא מוכר |
| D3 | "אילו אפליקציות אתה פותח הכי הרבה בשעות העבודה?" | mapping ל-MCP אפשריים |
| D4 | *(אופציונלי)* "עם מי אתה הכי הרבה במגע — לקוחות, צוות, ספקים?" | scope |

**Checkpoint:** Claude מנתח את 3-4 התשובות ומחזיר `persona_confidence` (0-1) + `detected_archetypes` (1-3).

#### Phase 2 — Deep Dive (3-7 שאלות, מסתעפות לפי persona)
מטרה: לדייק את התת-קטגוריה. השאלות נבחרות **דינמית** מבנק שאלות מתויג.

**דוגמה — אם זוהה "Knowledge Worker":**
- "מתוך המיילים שלך, איזה אחוז הוא ספאם/לא רלוונטי?"
- "כשמישהו שולח לך מסמך לאישור — כמה זמן עובר עד שאתה מגיב?"
- "האם אתה מחפש מידע ישן ב-Gmail/Slack לעיתים קרובות?"

**דוגמה — אם זוהה "Manager":**
- "כמה פגישות יש לך בשבוע, ועל כמה מהן יש לך סיכום?"
- "איך אתה עוקב אחרי משימות של אנשי הצוות?"
- "מה קורה כשמישהו מסיים משימה — מי מעדכן את הסטטוס?"

**דוגמה — אם זוהה "Creator/Marketer":**
- "כמה זמן לוקח לך להוציא פוסט מהרעיון ועד הפרסום?"
- "איפה אתה אוסף השראה?"

המנוע משתמש ב-**branching graph** סטטי (לא רשימה) שמוגדר ב-config וניתן לעדכן ללא deploy.

**Checkpoint:** Claude מחזיר `confidence_per_archetype` + `should_continue` (boolean).

#### Phase 3 — Refinement & Confirmation (1-4 שאלות)
מטרה: לסגור פערים אחרונים ולוודא הסכמה. **כאן הבוט מציג את ההמלצה הראשונית** ושואל שאלות מכוונות.

```
הבוט: "על סמך מה שספרת לי, אני חושב שתועיל לך אחת מ-3 חבילות אלה:

  [A] Personal Email Assistant — מסכם מיילים, מוציא משימות
  [B] Meeting Co-pilot — מסכם פגישות, עוקב אחרי החלטות
  [C] Knowledge Hub — מחפש במיילים/דרייב/סלאק

כדי לדייק — האם רוב הזמן שלך הוא תקשורת (A), פגישות (B), או חיפוש מידע (C)?"
```

לאחר בחירה: 1-2 שאלות גימור (רמת טכניות, תקציב, רגישות נתונים).

### 9.3 גבולות קשים (Guardrails)

| גבול | ערך | מטרה |
|------|-----|------|
| `MAX_QUESTIONS_TOTAL` | **15** | מניעת לופ אינסופי |
| `MIN_QUESTIONS_TOTAL` | **7** | מניעת המלצה רדודה |
| `EARLY_EXIT_CONFIDENCE` | **0.85** | אם הביטחון גבוה — דלג ישר ל-Phase 3 |
| `MAX_TIME_MINUTES` | **8** | אם המשתמש איטי — הצעת המשך מאוחר |
| `MAX_RETRIES_PER_QUESTION` | **2** | אם התשובה לא ברורה — נסה לנסח אחרת ואז עבור הלאה |
| `FALLBACK_ARCHETYPE` | `general-assistant` | אם הביטחון נשאר נמוך → ברירת מחדל |

### 9.4 לוגיקה לבחירת השאלה הבאה

```typescript
function nextQuestion(state: ConsultationState): Question | null {
  // 1. Hard cap check
  if (state.questionCount >= MAX_QUESTIONS_TOTAL) {
    return null; // → forced finalize
  }

  // 2. Early exit
  if (state.questionCount >= MIN_QUESTIONS_TOTAL
      && state.maxConfidence >= EARLY_EXIT_CONFIDENCE) {
    return null;
  }

  // 3. Phase routing
  if (state.phase === 'discovery' && state.questionCount < 4) {
    return getNextDiscoveryQuestion(state);
  }

  if (state.phase === 'deep_dive') {
    const candidates = getDeepDiveCandidates(state.detectedPersona);
    return pickBestQuestion(candidates, state.answeredIds, state.gaps);
  }

  if (state.phase === 'refinement') {
    return getRefinementQuestion(state.topArchetypes, state.openGaps);
  }

  return null;
}
```

### 9.5 בנק השאלות (Question Library structure)
כל שאלה מוגדרת כאובייקט עם metadata עשיר:

```yaml
- id: deep_dive_email_volume
  phase: deep_dive
  applies_to: [knowledge-worker, manager, marketer]
  blocks_if_answered: [d3_apps_used]
  text_he: "באיזה תדירות אתה בודק מיילים?"
  micro_explanation_he: "שאלה זו תעזור לי להבין אם אתה צריך סוכן שמסנן או רק מסכם"
  input_type: chips
  options: ['כל שעה', 'כמה פעמים ביום', 'פעם ביום', 'פחות']
  signal_weight:
    needs_email_triage: 0.4
    needs_priority_inbox: 0.3
  follow_up_if:
    'כל שעה': prompt_email_overload_detail
```

### 9.6 פלט הניתוח (Analyzer Schema)
```json
{
  "persona_match": "knowledge-worker-solo",
  "confidence": 0.88,
  "questions_asked": 9,
  "phase_completed": "refinement",
  "recommended_archetypes": [
    {
      "id": "personal-email-assistant",
      "score": 0.92,
      "rationale": "המשתמש פותח Gmail 15+ פעמים ביום ומתאר 'הצפת מיילים' כ-pain point"
    }
  ],
  "required_skills": ["email-triage", "task-extractor", "calendar-summary"],
  "required_mcps": ["gmail", "google-calendar"],
  "warnings": ["נתונים רגישים זוהו — מומלץ instance מקומי"],
  "estimated_install_time_min": 15,
  "open_questions": []
}
```

### 9.7 State Machine — סקיצה
```
[Welcome]
   ↓
[Discovery: D1] → [Discovery: D2] → [Discovery: D3] → (D4?)
   ↓
[Persona Detection by Claude]
   ↓
[Deep Dive: Q1...Qn]  ← branching tree per persona
   ↓                    ← early-exit if confidence > 0.85
[Tentative Recommendation Preview]
   ↓
[Refinement: 1-4 Qs]
   ↓
[Final Confirmation]
   ↓
[→ Build]
```

---

## 10. מנוע יצירת החבילה (Package Builder)

### 10.1 מבנה חבילת Claude Code
```
my-agent-package/
├── README.md                  # מדריך התקנה ראשי (עברית)
├── INSTALL.md                 # צעד-אחר-צעד
├── LEGAL.md                   # תנאי שימוש חתומים
├── .claude/
│   ├── settings.json          # config
│   ├── agents/
│   │   └── personal-assistant.md
│   └── skills/
│       ├── email-triage/
│       │   └── SKILL.md
│       └── calendar-summary/
│           └── SKILL.md
├── mcp/
│   └── mcp.json               # MCP servers config
└── scripts/
    └── install.sh             # התקנה אוטומטית
```

### 10.2 מבנה חבילת Codex CLI
```
my-agent-package-codex/
├── AGENTS.md                  # הוראות לסוכן
├── README.md
├── codex.config.toml
└── prompts/
    └── ...
```

### 10.3 Builder Logic (Pseudo)
```typescript
function buildPackage(analysis: Analysis, platform: Platform): Buffer {
  const archetype = getArchetype(analysis.recommended_archetypes[0].id);
  const skills = composeSkills(archetype, analysis.required_skills);
  const agents = composeAgents(archetype, analysis.persona_match);
  const mcpConfig = buildMcpConfig(analysis.required_mcps);
  const installGuide = renderInstallGuide({
    archetype, skills, mcps: analysis.required_mcps,
    technicalLevel: analysis.technical_comfort,
    locale: 'he'
  });
  const legalDoc = renderLegalSnapshot(user, package);

  return zipStream([
    ...skills, ...agents, mcpConfig, installGuide, legalDoc
  ]);
}
```

---

## 11. שכבה משפטית (Legal Layer) — *קריטי*

### 11.1 מסמכים נדרשים
1. **Terms of Service (TOS)** — חתימה חובה בכניסה
2. **Privacy Policy** — תקנון פרטיות, GDPR-ready
3. **Disclaimer per Package** — צמוד לכל ZIP בקובץ `LEGAL.md`
4. **AI Disclaimer** — "התוצאות לא מוערכות, אנא בדוק לפני שימוש"

### 11.2 סעיפים חיוניים ב-TOS
- **No Warranty** — "AS IS", ללא אחריות לאיכות/דיוק/התאמה למטרה
- **Limitation of Liability** — אחריות מקסימלית = סכום ששולם ב-12 חודשים אחרונים
- **User Responsibility** — המשתמש אחראי בלעדית לסוכן ולכל פעולה שלו
- **No Financial/Medical Advice** — איסור שימוש לסוכנים שמייעצים בכספים/בריאות
- **Data Processing** — מה אנו שומרים (תשובות בוט), מה לא (תוכן שהסוכן מעבד)
- **Indemnification** — המשתמש משפה אותך מתביעות
- **Governing Law** — חוק ישראלי, סמכות שיפוט תל אביב
- **Right to Terminate** — זכותך לסיים שירות בכל עת

### 11.3 מנגנון Click-wrap מאובטח
- Checkbox עם טקסט מודגש (לא pre-checked)
- שמירת snapshot של הטקסט + IP + timestamp + UA ב-`legal_signatures`
- **Wet signature equivalent** — בית משפט ישראלי מכיר ב-click-wrap אם הוכחת modal/visibility ברורה
- **המלצה:** התייעצות עם עו"ד הייטק לפני שחרור (לא נכלל כאן — דרושה ייעוץ אנושי)

### 11.4 Per-Package Legal Snapshot
כל חבילה כוללת קובץ `LEGAL.md` שמכיל:
- שם המשתמש שהזמין
- תאריך + IP החתימה
- גרסת ה-TOS שאליה הסכים
- Hash של החבילה (לאימות שלא שונתה)

---

## 12. UI/UX — עיצוב בסגנון Claude Code

### 12.1 פלטה
- **רקע ראשי:** `#0A0A0A`
- **רקע משני:** `#171717`
- **טקסט ראשי:** `#E5E5E5`
- **טקסט משני:** `#A3A3A3`
- **Accent:** `#D97757` (כתום-אנתרופיק) או `#FAFAFA` (לבן מינימליסטי)
- **Success:** `#4ADE80`
- **Error:** `#F87171`

### 12.2 טיפוגרפיה
- **UI:** Inter (sans-serif)
- **קוד / Bot:** JetBrains Mono / Berkeley Mono
- **Bot interface:** monospace gives the "terminal-like" Claude Code feeling

### 12.3 מסכים מרכזיים
1. **Landing** — עמוד חשוך, כותרת ענקית "GenerAgent", CTA אחד.
2. **Auth** — מודאל קומפקטי, Google sign-in primary.
3. **Legal Gate** — מסך מלא, scrollbox עם ה-TOS, checkbox + "Accept & Continue".
4. **Bot UI** — דמוי טרמינל, כל שאלה מופיעה ב-typewriter effect, תשובה כ-input חופשי או multi-select chips.
5. **Analysis Screen** — animation של "סורק את הצרכים שלך...", ואז 3 כרטיסי ארכיטיפים.
6. **Package Builder UI** — Tree view של הקבצים שעומדים להיווצר, אפשרות edit.
7. **Download Screen** — כפתור ZIP גדול + preview של INSTALL.md.
8. **Dashboard** — list view של חבילות, גרסאות, sort/filter.

### 12.4 רספונסיביות
- Desktop first (קהל היעד עובד מ-laptop)
- Mobile: לפחות Landing + Login + Dashboard

---

## 13. אבטחה ופרטיות (Security & Privacy)

| איום | מיטיגציה |
|------|----------|
| הזרמת prompt injection לבוט | System prompt sandboxed + sanitization |
| גניבת חבילה של משתמש אחר | RLS ב-Supabase לפי `user_id` |
| חשיפת Claude API key | Server-side only, .env, rotation |
| Click-wrap fraud | Snapshot + IP + UA + signed hash |
| GDPR | Right to delete, export data button |
| לוג של שיחות רגישות | הצפנה at-rest + retention 90 ימים |
| Rate limiting | Upstash Redis per IP / user |

---

## 14. מודל עסקי ותמחור (Suggested Pricing)

| Tier | מחיר | כלול |
|------|------|-------|
| **Free** | $0 | חבילה אחת לחיים, ללא עדכונים |
| **Pro** | $19/חודש | חבילות ללא הגבלה, גרסאות, MCP מתקדמים |
| **Team** | $49/חודש | 5 משתמשים, חבילות משותפות |
| **Enterprise** | מותאם | SSO, on-prem option, SLA |

**הצעת ייעוץ:** השאר את ה-MVP **freemium** עם 3 חבילות בחינם כדי לקבל פידבק מהיר.

---

## 15. KPIs

| מדד | יעד 90 יום | יעד 6 חודשים |
|------|------------|---------------|
| Sign-ups | 500 | 5,000 |
| Packages downloaded | 200 | 3,000 |
| Conversion to Paid | 3% | 8% |
| TOS acceptance rate | 100% | 100% |
| Install success rate (self-reported) | 70% | 90% |
| NPS | 30+ | 50+ |

---

## 16. סיכונים ותלות (Risks)

| סיכון | חומרה | מיטיגציה |
|-------|--------|----------|
| Claude API price spike | בינוני | Caching, model fallback, prompt optimization |
| משתמש משתמש בסוכן למשהו אסור | גבוה | TOS חזק, content filter על הבוט |
| Anthropic משנה Claude Code format | בינוני | Adapter layer, versioned templates |
| בעיה משפטית בישראל (LLM ייעוץ) | גבוה | ייעוץ עו"ד hi-tech לפני שחרור |
| MCP servers משתנים | נמוך | Pin versions ב-mcp.json |

---

## 17. Roadmap

### Phase 0 — Foundation (שבועות 1-3)
- [ ] Setup Next.js + Supabase + Vercel
- [ ] עיצוב פלטה ורכיבי UI בסיסיים
- [ ] Auth flow + Legal Gate
- [ ] טיוטת TOS + Privacy + ייעוץ עו"ד

### Phase 1 — MVP Bot (שבועות 4-7)
- [ ] Consultation Bot עם 12 שאלות hardcoded
- [ ] Claude API integration
- [ ] Analyzer logic
- [ ] שלוש ארכיטיפי סוכן בסיסיים

### Phase 2 — Builder (שבועות 8-10)
- [ ] Package Builder (Claude Code)
- [ ] Package Builder (Codex)
- [ ] Install Guide Generator
- [ ] Download flow

### Phase 3 — Polish (שבועות 11-12)
- [ ] Dashboard + history
- [ ] Email notifications
- [ ] Sentry + analytics
- [ ] Soft launch ל-50 משתמשים

### Phase 4 — Scale (חודשים 4-6)
- [ ] Tier 2 features (versioning, team mode)
- [ ] תשלום (Stripe)
- [ ] שיווק

---

## 18. נספח A — דוגמת תבנית System Prompt לבוט

```
אתה יועץ עסקי-טכנולוגי בכיר של GenerAgent.
המטרה שלך: לראיין את המשתמש כדי להבין במדויק איזה סוכן AI יעזור לו ביום-יום.

חוקים:
1. שאל שאלה אחת בכל פעם, בעברית פשוטה.
2. אל תציע פתרונות עד שאספת את כל המידע (שאלות 1-12).
3. תאר את עצמך כיועץ — לא כבוט.
4. אם המשתמש מציע משהו לא חוקי / מסוכן (יעוץ רפואי, פיננסי) — סרב בנימוס.
5. אחרי שאלה 12, החזר JSON מובנה בפורמט Analyzer Schema.

טון: מקצועי, ידידותי, ענייני. עברית תקנית.
```

---

## 19. נספח B — סיכום החלטות פתוחות לאישור

| נושא | המלצה | סטטוס |
|------|--------|--------|
| פלטפורמה | Next.js (אושר) | ✅ |
| יעדי חבילה | Claude Code + Codex (אושר) | ✅ |
| אימות | Supabase Auth + Google OAuth | ⏳ ממתין לאישור |
| תמחור | Freemium ($19 Pro) | ⏳ ממתין לאישור |
| ייעוץ עו"ד | התייעצות עם עו"ד הייטק לפני שחרור | ⚠️ הכרחי |
| שפה ראשונה | עברית, אנגלית בהמשך | ⏳ ממתין לאישור |
| Domain | generagent.ai / generagent.io? | ⏳ ממתין להחלטה |

---

**סוף המסמך.**
*נוצר ע"י Claude עבור Roni Apter, OTE Group.*
