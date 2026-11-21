// Title rules shared by the collection and replacement scripts, so a
// replacement listing is chosen by exactly the rule that built the pools.

// Words that describe level or contract, not the role itself.
const NON_ROLE_WORDS = new Set([
  "junior", "senior", "lead", "intern", "internship", "mid", "remote", "jr", "sr",
]);

export function roleWords(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9.+#]+/)
    .filter((w) => w.length > 1 && !NON_ROLE_WORDS.has(w));
}

/** A title matches a query when it contains at least half its role words. */
export function titleMatches(query: string, title: string): boolean {
  const words = roleWords(query);
  if (words.length === 0) return false;
  const t = title.toLowerCase();
  const hits = words.filter((w) => t.includes(w)).length;
  return hits / words.length >= 0.5;
}

/** Lowercase, no accents, no gender tags or punctuation, for comparing titles. */
export function normalizeTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\((?:[mwfdhx](?:\s*\/\s*[mwfdhx])+|all genders?|alle geschlechter)\)/g, " ")
    .replace(/[^a-z0-9+#.]+/g, " ")
    .trim();
}

export function tokenJaccard(a: string, b: string): number {
  const sa = new Set(a.split(/\s+/).filter(Boolean));
  const sb = new Set(b.split(/\s+/).filter(Boolean));
  if (sa.size === 0 && sb.size === 0) return 1;
  let inter = 0;
  for (const w of sa) if (sb.has(w)) inter++;
  return inter / (sa.size + sb.size - inter);
}

// Agent-noun synonyms, as in the app's relevance code (src/lib/jobs/relevance.ts).
const ROLE_SYNONYMS: Record<string, string[]> = {
  developer: ["developer", "engineer", "programmer"],
  engineer: ["engineer", "developer", "programmer"],
  programmer: ["programmer", "developer", "engineer"],
};

function stem(word: string): string {
  return word.replace(/ing$/, "").replace(/s$/, "");
}

/**
 * Stricter rule for the full-text subset's own-role pools: EVERY role word
 * of the query must be in the title, as a word (light stemming, so
 * "engineering" matches "engineer"), via a developer/engineer/programmer
 * synonym, or as part of a compound ("full stack" matches "Fullstack").
 */
export function titleMatchesAll(query: string, title: string): boolean {
  const words = roleWords(query).map((w) => w.replace(/[^a-z0-9+#]/g, ""));
  if (words.length === 0) return false;
  const tokens = new Set(
    title.toLowerCase().split(/[^a-z0-9+#]+/).filter(Boolean).map(stem),
  );
  return words.every((w, i) => {
    const options = ROLE_SYNONYMS[w] ?? [w];
    if (options.some((o) => tokens.has(stem(o)))) return true;
    const next = words[i + 1];
    const prev = words[i - 1];
    return (
      (next !== undefined && tokens.has(stem(w + next))) ||
      (prev !== undefined && tokens.has(stem(prev + w)))
    );
  });
}
