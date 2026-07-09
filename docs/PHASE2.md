# Phase 2 — Implementation Plan

**Status: complete (2026-07-09).** M1 `8f54262` · M2 `c2a7951` · M3 `414ebb9` ·
M4 `d670600` · M5 `f5ef554`. Final gate: 82 tests, lint, typecheck, build all green.
Run migrations `0002`–`0004` in the Supabase SQL editor (numeric order) to activate
ATS keywords, resume suggestions, and billing on a live database.

Baseline: tag `pre-phase-2` (verified: 30 tests, lint, typecheck, build).
All changes are additive and backward compatible; existing analyses keep rendering
(new jsonb columns default to `[]`, and the UI hides empty sections).

## Milestones

### M1 — Job URL Import (Greenhouse, Lever, Ashby, Workable)

**Approach.** A server-side import route fetches the posting (avoids CORS, hides the
user's IP). Provider adapters prefer official public JSON APIs and fall back to
parsing the page's `schema.org/JobPosting` JSON-LD. Only allowlisted hostnames are
fetched — user URLs are never fetched blind (SSRF guard). LinkedIn is detected and
answered with a friendly "paste manually" response, never scraped.

| Provider | Primary source |
|---|---|
| Greenhouse | `boards-api.greenhouse.io/v1/boards/{board}/jobs/{id}` |
| Lever | `api.lever.co/v0/postings/{company}/{id}` |
| Ashby | `api.ashbyhq.com/posting-api/job-board/{org}` (match job id) |
| Workable | `apply.workable.com/api/v2/accounts/{account}/jobs/{shortcode}`, JSON-LD fallback |

**New files:** `src/lib/jobimport/providers.ts` (URL parsing + adapters),
`src/lib/jobimport/html.ts` (HTML→text, entity decoding, JSON-LD extraction),
`src/app/api/import-job/route.ts`, tests for each.
**Modified:** `NewAnalysisForm.tsx` (job-source tabs: Paste / Import from URL; import
prefills title/company/description which stay editable).
**API:** `POST /api/import-job` `{url}` → `{jobTitle, company, location?, jobDescription}`;
errors: 400 invalid URL, 422 LinkedIn / unsupported site, 502 network/blocked page.
**Edge cases:** malformed URLs, provider 404s, non-JSON responses, empty descriptions,
HTML entities, blocked/consent pages, redirects to unknown hosts (rejected).

### M2 — ATS Keyword Coverage

**Schema.** Extend `AnalysisResult` with
`ats_keywords: [{keyword, status: matched|weak|missing, importance: required|preferred|nice_to_have, suggestion}]`.
**Migration `0002`**: `alter table analyses add column ats_keywords jsonb not null default '[]'`.
**Modified:** `schema.ts`, `prompt.ts` (extraction rubric), `types.ts`, results page.
**New:** `AtsCoverage.tsx` — matched/weak/missing summary chips + grouped keyword list.
Old rows render nothing (empty default) — section hidden when empty.

### M3 — Resume Rewrite Suggestions

**Schema.** Extend `AnalysisResult` with
`resume_suggestions: [{section, original_text, improved_text, reason, impact: low|medium|high}]`
(snake_case to match the existing field convention).
**Migration `0003`**: `alter table analyses add column resume_suggestions jsonb not null default '[]'`.
**New:** `ResumeSuggestions.tsx` — before/after cards with impact badge and a
copy-improved-text button per suggestion.
**Modified:** `schema.ts`, `prompt.ts`, `types.ts`, results page.

### M4 — PDF / DOCX Export

**Dependencies:** `@react-pdf/renderer` (server-side `renderToBuffer`; handles text
wrapping + pagination) and `docx` (native .docx generation). Both run in the Node
runtime of a route handler — no headless browser.
**New files:** `src/lib/export/pdf.tsx` (summary/cover-letter PDF + full-analysis
report PDF), `src/lib/export/docx.ts`, `src/app/api/analyses/[id]/export/route.ts`,
`ExportButtons.tsx`.
**API:** `GET /api/analyses/{id}/export?format=pdf|docx&doc=summary|cover_letter|full`
(full is PDF-only → 400 for docx). Auth required; RLS scopes the row; correct
`Content-Type`/`Content-Disposition` headers.
**Tests:** generated buffers start with `%PDF` / `PK` magic bytes and contain expected
strings; route validates params.

### M5 — Stripe Billing (Free 3/mo, Pro 50/mo)

**Dependency:** `stripe`.
**Migration `0004`**: `profiles` gains `plan text not null default 'free'`,
`stripe_customer_id text`, `stripe_subscription_id text`, `subscription_status text`;
unique index on `stripe_customer_id`. Existing RLS select/update policies already
scope rows to the owner; column updates from webhooks use the service-role client.
**New files:**
- `src/lib/billing/plans.ts` — plan limits + `planFromSubscriptionStatus()` mapping:
  `active|trialing → pro`, `past_due → pro` (grace period; Stripe retries),
  `canceled|unpaid|incomplete_expired|paused → free`.
- `src/lib/billing/usage.ts` — analyses used since start of current calendar month vs limit.
- `src/lib/supabase/admin.ts` — service-role client (webhook writes; server-only).
- `src/app/api/billing/checkout/route.ts` — Stripe Checkout session (subscription mode,
  `STRIPE_PRO_PRICE_ID`, user id in metadata + `client_reference_id`).
- `src/app/api/billing/portal/route.ts` — customer portal session.
- `src/app/api/stripe/webhook/route.ts` — signature-verified (`STRIPE_WEBHOOK_SECRET`,
  raw body); handles `checkout.session.completed`,
  `customer.subscription.updated|deleted`, `invoice.payment_failed`.
- `src/app/dashboard/billing/page.tsx` + `UsageIndicator.tsx`.
**Modified:** `/api/analyze` — monthly plan limit enforced before the AI call (the
existing 10/hr anti-abuse limit stays); 402 with upgrade hint when exhausted.
Dashboard layout links to Billing; new-analysis page shows the usage indicator.
**Env additions (`.env.example`):** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`STRIPE_PRO_PRICE_ID`, `NEXT_PUBLIC_APP_URL`, plus documented
`SUPABASE_SERVICE_ROLE_KEY` (already in the user's `.env.local`).
**Edge cases:** webhook replays (idempotent upserts keyed on customer id), events for
unknown customers (logged + 200), cancellation at period end (subscription stays
`active` until Stripe sends the final update), plan check when profile row is missing
(treated as free), month boundary (UTC calendar month).

## Testing strategy

Per milestone: unit tests colocated (`*.test.ts`) + route tests with mocked Supabase
(existing pattern). Network (fetch) and Stripe are mocked; webhook logic is tested by
injecting parsed events into the handler with signature verification mocked. After
each milestone: run the suite + typecheck; fix before proceeding. Final gate:
`npm run lint && npm run typecheck && npm test && npm run build`.

## Risks & tradeoffs

- **Provider APIs change/rate-limit** → JSON-LD fallback + graceful 422 to manual paste.
- **Ashby board API returns all postings** (potentially large) → matched by id, only
  needed fields kept; acceptable for MVP.
- **@react-pdf/renderer bundle size** → loaded only in the export route (server);
  alternative (headless Chromium) rejected as far heavier.
- **Larger AI output (M2+M3 fields)** may add a few seconds latency and tokens per
  analysis on Flash — acceptable; single-call design retained.
- **Grace on `past_due`** favors user experience over strict revenue protection;
  flipping to strict is a one-line change in `planFromSubscriptionStatus`.
- **Webhook depends on service-role key** — never exposed client-side; only imported
  by server files.

## Rollback

`git reset --hard pre-phase-2` (code). Migrations are additive (new columns/tables
only) so existing data is never destroyed; rolling back code without rolling back
migrations is safe.
