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
| `GEMINI_API_KEY` | Server-only. Create one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). |

### 3. Run

```bash
npm install
npm run dev
```

Node 22 is recommended (`.nvmrc` provided); Node 20 works but supabase-js has deprecated it.

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
2. Set the three environment variables from `.env.local` in the Vercel project settings.
3. Deploy. Add your production URL to Supabase **Auth → URL Configuration** (site URL + `https://<domain>/auth/callback` redirect).

## Manual verification checklist

1. Sign up → confirm a `profiles` row was created.
2. Create an analysis with pasted resume text → score, skills, strengths, summary, and cover letter render; row saved with your `user_id`.
3. Repeat with a PDF resume upload.
4. Sign in as a second user → their dashboard is empty (RLS).
