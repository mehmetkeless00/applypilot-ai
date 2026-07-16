import type { AtsKeyword } from "@/lib/types";

// Pure comparison helpers for the re-score loop. All wording is careful
// not to imply that a higher AI score guarantees anything with employers.

export function scoreChangeLabel(previous: number, current: number): string {
  const delta = current - previous;
  const points = (n: number) => `${n} point${n === 1 ? "" : "s"}`;
  if (delta > 0) return `Score improved by ${points(delta)}`;
  if (delta < 0) return `Score decreased by ${points(-delta)}`;
  return "No score change";
}

export interface AtsStatusCounts {
  matched: number;
  weak: number;
  missing: number;
}

export function atsStatusCounts(keywords: AtsKeyword[]): AtsStatusCounts {
  const counts: AtsStatusCounts = { matched: 0, weak: 0, missing: 0 };
  for (const k of keywords) {
    if (k.status in counts) counts[k.status] += 1;
  }
  return counts;
}

export interface AtsComparison {
  previous: AtsStatusCounts;
  current: AtsStatusCounts;
  /** Keywords that were weak/missing (or unreported) before and match now. */
  nowMatched: string[];
  /** Keywords that matched before but are weak/missing now. */
  regressed: string[];
}

export function compareAtsKeywords(
  previous: AtsKeyword[],
  current: AtsKeyword[],
): AtsComparison {
  const prevStatus = new Map(
    previous.map((k) => [k.keyword.toLowerCase(), k.status]),
  );
  const nowMatched: string[] = [];
  const regressed: string[] = [];
  for (const k of current) {
    const before = prevStatus.get(k.keyword.toLowerCase());
    if (k.status === "matched" && before !== "matched") {
      nowMatched.push(k.keyword);
    } else if (k.status !== "matched" && before === "matched") {
      regressed.push(k.keyword);
    }
  }
  return {
    previous: atsStatusCounts(previous),
    current: atsStatusCounts(current),
    nowMatched,
    regressed,
  };
}
