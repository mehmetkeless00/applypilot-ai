import { dateLocale, getMessages, type Locale } from "@/lib/i18n";
import type { ResumeSource } from "@/lib/types";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/** Locale-aware date display (en-US / tr-TR). */
export function formatDate(iso: string, locale: Locale = "en") {
  return new Date(iso).toLocaleDateString(dateLocale(locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** User-facing label for how a resume version was created. */
export function resumeSourceLabel(source: string, locale: Locale = "en"): string {
  const labels = getMessages(locale).resumes.sources;
  return labels[source as ResumeSource] ?? labels.paste;
}

export type ScoreTone = "poor" | "fair" | "strong";

export function scoreTone(score: number): ScoreTone {
  if (score < 50) return "poor";
  if (score < 75) return "fair";
  return "strong";
}
