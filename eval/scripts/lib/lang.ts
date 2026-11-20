// Tiny stopword-based language guess, good enough to tag a pair as
// same-language or cross-language. Counts how many very common words of
// each language appear; the language with the most hits wins. Returns
// "unknown" when the text is too short or no language clearly leads.

const STOPWORDS: Record<string, string[]> = {
  en: ["the", "and", "with", "for", "you", "our", "are", "will", "your", "experience"],
  tr: ["ve", "bir", "ile", "için", "olarak", "bu", "da", "de", "deneyim", "olan"],
  de: ["und", "die", "der", "mit", "für", "wir", "sie", "das", "ist", "erfahrung"],
  fr: ["et", "les", "des", "pour", "vous", "une", "avec", "dans", "nous", "expérience"],
  es: ["y", "los", "las", "para", "con", "una", "del", "experiencia", "por", "que"],
  nl: ["en", "het", "van", "een", "voor", "met", "je", "wij", "ervaring", "zijn"],
  pl: ["i", "w", "na", "z", "do", "się", "oraz", "dla", "doświadczenie", "jest"],
  it: ["e", "il", "di", "per", "con", "una", "della", "che", "esperienza", "nel"],
};

export function detectLanguage(text: string): string {
  const words = text.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
  if (words.length < 15) return "unknown";
  const counts = Object.entries(STOPWORDS).map(([lang, list]) => {
    const set = new Set(list);
    return [lang, words.filter((w) => set.has(w)).length] as const;
  });
  counts.sort((a, b) => b[1] - a[1]);
  const [best, second] = counts;
  if (best[1] < 3 || best[1] < second[1] * 1.5) return "unknown";
  return best[0];
}
