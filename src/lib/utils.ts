import type { ResumeSource } from "@/lib/types";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** User-facing labels for how a resume version was created. */
export const RESUME_SOURCE_LABELS: Record<ResumeSource, string> = {
  pdf: "Uploaded PDF",
  paste: "Manual edit",
  applied_suggestion: "Applied suggestion",
};

export function resumeSourceLabel(source: string): string {
  return RESUME_SOURCE_LABELS[source as ResumeSource] ?? "Manual edit";
}

export type ScoreTone = "poor" | "fair" | "strong";

export function scoreTone(score: number): ScoreTone {
  if (score < 50) return "poor";
  if (score < 75) return "fair";
  return "strong";
}
