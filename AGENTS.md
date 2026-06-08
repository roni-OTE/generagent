<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# GenerAgent — production app

## What this is
Next.js 16 production application for **generagent.io**. The product helps users characterize **which** AI agent they need (via an adaptive consultation bot), then ships a ready-to-install package for Claude Code or Codex CLI.

## Architecture
- **Frontend**: Next.js 16 (App Router) · TypeScript · Tailwind v4
- **Auth + DB**: Supabase (Auth + Postgres + Storage)
- **LLM**: Anthropic Claude API (`@anthropic-ai/sdk`) — Sonnet for the bot, Opus for analysis
- **Hosting**: Vercel + custom domain `generagent.io`

## Design system — `aurora`
Full visual language lives in `mockups/Design_Phase_02..08_*.html` as reference.

- **Surfaces**: `--bg-deep #020203`, `--bg-base #050506`, `--bg-elev #0A0A0F`
- **Accent**: indigo `--indigo #5E6AD2` (fills only), `--indigo-text #818CF8` (text), `--magenta #C084FC` (AI thinking), `--cyan #67E8F9` (info)
- **Text**: `--fg #EDEDEF`, `--fg-dim #8A8F98`, `--fg-muted #5E636E`
- **Typography**: IBM Plex Sans Hebrew (HE) · Inter (EN) · JetBrains Mono (code/bot)
- **Radius**: 8 (inputs/chips), 10 (buttons), 12 (bubbles), 16-20 (cards/modals/hero)
- **Easing**: `cubic-bezier(0.16, 1, 0.3, 1)` (expo-out, cinematic)

## Bot design — adaptive Socratic
**Critical**: bot is NOT a fixed questionnaire. Three phases (Discovery → Deep Dive → Refinement) with branching by detected persona. Hard cap: 15 questions, min 7, early-exit at confidence ≥ 0.85. See `mockups/GenerAgent_PRD.md` section 9.

## Positioning
We do **NOT** build the agent. We characterize **which** agent fits the user's needs, and ship the installation package. Bot interview → recommendation → package with MCP URL / CLI one-liner / ZIP.

## Folder structure
```
src/
  app/         # Next.js App Router pages
  components/  # React components (Orb, Button, etc.)
  lib/         # Supabase client, Anthropic client, utils
mockups/       # Original HTML mockups (reference only — read-only)
public/        # Static assets
```

## Conventions
- Hebrew is primary user-facing language. English for code identifiers.
- All buttons use the `Button` component (`@/components/Button`).
- The `Orb` component (`@/components/Orb`) is the signature visual element.
- Server components by default; mark `"use client"` only when needed.
- Never use color alone for status — always pair with icon/text.
- Touch targets ≥ 44px (WCAG AAA).
