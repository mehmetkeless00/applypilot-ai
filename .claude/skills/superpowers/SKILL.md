---
name: superpowers
description: Structured plan → implement → verify workflow for multi-step tasks in ApplyPilot. Use for any feature, milestone, or bug fix that touches more than one file.
---

# Superpowers

## Purpose
Turn large asks into small, individually verified steps so nothing ships
half-done and nothing existing breaks.

## When to use
Features, phase milestones, multi-file bug fixes, migrations — anything
where "just start typing" risks missing a requirement.

## Workflow
1. **Inspect first.** Read the existing code the task touches before proposing anything. Report what already exists and what's actually missing.
2. **Plan in milestones.** Break work into steps that each end verifiable. Track them with a todo list; keep exactly one in progress.
3. **Implement narrowly.** Complete one step fully (code + tests + docs) before starting the next.
4. **Verify every gate:** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. Fix failures immediately — never carry a red gate into the next step.
5. **Prove behavior, not compilation.** Add regression tests for the specific behaviors the task names, including failure and conflict paths.
6. **Ship deliberately.** Inspect `git status` and `git diff` for secrets or unrelated files. Commit only when the task says to, with a message describing the why.
7. **Report outcomes faithfully** — what was added, changed, tested, and anything skipped or still manual.

## Constraints
- Never break existing functionality; backward compatibility is a requirement, not a preference (additive migrations only, legacy rows keep working).
- Don't re-litigate settled decisions mid-task; don't gold-plate beyond the ask.
- Blocked on a genuine product decision → ask; otherwise choose the conventional default and note it.

## Verification
- All four gates green, final test count reported.
- Every requirement in the original ask maps to code or an explicit "not done because…".
- Working tree state matches what the report claims.
