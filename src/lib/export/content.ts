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

export type ExportLanguage = "en" | "tr";

/** The language an analysis's exports should use (legacy rows → English). */
export function exportLanguage(analysis: Analysis): ExportLanguage {
  return analysis.output_language === "tr" ? "tr" : "en";
}

export interface ExportStrings {
  docTitles: Record<ExportDoc, string>;
  strengths: string;
  missingSkills: string;
  atsCoverage: string;
  suggestions: string;
  summary: string;
  coverLetter: string;
  current: string;
  improved: string;
  impact: (impact: string) => string;
  importance: Record<string, string>;
  status: Record<string, string>;
}

// Section headings follow the analysis output language. User content
// (job titles, company names, resume text, dates) is never translated.
const EXPORT_STRINGS: Record<ExportLanguage, ExportStrings> = {
  en: {
    docTitles: {
      summary: "Tailored Professional Summary",
      cover_letter: "Cover Letter",
      full: "Application Fit Report",
    },
    strengths: "Strengths",
    missingSkills: "Missing skills",
    atsCoverage: "ATS keyword coverage",
    suggestions: "Resume improvement suggestions",
    summary: "Tailored professional summary",
    coverLetter: "Cover letter",
    current: "Current",
    improved: "Improved",
    impact: (impact) => `${impact} impact`,
    importance: {
      critical: "critical",
      important: "important",
      nice_to_have: "nice to have",
      required: "required",
      preferred: "preferred",
    },
    status: { matched: "matched", weak: "weak", missing: "missing" },
  },
  tr: {
    docTitles: {
      summary: "Kişiselleştirilmiş Profesyonel Özet",
      cover_letter: "Ön Yazı",
      full: "Başvuru Uyum Raporu",
    },
    strengths: "Güçlü yönler",
    missingSkills: "Eksik yetkinlikler",
    atsCoverage: "ATS anahtar kelime kapsamı",
    suggestions: "CV iyileştirme önerileri",
    summary: "Kişiselleştirilmiş profesyonel özet",
    coverLetter: "Ön yazı",
    current: "Mevcut",
    improved: "İyileştirilmiş",
    impact: (impact) =>
      `${{ high: "yüksek", medium: "orta", low: "düşük" }[impact] ?? impact} etki`,
    importance: {
      critical: "kritik",
      important: "önemli",
      nice_to_have: "artı değer",
      required: "zorunlu",
      preferred: "tercih edilen",
    },
    status: { matched: "eşleşti", weak: "zayıf", missing: "eksik" },
  },
};

export function exportStrings(language: ExportLanguage): ExportStrings {
  return EXPORT_STRINGS[language];
}

export const docTitles: Record<ExportDoc, string> = EXPORT_STRINGS.en.docTitles;

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
