# ApplyPilot AI

AI-powered job application tailoring. Paste a job description and your resume; get a calibrated fit score (0–100), a skills-gap analysis, your strengths with evidence, a tailored professional summary, and a ready-to-send cover letter. Every analysis is saved to your dashboard.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (auth, Postgres + RLS, storage) · Gemini 2.5 Flash (`@google/genai`) · Vercel

## Setup

### 1. Supabase

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Open the SQL editor and run every file in [`supabase/migrations/`](supabase/migrations/) **in numeric order** (`0001_init.sql` creates tables/RLS/trigger/storage; later migrations add Phase 2 columns and are safe to run on a live database — they're additive only).
3. Copy the project URL and anon key from **Settings → API**.

### 2. Environment

```bash
cp .env.example .env.local
```

Fill in:

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | From Supabase project settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only. From Supabase project settings — needed for Stripe billing (webhook writes plan changes). |
| `GEMINI_API_KEY` | Server-only. Create one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). |
| `STRIPE_SECRET_KEY` | Server-only. From the [Stripe dashboard](https://dashboard.stripe.com/apikeys). |
| `STRIPE_WEBHOOK_SECRET` | Server-only. Signing secret for a webhook endpoint pointed at `/api/stripe/webhook` (locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`). |
| `STRIPE_PRO_PRICE_ID` | Price ID of a recurring "Pro" subscription product you create in Stripe. |
| `NEXT_PUBLIC_APP_URL` | Base URL used in Stripe redirect links, e.g. `http://localhost:3000`. |

### 3. Run

```bash
npm install
npm run dev
```

Node 22 is recommended (`.nvmrc` provided); Node 20 works but supabase-js has deprecated it.

## Resume library

Resumes live in **My resumes** (`/dashboard/resumes`) and are versioned: every edit creates an immutable new version, and each analysis records exactly which resume version it scored (`analyses.resume_id` / `resume_version_id`). The new-analysis form defaults to your saved resume; pasted or uploaded resumes can be saved to the library in the same step. Deleting a resume keeps past analyses intact (links null out). Migration: `0005_resumes.sql`.

## Job URL import

The "Import from URL" tab fetches a posting server-side. Greenhouse, Lever, Ashby, and Workable use dedicated adapters against their public JSON APIs. Other sites go through a generic pipeline: schema.org `JobPosting` JSON-LD (single objects, arrays, and `@graph`), then Open Graph tags, then semantic HTML extraction — so many, but not all, career pages import. Pages that need JavaScript, a login, or answer with a bot check get a manual-paste message; LinkedIn is always manual-paste. The generic fetcher only requests validated public hosts: http/https only, no private/reserved IPs or internal hostnames (checked lexically **and** after DNS resolution), every redirect re-validated, with a 10s timeout, 5-redirect limit, 2 MB size cap, and HTML/JSON content types only.

## Plans & billing

| Plan | Analyses per month |
|---|---|
| Free | 3 |
| Pro | 50 |

Limits reset on UTC calendar months and are enforced in `/api/analyze` (HTTP 402 when exhausted). Upgrades run through Stripe Checkout from `/dashboard/billing`; subscription changes (renewal, cancellation, failed payment, expiry) arrive via the `/api/stripe/webhook` endpoint, which updates `profiles.plan` using the service-role key. A failed payment keeps Pro as a grace period (`past_due`) until Stripe gives up and cancels. Migration `0004_billing.sql` restricts profile updates so users can't set their own `plan` through the REST API.

## How the AI analysis works

`src/lib/ai/analyze.ts` makes a single `gemini-2.5-flash` call with schema-constrained JSON output (`responseJsonSchema` derived from the same Zod schema via `z.toJSONSchema`), returning all analysis fields in one response that is then Zod-validated. Two provider specifics are handled:

- **Safety blocks** — a blocked prompt (`promptFeedback.blockReason`) or blocked output (`finishReason` of `SAFETY`/`PROHIBITED_CONTENT`/`BLOCKLIST`) maps to a friendly 422 instead of crashing; the `analyses.model` column records the exact model version that answered.
- **Timeouts** — the API route keeps `maxDuration = 300` for headroom, though Flash typically answers in seconds.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm test` | Vitest suite (schemas, AI engine with mocked SDK, API route with mocked Supabase) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

## Deployment (Vercel)

1. Push the repo to GitHub and import it in Vercel.
2. Set all environment variables from `.env.local` in the Vercel project settings (`NEXT_PUBLIC_APP_URL` = your production URL).
3. Deploy. Add your production URL to Supabase **Auth → URL Configuration** (site URL + `https://<domain>/auth/callback` redirect).
4. In Stripe, add a webhook endpoint for `https://<domain>/api/stripe/webhook` subscribed to `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, and `invoice.payment_failed`; put its signing secret in `STRIPE_WEBHOOK_SECRET`.

## Manual verification checklist

1. Sign up → confirm a `profiles` row was created.
2. Create an analysis with pasted resume text → score, skills, strengths, summary, and cover letter render; row saved with your `user_id`.
3. Repeat with a PDF resume upload.
4. Sign in as a second user → their dashboard is empty (RLS).
