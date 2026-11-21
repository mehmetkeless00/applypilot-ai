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
