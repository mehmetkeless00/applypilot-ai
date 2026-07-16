import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ScoreComparison, type ComparisonRun } from "./ScoreComparison";
import type { AtsKeyword } from "@/lib/types";

function kw(keyword: string, status: AtsKeyword["status"]): AtsKeyword {
  return { keyword, status, importance: "required", suggestion: "" };
}

function run(overrides: Partial<ComparisonRun>): ComparisonRun {
  return {
    id: "a1",
    score: 60,
    atsKeywords: [],
    createdAt: "2026-07-01T00:00:00.000Z",
    resumeVersion: null,
    ...overrides,
  };
}

describe("ScoreComparison", () => {
  it("shows both scores, versions, dates, and a link to the previous run", () => {
    const html = renderToStaticMarkup(
      <ScoreComparison
        previous={run({ id: "prev-1", score: 60, resumeVersion: 2 })}
        current={run({
          id: "cur-1",
          score: 68,
          resumeVersion: 3,
          createdAt: "2026-07-15T00:00:00.000Z",
        })}
      />,
    );
    expect(html).toContain("Score improved by 8 points");
    expect(html).toContain("60");
    expect(html).toContain("68");
    expect(html).toContain("resume v2");
    expect(html).toContain("resume v3");
    expect(html).toContain('href="/dashboard/analysis/prev-1"');
    expect(html).toContain("Jul 1, 2026");
    expect(html).toContain("Jul 15, 2026");
  });

  it("states decreases and no-change plainly", () => {
    const down = renderToStaticMarkup(
      <ScoreComparison
        previous={run({ score: 70 })}
        current={run({ score: 67 })}
      />,
    );
    expect(down).toContain("Score decreased by 3 points");

    const flat = renderToStaticMarkup(
      <ScoreComparison
        previous={run({ score: 70 })}
        current={run({ score: 70 })}
      />,
    );
    expect(flat).toContain("No score change");
  });

  it("compares ATS keyword coverage and never promises employment", () => {
    const html = renderToStaticMarkup(
      <ScoreComparison
        previous={run({
          atsKeywords: [kw("react", "missing"), kw("aws", "matched")],
        })}
        current={run({
          score: 65,
          atsKeywords: [kw("react", "matched"), kw("aws", "matched")],
        })}
      />,
    );
    expect(html).toContain("matched 1 → 2");
    expect(html).toContain("missing 1 → 0");
    expect(html).toContain("Now matched:");
    expect(html).toContain("react");
    expect(html).toContain("guarantee interviews or offers");
  });
});
