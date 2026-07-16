---
name: karpathy-rules
description: Simplicity-first coding rules for ApplyPilot — write the least code that solves the problem, avoid speculative abstraction, keep diffs small and reviewable. Use when implementing or refactoring any feature.
---

# Karpathy Rules

## Purpose
Keep ApplyPilot's codebase small, direct, and boring. The best code is no
code; the second best is code so plain it needs no explanation.

## When to use
Every implementation or refactor task, especially when tempted to add a
config option, a wrapper layer, or a "reusable" abstraction with one caller.

## Workflow
1. State the problem in one sentence before writing code.
2. Look for existing code that already solves it (`src/lib/`, `src/components/ui/`) — extend before you invent. Examples that already exist: `executeAnalysis`, `addResumeVersion`, `EmptyState`, `PLANS`.
3. Write the smallest change that works end-to-end. No dead parameters, no `options` objects with one key, no interfaces with one implementation.
4. Prefer pure functions in `src/lib/` over logic buried in components or routes — they're testable without mocks.
5. Delete anything the change makes unused (as `ScoreDelta.tsx` was deleted when `ScoreComparison` replaced it).
6. Comments state constraints the code can't show — never narrate what the next line does.

## Constraints
- No new dependencies without explicit user approval.
- No premature generalization: two call sites justify a helper, one does not.
- Match the surrounding file's idiom, naming, and comment density.
- Strict TypeScript stays strict — no `any`, no `as` escape hatches to save time.

## Verification
- `git diff --stat` — is every touched file necessary for the stated problem?
- Could a reviewer understand the diff without you present?
- `npm run lint && npm run typecheck` pass with zero suppressions added.
