# GenerAgent — דיאגרמה ארכיטקטונית

## זרימת המשתמש (User Journey)

```mermaid
flowchart TD
    A[Landing Page] --> B{Logged In?}
    B -->|No| C[Google OAuth]
    B -->|Yes| D{TOS Accepted?}
    C --> D
    D -->|No| E[Legal Gate - Click-wrap]
    E --> F[Welcome Screen]
    D -->|Yes| F
    F --> G[Select Target Platform<br/>Claude Code / Codex / Both]
    G --> H[Consultation Bot<br/>12 Questions]
    H --> I[Claude API<br/>Needs Analyzer]
    I --> J[3 Archetype Cards]
    J --> K[User Selects Archetype]
    K --> L{Needs OAuth Connectors?}
    L -->|Yes| M[Connector Wizard<br/>Step-by-step Visual Guide]
    L -->|No| N[Package Builder]
    M --> N
    N --> O[ZIP + INSTALL.md + LEGAL.md]
    O --> P[Download Screen]
    P --> Q[Dashboard]
    Q --> H
```

## ארכיטקטורת המערכת (System Architecture)

```mermaid
flowchart LR
    subgraph Client["Browser - Next.js"]
        UI[React UI<br/>shadcn + Tailwind]
        BotUI[Bot Chat UI]
        Dashboard[Dashboard]
    end

    subgraph Server["Next.js API Routes - Vercel"]
        AuthAPI[/auth/]
        BotAPI[/bot/]
        AnalyzeAPI[/analyze/]
        BuildAPI[/build/]
        DownloadAPI[/download/]
    end

    subgraph External["External Services"]
        Supabase[(Supabase<br/>Auth + DB + Storage)]
        Claude[Anthropic API<br/>Claude Sonnet/Opus]
        Resend[Resend<br/>Email]
        Sentry[Sentry<br/>Errors]
    end

    Client -->|HTTPS| Server
    Server -->|SQL + Storage| Supabase
    Server -->|LLM calls| Claude
    Server -->|Notifications| Resend
    Server -->|Monitoring| Sentry
```

## תהליך יצירת החבילה (Package Build Pipeline)

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant C as Claude
    participant DB as Supabase
    participant S as Storage

    U->>F: Completes bot interview
    F->>A: POST /analyze {messages}
    A->>C: System prompt + messages
    C-->>A: JSON analysis
    A->>DB: Save analysis
    A-->>F: Recommended archetypes
    U->>F: Selects archetype
    F->>A: POST /build {archetypeId}
    A->>A: Compose skills + agents + MCP
    A->>A: Render INSTALL.md (locale=he)
    A->>A: Render LEGAL.md (snapshot)
    A->>A: Build ZIP stream
    A->>S: Upload ZIP
    A->>DB: Save package row
    A-->>F: Signed download URL
    F-->>U: Download button + preview
```

## מבנה חבילת הסוכן (Package Structure)

```
my-agent-package.zip
│
├── README.md                  ← הסבר כללי בעברית
├── INSTALL.md                 ← מדריך התקנה צעד-אחר-צעד
├── LEGAL.md                   ← הסכם חתום + hash
│
├── .claude/                   ← עבור Claude Code
│   ├── settings.json
│   ├── agents/
│   │   └── personal-assistant.md
│   └── skills/
│       ├── email-triage/
│       │   └── SKILL.md
│       └── calendar-summary/
│           └── SKILL.md
│
├── codex/                     ← עבור Codex CLI
│   ├── AGENTS.md
│   └── codex.config.toml
│
├── mcp/                       ← MCP Connectors
│   ├── mcp.json
│   └── README.md (OAuth instructions)
│
└── scripts/
    ├── install.sh             ← Mac/Linux installer
    └── install.ps1            ← Windows installer
```

## State Machine של הבוט

```mermaid
stateDiagram-v2
    [*] --> Welcome
    Welcome --> Q1_Role
    Q1_Role --> Q2_Org
    Q2_Org --> Q3_Day
    Q3_Day --> Q4_Tasks
    Q4_Tasks --> Q5_TimeSink
    Q5_TimeSink --> Q6_Tools
    Q6_Tools --> Q7_TechLevel
    Q7_TechLevel --> Q8_Sensitive
    Q8_Sensitive --> Q9_Language
    Q9_Language --> Q10_Goal
    Q10_Goal --> Q11_Budget
    Q11_Budget --> Q12_Confirm
    Q12_Confirm --> Analyzing
    Analyzing --> Recommendations
    Recommendations --> BuildPackage
    BuildPackage --> [*]
```
