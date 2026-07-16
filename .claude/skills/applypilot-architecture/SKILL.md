---
name: applypilot-architecture
description: Map of ApplyPilot's stack, directory layout, data model, and architectural rules. Use before implementing any feature or debugging anything that spans layers.
---

# ApplyPilot Architecture

## Purpose
Orient work inside ApplyPilot's actual structure so changes land in the
right layer and reuse what exists.

## When to use
Starting any feature, fix, or investigation; deciding where new code goes.

## Workflow
1. **Know the stack:** Next.js App Router (params/searchParams are Promises — `await` them) + React 19 + strict TypeScript + Tailwind v4; Supabase (auth, Postgres with RLS, storage); Gemini 2.5 Flash via `@google/genai` with Zod-derived `responseJsonSchema`; Stripe subscriptions; Vercel hosting. Per `AGENTS.md`, read `node_modules/next/dist/docs/` before writing Next.js code you're unsure about.
2. **Place code by layer:**
   - `src/app/` — routes and pages (server components query Supabase directly; API routes under `src/app/api/`).
   - `src/lib/` — pure/testable logic: `ai/` (analyze, prompt, sanitize), `analysis/` (execute, compare), `billing/` (plans, usage, stripe, status), `resumes/` (versions, extract, applySuggestion), `jobimport/` (providers, safe-fetch), `supabase/` (server/client/admin).
   - `src/components/` — `ui/` primitives (Button, Card, Badge, Input, Spinner, EmptyState) and feature folders.
   - `supabase/migrations/` — numbered, **additive-only** SQL.
3. **Respect the data model:** `profiles` (plan + Stripe state, billing columns service-role-only), `analyses` (results + resume linkage + `rescored_from` lineage), `resumes`/`resume_versions` (versions immutable — insert-only RLS), `usage_events` (append-only quota ledger), `stripe_events` (webhook idempotency).
4. **Reuse the spines:** analysis runs go through `executeAnalysis`; version creation through `addResumeVersion`/`createResumeWithVersion`; quota through `countUsageSince`/`recordUsage`; plan config through `PLANS`; billing availability through `billingAvailable()`.
5. **Server-side external fetches** go through `src/lib/jobimport/safe-fetch.ts` (SSRF protection) — never raw `fetch` to user-supplied URLs.

## Constraints
- RLS is the ownership boundary; every user query runs on the RLS-scoped client. The service-role admin client is for webhook/billing writes only.
- Never trust user IDs, price IDs, or plan values from the browser.
- Migrations are additive; legacy rows (null new columns) must keep working.
- Secrets stay in env vars; user-facing errors never name them.

## Verification
- New logic with branching lives in `src/lib/` with a colocated test.
- No new direct Supabase admin usage outside webhook/billing paths.
- `npm run build` passes — proves route/page contracts (async params etc.) are right.
