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

### Optional integrations

- **Google sign-in** — enable the Google provider in Supabase **Auth → Providers** (create OAuth credentials in Google Cloud Console with redirect URL `https://<project-ref>.supabase.co/auth/v1/callback`). The button appears on login/signup and degrades gracefully when the provider is disabled.
- **Password reset** — works out of the box via Supabase recovery emails; `NEXT_PUBLIC_APP_URL` must be set in production so reset links point at your domain.
- **Analytics (PostHog)** — set `NEXT_PUBLIC_POSTHOG_KEY` (and optionally `NEXT_PUBLIC_POSTHOG_HOST`). Only pathname-level pageviews are captured; autocapture is off.
- **Error monitoring (Sentry)** — set `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN`. `sendDefaultPii` is off so resume content never rides along in error payloads.

## Resume library

Resumes live in **My resumes** (`/dashboard/resumes`) and are versioned: every edit creates an immutable new version, and each analysis records exactly which resume version it scored (`analyses.resume_id` / `resume_version_id`). The new-analysis form defaults to your saved resume; pasted or uploaded resumes can be saved to the library in the same step. Deleting a resume keeps past analyses intact (links null out). Migration: `0005_resumes.sql`.

**PDF text extraction** — uploaded PDF resumes have their text extracted server-side (`unpdf`, a serverless-friendly pdf.js wrapper) and stored on the version alongside the original PDF path, so the resume editor prefills and edits create new text versions. Analyses prefer the parsed/edited text and fall back to the original PDF only when no text exists (e.g. scanned PDFs). Legacy PDF versions without stored text get on-demand extraction on the resume page, with a clear manual-paste fallback if the PDF has no extractable text.

**Factual integrity** — the analysis prompt forbids altering resume facts (dates, companies, titles, locations, degrees, technologies, metrics), and a deterministic post-generation guard (`src/lib/ai/sanitize.ts`) drops any resume suggestion whose rewrite introduces years, metrics, or proper nouns that the original text and resume don't contain, and scrubs "assumed/corrected date"-style qualifiers from all narrative fields.

## Re-score loop

Every analysis has a **Re-score** button: it re-runs the same job against the *latest* version of the linked saved resume (or the original resume text for legacy analyses) and records the lineage in `analyses.rescored_from` (migration `0006_rescore.sql`). Re-scored analyses show a comparison card against the previous run — score delta, resume versions, dates, and ATS keyword movement (matched/weak/missing, newly matched, regressed) — resume pages show a score history across versions, and the dashboard shows aggregate stats. Re-scores count toward plan limits like any analysis.

## Guided resume improvement (apply a suggestion)

Each resume improvement suggestion on an analysis has an **Apply to resume** action (analyses run against a saved resume only). The flow is deliberately conservative:

1. **Preview** — a dialog shows before/after text, the reason, and a warning that only the shown text changes. Nothing happens without explicit confirmation.
2. **Apply** — the server (`/api/analyses/[id]/apply-suggestion`) re-reads the suggestion from the stored analysis (never from the client), re-runs the factual-integrity guard against the *current* resume text, and requires the original text to appear **exactly once** in the latest version. Anything else — text gone, text duplicated, resume changed since the analysis, PDF-only version — returns a clear conflict message pointing to manual review instead of guessing.
3. **New version** — a successful apply creates the next immutable resume version with `source='applied_suggestion'` and full traceability (`source_analysis_id`, `source_suggestion`, `previous_version_id` — migration `0009_applied_suggestions.sql`). Previous versions and the original PDF are never modified. A partial unique index makes double-submits idempotent. Creating a version consumes **no** analysis quota.
4. **Re-score** — the success message offers "Re-score with version X" (explicitly labeled as using 1 analysis from the monthly limit). If quota is exhausted, the new version is kept and the limit is explained.

The resume page also gets a **Compare versions** tool: a safe, React-rendered line diff (no `dangerouslySetInnerHTML`) between any two text versions, with each version labeled by how it was created (Uploaded PDF / Manual edit / Applied suggestion) and linked to its source analysis where applicable.

## Job URL import

The "Import from URL" tab fetches a posting server-side. Greenhouse, Lever, Ashby, and Workable use dedicated adapters against their public JSON APIs. Other sites go through a generic pipeline: schema.org `JobPosting` JSON-LD (single objects, arrays, and `@graph`), then Open Graph tags, then semantic HTML extraction — so many, but not all, career pages import. Pages that need JavaScript, a login, or answer with a bot check get a manual-paste message; LinkedIn is always manual-paste. The generic fetcher only requests validated public hosts: http/https only, no private/reserved IPs or internal hostnames (checked lexically **and** after DNS resolution), every redirect re-validated, with a 10s timeout, 5-redirect limit, 2 MB size cap, and HTML/JSON content types only.

## Plans & billing

| Plan | Price | Analyses per month |
|---|---|---|
| Free | $0 | 3 |
| Pro | $12/mo | 50 |

The prices shown in the UI come from `src/lib/billing/plans.ts` — keep the **Stripe price** behind `STRIPE_PRO_PRICE_ID` in sync with the displayed $12/month, since Stripe is what actually charges the card. The same `PLANS` config drives both the UI and server-side quota enforcement — limits are never duplicated or trusted from the client.

**Billing not configured yet?** The app degrades intentionally: while any Stripe env var is missing (`billingAvailable()` in `src/lib/billing/stripe.ts`), Pro shows as a non-clickable **"Coming soon"** on the landing page, the billing page, and the quota-reached card, checkout requests are refused with a neutral 503 ("Pro subscriptions are not available yet. The Free plan remains fully usable."), and the Free plan keeps working unchanged. Env var names appear only in server logs, never in responses or the UI. Setting all four variables (and redeploying) re-enables real Upgrade/Portal behavior with no code change.

### Subscription status policy

Plan is always derived server-side from the Stripe-reported status (`planFromSubscriptionStatus` in `plans.ts`):

| Stripe status | Plan | Why |
|---|---|---|
| `active`, `trialing` | Pro | Paid or in trial. A cancellation scheduled for period end keeps status `active` with `cancel_at_period_end=true`, so access lasts until the paid period ends. |
| `past_due` | Pro (grace) | Stripe is retrying the payment; access continues during dunning. |
| `unpaid`, `canceled` | Free | Payment definitively failed or the subscription ended. |
| `incomplete`, `incomplete_expired` | Free | The first payment never succeeded. |
| anything else / null | Free | Fail closed. |

### Stripe setup

1. **Create the product/price**: Stripe Dashboard → **Product catalog → Add product** → name "ApplyPilot Pro", add a **recurring** price of **$12.00 / month**. Copy the price ID (`price_…`) into `STRIPE_PRO_PRICE_ID`.
2. **Create the webhook endpoint**: **Developers → Webhooks → Add endpoint**, URL `https://<your-domain>/api/stripe/webhook`, subscribed to exactly these events:
   `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.
   Copy the signing secret (`whsec_…`) into `STRIPE_WEBHOOK_SECRET`.
3. **Env vars** (see `.env.example`): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`, `NEXT_PUBLIC_APP_URL`. Missing/placeholder values produce clear server-log errors naming the variable (never its value).
4. **Run migration** `0008_billing_state.sql` (adds subscription-state columns and the `stripe_events` idempotency table).

### Local webhook testing (Stripe CLI)

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook   # prints a whsec_… for .env.local
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_failed
```

Use test-mode card `4242 4242 4242 4242` in Checkout. Webhook processing is idempotent (event IDs recorded in `stripe_events`) and out-of-order safe (writes carry the event timestamp and never overwrite newer state).

### Production billing checklist

- [ ] Live-mode `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` set in Vercel
- [ ] `NEXT_PUBLIC_APP_URL` = production URL (Stripe redirects + reset emails)
- [ ] Webhook endpoint created against the production domain with the six events above
- [ ] Migration `0008_billing_state.sql` applied
- [ ] Customer portal enabled: Stripe **Settings → Billing → Customer portal** (allow cancel/resume + payment-method updates)
- [ ] Test a full cycle: upgrade → banner + Pro quota → portal cancel → access ends at period end

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

## Security notes

- **Usage ledger** — plan limits and rate limits count `usage_events` (append-only, no update/delete RLS policies), not `analyses`, so deleting analyses doesn't refund quota. Migration `0007_usage_ledger.sql` backfills existing analyses.
- **Rate limits** — analyses 10/hour, imports 20/hour (attempts, not successes), exports 60/hour, all per-account on top of monthly plan limits.
- **Headers** — HSTS, nosniff, frame denial, referrer and permissions policies on every response; a production-only CSP restricts scripts and network destinations (`next.config.ts`).
- **Uploads** — PDFs are magic-byte verified server-side before being sent to the model; storage paths are prefix-checked against the session user.
- **Signup** — disposable-email domains are rejected. For production, also enable CAPTCHA (Supabase **Auth → Attack protection**) and keep Supabase's default auth rate limits on.

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
