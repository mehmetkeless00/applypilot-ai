import { cn } from "@/lib/utils";
import type { ExportDoc, ExportFormat } from "@/lib/export/content";

const linkClass =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-colors bg-white text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700 dark:hover:bg-slate-700";

const formatLabels: Record<ExportFormat, string> = {
  pdf: "Export PDF",
  docx: "Export DOCX",
};

export function ExportButtons({
  analysisId,
  doc,
  formats = ["pdf", "docx"],
  className,
}: {
  analysisId: string;
  doc: ExportDoc;
  formats?: ExportFormat[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {formats.map((format) => (
        <a
          key={format}
          className={linkClass}
          href={`/api/analyses/${analysisId}/export?format=${format}&doc=${doc}`}
        >
          {doc === "full" ? "Download full report (PDF)" : formatLabels[format]}
        </a>
      ))}
    </div>
  );
}
