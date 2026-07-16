import type { ResumeSuggestion } from "@/lib/types";

// Pure logic for applying an analysis suggestion to resume text. The rule
// is deliberately strict: the suggestion's original text must appear in
// the current resume exactly once, and only that occurrence is replaced —
// anything else is a conflict the user resolves manually. The AI never
// rewrites the rest of the resume.

export type ReplaceOutcome =
  | { ok: true; content: string }
  | { ok: false; reason: "not_found" | "multiple_matches" };

/** Non-overlapping occurrence count of `needle` in `haystack`. */
export function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

/**
 * Replaces the suggestion's original text with its improved text, only
 * when the original appears exactly once in the current resume content.
 */
export function applySuggestionToContent(
  content: string,
  originalText: string,
  improvedText: string,
): ReplaceOutcome {
  const occurrences = countOccurrences(content, originalText);
  if (occurrences === 0) return { ok: false, reason: "not_found" };
  if (occurrences > 1) return { ok: false, reason: "multiple_matches" };
  return { ok: true, content: content.replace(originalText, improvedText) };
}

/**
 * A stored suggestion is applicable only when it has real before/after
 * text. Suggestions are persisted server-side at analysis time; this
 * guards against malformed legacy rows, never against client input.
 */
export function isApplicableSuggestion(
  value: unknown,
): value is ResumeSuggestion {
  if (typeof value !== "object" || value === null) return false;
  const s = value as Partial<ResumeSuggestion>;
  return (
    typeof s.original_text === "string" &&
    s.original_text.trim().length > 0 &&
    typeof s.improved_text === "string" &&
    s.improved_text.trim().length > 0 &&
    s.improved_text !== s.original_text
  );
}
