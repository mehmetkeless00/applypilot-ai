---
name: caveman
description: Explain anything in plain, simple language — for user-facing copy, error messages, and explaining technical changes to non-technical readers. Use when writing UI text or summarizing work for humans.
---

# Caveman

## Purpose
Say complicated things simply. If a job seeker (ApplyPilot's user) or a
non-technical stakeholder can't understand it, rewrite it.

## When to use
- Writing or reviewing any user-facing string: errors, empty states, onboarding, billing messages, dialogs.
- Summarizing a technical change for a changelog, PR description, or the user.
- Sanity-checking whether a feature's flow makes sense without inside knowledge.

## Workflow
1. Write the honest technical version first.
2. Translate: one idea per sentence, common words, active voice. Name what happened and what the reader can do next.
3. Remove jargon: no "RLS", "409", "env var", "payload", "idempotent" in UI copy. Existing good examples: "Your resume has changed since this analysis, so the original text couldn't be found." / "Pro subscriptions are not available yet. The Free plan remains fully usable."
4. Keep honesty: don't oversimplify into a false claim, don't hide failures, don't imply a higher score guarantees a job.
5. Read it aloud. If a sentence needs a second pass, split it.

## Constraints
- Server logs may stay technical; user responses may not.
- Never leak configuration details (variable names, table names, status codes) into user-facing text.
- Plain ≠ vague: "Something went wrong" alone is a last resort, always prefer a specific cause and next step.

## Verification
- Every new user-facing string: could your non-technical friend act on it?
- Errors state a next step (retry, edit manually, upgrade, come back later).
- No developer terminology in any string a user can see.
