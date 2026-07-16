---
name: applypilot-testing
description: ApplyPilot's vitest patterns — table-aware Supabase mocks, hoisted state, renderToStaticMarkup component tests. Use when writing or fixing any test.
---

# ApplyPilot Testing

## Purpose
Tests here are fast, node-only, and behavioral — they prove routes and
logic behave correctly against mocked boundaries, with no test server.

## When to use
Adding tests for new code, extending existing suites, or diagnosing a
failing test.

## Workflow
1. Colocate tests: `foo.ts` → `foo.test.ts`, components → `.test.tsx` (vitest runs `src/**/*.test.{ts,tsx}`, node environment, JSX via esbuild automatic).
2. **Pure logic first.** Extract branching into `src/lib/` functions and test them directly — no mocks needed (see `diff.test.ts`, `compare.test.ts`, `applySuggestion.test.ts`).
3. **API routes:** mock `@/lib/supabase/server` with a table-aware `from(table)` switch; keep mutable fixtures in `vi.hoisted` state reset in `beforeEach`. Capture writes into arrays (`insertPayloads`, `usageInserts`) and assert on them. Follow `rescore/route.test.ts` or `apply-suggestion/route.test.ts` as the template.
4. **Components:** render with `renderToStaticMarkup` from `react-dom/server` and assert on the HTML string — semantics (`<h2`, `role="alert"`, `aria-*`, `href=`) and escaping (`&lt;script&gt;` present, `<script>` absent). Mock `next/navigation` when a component uses `useRouter`.
5. **Cover the unhappy paths the feature promises:** 401 unauthenticated, 404 cross-user (RLS returns null), 409 conflicts, 402 quota, duplicate submits.
6. Env-var tests save/restore `process.env` in `afterEach` (see `plans.test.ts`).

## Constraints
- No jsdom, no testing-library, no real network or database calls.
- Never weaken an existing assertion to make a new feature pass — that signal is the point.
- Mocks mirror the real client's chaining shape; if the route's query changes, update the mock deliberately.

## Verification
- `npm test` fully green; report the new total count.
- New behavior has both a success test and at least one failure/conflict test.
- Component tests assert structure and safety, not just visible text.
