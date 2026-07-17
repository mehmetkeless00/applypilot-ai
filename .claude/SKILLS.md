# ApplyPilot Project Skills

Project-local skills in `.claude/skills/`. Each is a concise checklist
(Purpose / When to use / Workflow / Constraints / Verification) grounded in
this repo. Docs only — no hooks, scripts, or executables.

## Index

### General craft
- **karpathy-rules** — simplicity-first coding: least code, no speculative abstraction, small reviewable diffs.
- **ui-ux-pro-max** — complete UI states, accessibility, and mobile behavior for every screen.
- **superpowers** — plan → implement → verify workflow for multi-step tasks; all four quality gates.
- **caveman** — plain-language user-facing copy and non-technical explanations.
- **skill-creator** — how to add or update skills in this directory.

### ApplyPilot-specific
- **applypilot-architecture** — stack, directory layout, data model, and where code belongs.
- **applypilot-resume-safety** — factual integrity, immutable versions, exactly-once suggestion application.
- **applypilot-testing** — vitest patterns: table-aware Supabase mocks, hoisted state, `renderToStaticMarkup`.
- **applypilot-ui-ux** — this repo's palette, primitives, copy voice, and state patterns.
- **applypilot-i18n** — keeping strings localizable now; how to add a locale later (the app is English-only today).
- **applypilot-frontend** — Next.js App Router frontend rules: server/client boundaries, strict TypeScript, Tailwind, reusable components, responsive + accessible bilingual UI.
- **applypilot-release** — quality gates, migration/env handling, secret hygiene, deploy steps.

### applypilot-frontend at a glance
- **Purpose:** frontend engineering rules — App Router server/client boundaries, strict TypeScript, Tailwind, reusable primitives, responsive and accessible UI that holds up under Turkish text expansion, while preserving routes, auth, RLS, API contracts, and existing behavior. Covers the dashboard, analysis result, resume, billing, landing, and auth surfaces; requires visual verification at mobile and desktop widths and all four quality gates.
- **When to use:** building or changing any page, layout, or component; redesigns; adding screens or states.
- **When not to use:** backend-only work (API routes, `src/lib/` logic, migrations, billing/webhook internals) — use applypilot-architecture there; test-only changes — use applypilot-testing; pure copywriting — use caveman.
- **Combines with:** ui-ux-pro-max (state/accessibility bar) + applypilot-ui-ux (this repo's palette and primitives) + applypilot-i18n (locale plumbing and translation rules) + applypilot-testing (markup-level component tests).

## Recommended combinations

| Task | Skills |
|---|---|
| New feature or milestone | superpowers + applypilot-architecture + karpathy-rules + applypilot-testing + applypilot-release |
| Anything touching resumes, suggestions, or AI output | applypilot-resume-safety + applypilot-testing |
| Building or changing UI | applypilot-frontend + ui-ux-pro-max + applypilot-ui-ux + caveman |
| Redesign or new screen (bilingual) | applypilot-frontend + ui-ux-pro-max + applypilot-ui-ux + applypilot-i18n + applypilot-testing |
| Writing user-facing copy or error messages | caveman + applypilot-ui-ux |
| Bug fix | applypilot-architecture + applypilot-testing + applypilot-release |
| Localization request | applypilot-i18n + applypilot-ui-ux + superpowers |
| Preparing a commit/deploy | applypilot-release |
| Adding a new skill | skill-creator |

Baseline for any change: **karpathy-rules** while writing, **applypilot-release** before shipping.
