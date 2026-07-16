---
name: applypilot-release
description: ApplyPilot's verification and release checklist — quality gates, migration handling, secret hygiene, and deploy steps. Use before every commit/push and for any production deploy question.
---

# ApplyPilot Release

## Purpose
Nothing lands on `main` (which deploys via Vercel) without the full gate
sequence and a clean, secret-free diff.

## When to use
Finishing any milestone, committing, pushing, or preparing/checking a
production deploy.

## Workflow
1. **Run all four gates, in order, fixing failures before proceeding:**
   - `npm run lint`
   - `npm run typecheck`
   - `npm test` (report the total count)
   - `npm run build` (confirm `/` stays static and new routes appear)
2. **Inspect the diff:** `git status` + `git diff` — only files the task required; no secrets, keys, `.env*` files, or debugging leftovers. `git diff --check` for whitespace errors.
3. **Migrations:** new SQL is additive-only, numbered sequentially in `supabase/migrations/`, and must be run manually in the Supabase SQL editor — say so explicitly in the report; deploying code does not apply migrations.
4. **Env changes:** new variables go in `.env.example` with placeholders and in the README table; production values are set in Vercel and require a redeploy to take effect (the landing page bakes config at build time).
5. **Commit** with a conventional message (`feat:`/`fix:`/`chore:`) explaining the why; push only when the task says to.
6. **Report honestly:** gates' results, test count, commit hash, push result, remaining manual steps (Supabase SQL, Stripe Dashboard, Vercel env).

## Constraints
- Never commit with a red gate or skip one "because the change is small".
- Never include real Stripe/Supabase/Gemini credentials anywhere, including docs and tests.
- Don't break billing-disabled UX: the app must remain intentional-looking with no Stripe env vars set.
- Existing tests are a contract — a regression means the change is wrong or the contract changed deliberately (say which).

## Verification
- All four gates green in the final state of the tree (not an earlier state).
- `git status` clean after push; reported hash matches `git log -1`.
- README/checklists updated when behavior, env, or manual steps changed.
