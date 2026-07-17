import type { AnalysisResultData } from "./schema";

// Deterministic post-generation guard against fact fabrication. The prompt
// forbids altering resume facts, but models occasionally "correct" dates
// (e.g. July 2025 → July 2024 with "Assumed corrected date") anyway. This
// layer drops any resume suggestion whose improved_text introduces facts
// unsupported by the original text or the supplied resume, and scrubs
// guess-qualifier sentences from the narrative fields.

const FORBIDDEN_PHRASES = [
  "assumed corrected",
  "assumed date",
  "assumed dates",
  "corrected date",
  "corrected dates",
  "date corrected",
  "dates corrected",
  "assumed year",
  "corrected year",
  "estimated date",
  "inferred date",
  "presumed date",
  "(assumed",
  "(corrected",
  "(estimated",
  "(inferred",
  // Turkish equivalents — the guard applies in both output languages.
  "varsayılan tarih",
  "tahmini tarih",
  "düzeltilmiş tarih",
  "tarih düzeltildi",
  "tarih varsayıldı",
  "(varsayıldı",
  "(tahmini",
  "(düzeltildi",
];

export function containsForbiddenPhrase(text: string): boolean {
  const lower = text.toLowerCase();
  return FORBIDDEN_PHRASES.some((phrase) => lower.includes(phrase));
}

const YEAR_RE = /\b(?:19|20)\d{2}\b/g;
// Metrics: percentages, currency amounts, and standalone numbers of 2+
// digits (years are handled separately). Small counts like "3" are too
// ambiguous to police deterministically.
const METRIC_RE = /\d+(?:[.,]\d+)?\s?%|[$€£]\s?\d[\d,.]*|\b\d{2,}(?:[.,]\d+)?\b/g;

// Words that are legitimately capitalized mid-sentence without being facts.
const CAPITALIZED_ALLOWLIST = new Set(["i", "i'm", "i've", "i'd", "i'll"]);

function wordSet(text: string): Set<string> {
  return new Set(
    (text.toLowerCase().match(/[a-z0-9][a-z0-9+#.'&-]*/g) ?? []).map((w) =>
      w.replace(/['.]+$/g, ""),
    ),
  );
}

/** Years present in `text` but absent from the support corpus. */
function unsupportedYears(text: string, corpus: string): string[] {
  const corpusYears = new Set(corpus.match(YEAR_RE) ?? []);
  return [...new Set(text.match(YEAR_RE) ?? [])].filter(
    (year) => !corpusYears.has(year),
  );
}

/** Metric-looking tokens present in `text` but absent from the corpus. */
function unsupportedMetrics(text: string, corpus: string): string[] {
  const normalize = (token: string) => token.replace(/[\s,]/g, "");
  const corpusMetrics = new Set((corpus.match(METRIC_RE) ?? []).map(normalize));
  return [...new Set(text.match(METRIC_RE) ?? [])].filter(
    (token) => !corpusMetrics.has(normalize(token)),
  );
}

/**
 * Mid-sentence capitalized words (proper nouns: companies, titles,
 * locations, technologies) in `text` that the corpus doesn't contain.
 * Sentence-initial words are skipped — those are ordinary prose.
 */
function unsupportedProperNouns(text: string, corpusWords: Set<string>): string[] {
  const found: string[] = [];
  const tokenRe = /[A-Za-z][A-Za-z0-9+#.'&-]*/g;
  let match: RegExpExecArray | null;
  while ((match = tokenRe.exec(text)) !== null) {
    const word = match[0];
    if (!/^[A-Z]/.test(word) || word.length < 2) continue;
    const before = text.slice(0, match.index);
    // Sentence-/line-/list-initial capitalization is not a fact signal.
    if (/(^|[.!?:;\n•("“'-]\s*)$/.test(before) || before.trim() === "") continue;
    const lower = word.toLowerCase().replace(/['.]+$/g, "");
    if (CAPITALIZED_ALLOWLIST.has(lower)) continue;
    // Turkish attaches case suffixes to proper nouns with an apostrophe
    // ("Google'da çalıştı") — the base name is the fact being checked.
    const base = lower.split("'")[0];
    if (!corpusWords.has(lower) && !corpusWords.has(base)) found.push(word);
  }
  return [...new Set(found)];
}

// Letters that exist in Turkish but not in English text: dotless ı,
// capital İ, ş and ğ. (ç/ö/ü are shared with too many languages to be a
// reliable signal.)
const TURKISH_LETTER_RE = /[ğĞıİşŞ]/g;

function turkishLetterCount(text: string): number {
  return (text.match(TURKISH_LETTER_RE) ?? []).length;
}

/**
 * True when improved_text was translated into Turkish even though the
 * passage it replaces (and the whole resume) contains no Turkish-specific
 * letters. Applying such a suggestion would inject Turkish prose into an
 * English resume. The ≥3 threshold tolerates a stray proper noun.
 */
export function isTranslatedIntoTurkish(
  improved: string,
  corpus: string,
): boolean {
  return turkishLetterCount(corpus) === 0 && turkishLetterCount(improved) >= 3;
}

export interface SuggestionLike {
  section: string;
  original_text: string;
  improved_text: string;
  reason: string;
  impact: "low" | "medium" | "high";
}

/**
 * True when improved_text sticks to rewording: no forbidden qualifier
 * phrases, and no years, metrics, or proper nouns that are absent from
 * original_text + the resume.
 */
export function isSuggestionSupported(
  suggestion: SuggestionLike,
  resumeText: string,
): boolean {
  const { improved_text: improved, original_text: original } = suggestion;
  if (containsForbiddenPhrase(improved)) return false;

  const corpus = `${original}\n${resumeText}`;
  if (isTranslatedIntoTurkish(improved, corpus)) return false;
  if (unsupportedYears(improved, corpus).length > 0) return false;
  if (unsupportedMetrics(improved, corpus).length > 0) return false;
  if (unsupportedProperNouns(improved, wordSet(corpus)).length > 0) return false;
  return true;
}

/** Removes sentences containing forbidden qualifier phrases, per line. */
export function scrubNarrative(text: string): string {
  if (!containsForbiddenPhrase(text)) return text;
  return text
    .split("\n")
    .map((line) =>
      line
        .split(/(?<=[.!?])\s+/)
        .filter((sentence) => !containsForbiddenPhrase(sentence))
        .join(" "),
    )
    .join("\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

export interface SanitizeOutcome {
  result: AnalysisResultData;
  droppedSuggestions: number;
}

/**
 * Applies the deterministic anti-fabrication checks to a parsed analysis.
 * `resumeText` is the supplied resume (parsed text for PDFs when
 * available); when absent, the suggestions' own original_text quotes act
 * as the support corpus.
 */
export function sanitizeAnalysisResult(
  result: AnalysisResultData,
  resumeText?: string,
): SanitizeOutcome {
  const corpus =
    resumeText ??
    result.resume_suggestions.map((s) => s.original_text).join("\n");

  const kept = result.resume_suggestions.filter((s) =>
    isSuggestionSupported(s, corpus),
  );
  const droppedSuggestions = result.resume_suggestions.length - kept.length;
  if (droppedSuggestions > 0) {
    console.warn(
      `Dropped ${droppedSuggestions} resume suggestion(s) that altered or invented facts.`,
    );
  }

  return {
    result: {
      ...result,
      resume_suggestions: kept,
      fit_summary: scrubNarrative(result.fit_summary),
      tailored_summary: scrubNarrative(result.tailored_summary),
      cover_letter: scrubNarrative(result.cover_letter),
    },
    droppedSuggestions,
  };
}
