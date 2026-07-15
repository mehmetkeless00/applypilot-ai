// Shared plain-text helpers. HTML-entity decoding lives here so the job
// importer, pages, and exporters all normalize metadata the same way.
// Decoding outputs plain text only — it is rendered through React's normal
// escaping (never dangerouslySetInnerHTML), so "&lt;script&gt;" becomes the
// literal text "<script>", not markup.

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  bull: "•",
  middot: "·",
  eacute: "é",
};

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (match, name: string) =>
      NAMED_ENTITIES[name.toLowerCase()] ?? match,
    );
}

/**
 * Normalizes a metadata field (job title, company, location): decodes HTML
 * entities once and collapses whitespace. Already-decoded text passes
 * through unchanged.
 */
export function cleanMetadataText(
  text: string | null | undefined,
): string | undefined {
  if (!text) return undefined;
  const cleaned = decodeHtmlEntities(text).replace(/\s+/g, " ").trim();
  return cleaned || undefined;
}

/**
 * Render/export-time normalization for analyses persisted before import
 * metadata was decoded (legacy rows may hold "Bytes &amp; Pixels GmbH").
 */
export function decodeAnalysisMetadata<
  T extends { job_title: string; company: string | null },
>(analysis: T): T {
  return {
    ...analysis,
    job_title: decodeHtmlEntities(analysis.job_title),
    company: analysis.company ? decodeHtmlEntities(analysis.company) : analysis.company,
  };
}
