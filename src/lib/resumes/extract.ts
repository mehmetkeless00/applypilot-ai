import { extractText, getDocumentProxy } from "unpdf";

// Server-only PDF text extraction (unpdf = serverless-friendly pdf.js).
// Best-effort by design: image-only/scanned PDFs yield no usable text, in
// which case callers keep the PDF path as the analysis source.

/** Below this, the "text" is furniture (page numbers, dates) — treat as none. */
const MIN_USABLE_CHARS = 50;

export async function extractPdfText(
  pdf: Buffer | Uint8Array,
): Promise<string | null> {
  try {
    const document = await getDocumentProxy(new Uint8Array(pdf));
    const { text } = await extractText(document, { mergePages: true });
    const cleaned = text
      .replace(/[ \t]+/g, " ")
      .replace(/ ?\n ?/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return cleaned.length >= MIN_USABLE_CHARS ? cleaned : null;
  } catch {
    return null;
  }
}
