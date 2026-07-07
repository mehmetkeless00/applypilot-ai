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

export type ScoreTone = "poor" | "fair" | "strong";

export function scoreTone(score: number): ScoreTone {
  if (score < 50) return "poor";
  if (score < 75) return "fair";
  return "strong";
}
