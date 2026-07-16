import { describe, expect, it } from "vitest";
import {
  applySuggestionToContent,
  countOccurrences,
  isApplicableSuggestion,
} from "./applySuggestion";

describe("countOccurrences", () => {
  it("counts non-overlapping occurrences", () => {
    expect(countOccurrences("a b a b a", "a")).toBe(3);
    expect(countOccurrences("aaa", "aa")).toBe(1);
    expect(countOccurrences("hello", "x")).toBe(0);
    expect(countOccurrences("hello", "")).toBe(0);
  });
});

describe("applySuggestionToContent", () => {
  const content = "Line one\nWorked on APIs\nLine three";

  it("replaces the original text when it appears exactly once", () => {
    const outcome = applySuggestionToContent(
      content,
      "Worked on APIs",
      "Designed and shipped public APIs",
    );
    expect(outcome).toEqual({
      ok: true,
      content: "Line one\nDesigned and shipped public APIs\nLine three",
    });
  });

  it("reports not_found when the text is absent", () => {
    expect(applySuggestionToContent(content, "Missing text", "x")).toEqual({
      ok: false,
      reason: "not_found",
    });
  });

  it("reports multiple_matches instead of guessing", () => {
    expect(
      applySuggestionToContent(
        `${content}\nWorked on APIs`,
        "Worked on APIs",
        "x",
      ),
    ).toEqual({ ok: false, reason: "multiple_matches" });
  });
});

describe("isApplicableSuggestion", () => {
  const valid = {
    section: "Experience",
    original_text: "Worked on APIs",
    improved_text: "Designed public APIs",
    reason: "r",
    impact: "high" as const,
  };

  it("accepts a well-formed suggestion", () => {
    expect(isApplicableSuggestion(valid)).toBe(true);
  });

  it("rejects malformed suggestions", () => {
    expect(isApplicableSuggestion(null)).toBe(false);
    expect(isApplicableSuggestion("text")).toBe(false);
    expect(isApplicableSuggestion({ ...valid, original_text: "" })).toBe(false);
    expect(isApplicableSuggestion({ ...valid, improved_text: "   " })).toBe(false);
    expect(isApplicableSuggestion({ ...valid, improved_text: undefined })).toBe(false);
    expect(
      isApplicableSuggestion({ ...valid, improved_text: valid.original_text }),
    ).toBe(false);
  });
});
