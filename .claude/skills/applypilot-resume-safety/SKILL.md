---
name: applypilot-resume-safety
description: Factual-integrity and immutability rules for anything touching resumes, AI suggestions, or analysis output. Use whenever a change reads, generates, or modifies resume content.
---

# ApplyPilot Resume Safety

## Purpose
The product promise is honesty: the AI never invents or alters facts, and
a user's resume history is never silently rewritten or lost.

## When to use
Any change to the AI prompt/schema, suggestion generation or application,
resume versions, PDF handling, or exports.

## Workflow
1. **Facts are immutable.** Dates, companies, titles, locations, degrees, technologies, and metrics from the user's resume must survive verbatim. "July 2025" stays "July 2025" even if the model thinks it's in the future.
2. **Keep the deterministic guard.** All AI output passes through `sanitizeAnalysisResult` (`src/lib/ai/sanitize.ts`): suggestions introducing unsupported years, metrics, or proper nouns are dropped; "assumed/corrected date"-style qualifiers are scrubbed. Never bypass or weaken it — extend its regression tests instead.
3. **Re-check at the point of use.** Applying a suggestion re-runs `isSuggestionSupported` against the *current* resume text and requires the original text to appear exactly once (`applySuggestionToContent`). Zero or multiple matches → conflict message, never a guess.
4. **Versions are append-only.** Every change creates the next `resume_versions` row; nothing updates or deletes existing versions; the original uploaded PDF stays in storage untouched. Applied suggestions record `source_analysis_id`, `source_suggestion`, and `previous_version_id`.
5. **The whole resume is never AI-rewritten.** Changes are scoped to the exact text the user previewed and confirmed.
6. **Prefer parsed text over PDF binary** for re-scoring; fall back to the PDF only when no text exists, with a clear message.

## Constraints
- No automatic factual changes; user confirmation precedes any resume mutation.
- Conflicts fail safe with plain-language guidance toward manual review.
- Dropped-suggestion behavior is silent to the user but logged server-side.
- Resume content never rides into analytics or error tracking (Sentry `sendDefaultPii` stays off).

## Verification
- Regression tests prove specific facts survive (dates, metrics, names) — see `sanitize.test` patterns and the apply-suggestion route tests.
- A fabricated-fact fixture (e.g. "+45% at Google") is rejected end-to-end.
- Applying twice creates one version; prior versions' content is asserted unchanged.
