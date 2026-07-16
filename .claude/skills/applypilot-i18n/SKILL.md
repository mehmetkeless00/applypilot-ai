---
name: applypilot-i18n
description: Guidance for internationalizing ApplyPilot when localization work is requested. The app is currently English-only — use this to keep strings localizable and to plan any future locale (e.g. Turkish) correctly.
---

# ApplyPilot i18n

## Purpose
Keep the door open for localization. ApplyPilot is **English-only today** —
no i18n framework is installed and no translations exist. This skill guides
writing localizable code now and adding locales properly when asked.

## When to use
- Writing user-facing strings anywhere (keep them localizable-friendly).
- A task explicitly asks to add a language or an i18n framework.

## Workflow
1. **Today, by default:** keep user-facing strings as complete sentences (not fragments concatenated in JSX), avoid embedding formatted values by string-mashing, and route dates through `formatDate` in `src/lib/utils.ts` (currently `en-US`) rather than ad-hoc `toLocaleDateString` calls.
2. **If localization is requested,** treat it as its own milestone:
   - Choose the App Router-native approach: locale segment (`/[locale]/`) or middleware negotiation + a message-catalog library — confirm the choice with the user before installing anything.
   - Inventory every string surface: pages, components, API route error messages, `metadata` titles, export documents (PDF/DOCX), and email-adjacent copy.
   - Server-derived messages (quota errors, conflict messages) need a locale-aware path too — they're written in `src/lib/` and API routes, not just components.
   - Dates/numbers switch to locale-aware formatting via `Intl` with the active locale.
3. **AI output is a separate decision:** analysis results come from Gemini in the job/resume's language context. Localizing UI chrome does not localize AI-generated content — surface this tradeoff to the user; prompt-level language control is its own change with its own tests.
4. Keep both locales' pages passing the same accessibility and state checklists.

## Constraints
- Do not claim or assume any translation already exists — there is none.
- No i18n dependency without explicit approval.
- Never machine-translate the legal pages (privacy/terms) silently — flag that they need reviewed translations.
- SEO: localized routes need correct `lang` attributes and hreflang metadata.

## Verification
- English-only default: no half-translated surfaces committed.
- If a locale is added: every inventoried surface renders in it, `npm run build` passes, and switching locales survives navigation and reload.
