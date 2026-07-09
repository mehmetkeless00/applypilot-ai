import type { Analysis } from "@/lib/types";

export const EXPORT_DOCS = ["summary", "cover_letter", "full"] as const;
export const EXPORT_FORMATS = ["pdf", "docx"] as const;

export type ExportDoc = (typeof EXPORT_DOCS)[number];
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export function isExportDoc(value: string): value is ExportDoc {
  return (EXPORT_DOCS as readonly string[]).includes(value);
}

export function isExportFormat(value: string): value is ExportFormat {
  return (EXPORT_FORMATS as readonly string[]).includes(value);
}

export const docTitles: Record<ExportDoc, string> = {
  summary: "Tailored Professional Summary",
  cover_letter: "Cover Letter",
  full: "Application Fit Report",
};

// The cover letter is stored as Markdown; exports want plain text.
export function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^[-*]\s+/gm, "• ")
    .trim();
}

export function docBody(analysis: Analysis, doc: "summary" | "cover_letter"): string {
  return doc === "summary"
    ? analysis.tailored_summary.trim()
    : stripMarkdown(analysis.cover_letter);
}

export function paragraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function exportFilename(
  analysis: Analysis,
  doc: ExportDoc,
  format: ExportFormat,
): string {
  const slug = analysis.job_title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const name = doc === "full" ? "fit-report" : doc.replace("_", "-");
  return `${name}-${slug}.${format}`;
}
