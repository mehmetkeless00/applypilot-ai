import { describe, expect, it } from "vitest";
import {
  atsStatusCounts,
  compareAtsKeywords,
  scoreChangeLabel,
} from "./compare";
import type { AtsKeyword } from "@/lib/types";

function kw(keyword: string, status: AtsKeyword["status"]): AtsKeyword {
  return { keyword, status, importance: "required", suggestion: "" };
}

describe("scoreChangeLabel", () => {
  it("describes improvements, decreases, and no change", () => {
    expect(scoreChangeLabel(60, 68)).toBe("Score improved by 8 points");
    expect(scoreChangeLabel(60, 61)).toBe("Score improved by 1 point");
    expect(scoreChangeLabel(70, 67)).toBe("Score decreased by 3 points");
    expect(scoreChangeLabel(70, 70)).toBe("No score change");
  });
});

describe("atsStatusCounts", () => {
  it("counts keywords by status", () => {
    expect(
      atsStatusCounts([
        kw("react", "matched"),
        kw("sql", "matched"),
        kw("go", "weak"),
        kw("aws", "missing"),
      ]),
    ).toEqual({ matched: 2, weak: 1, missing: 1 });
    expect(atsStatusCounts([])).toEqual({ matched: 0, weak: 0, missing: 0 });
  });
});

describe("compareAtsKeywords", () => {
  it("tracks keywords that became matched and ones that regressed", () => {
    const previous = [
      kw("react", "missing"),
      kw("sql", "weak"),
      kw("aws", "matched"),
      kw("go", "matched"),
    ];
    const current = [
      kw("React", "matched"), // case-insensitive match-up
      kw("sql", "matched"),
      kw("aws", "weak"),
      kw("go", "matched"),
      kw("docker", "matched"), // newly reported keyword
    ];
    const comparison = compareAtsKeywords(previous, current);
    expect(comparison.nowMatched).toEqual(["React", "sql", "docker"]);
    expect(comparison.regressed).toEqual(["aws"]);
    expect(comparison.previous).toEqual({ matched: 2, weak: 1, missing: 1 });
    expect(comparison.current).toEqual({ matched: 4, weak: 1, missing: 0 });
  });

  it("reports nothing for identical coverage", () => {
    const same = [kw("react", "matched"), kw("aws", "missing")];
    const comparison = compareAtsKeywords(same, same);
    expect(comparison.nowMatched).toEqual([]);
    expect(comparison.regressed).toEqual([]);
  });
});
