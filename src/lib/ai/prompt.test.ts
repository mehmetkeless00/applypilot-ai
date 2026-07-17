import { describe, expect, it } from "vitest";
import { buildUserParts, SYSTEM_PROMPT, systemPromptFor } from "./prompt";

describe("systemPromptFor", () => {
  it("returns the base prompt unchanged for English", () => {
    expect(systemPromptFor("en")).toBe(SYSTEM_PROMPT);
  });

  it("keeps every anti-fabrication rule in the Turkish prompt", () => {
    const prompt = systemPromptFor("tr");
    // The full factual-integrity section is present verbatim.
    expect(prompt).toContain(SYSTEM_PROMPT);
    expect(prompt).toContain("Factual integrity (non-negotiable");
    expect(prompt).toContain('"July 2025" must remain "July 2025"');
  });

  it("directs Turkish output without translating facts", () => {
    const prompt = systemPromptFor("tr");
    expect(prompt).toContain("Output language: Turkish.");
    expect(prompt).toContain("Never translate proper nouns");
    // original_text must stay verbatim so apply-suggestion matching works.
    expect(prompt).toContain(
      "original_text must remain the candidate's exact resume text, completely untranslated",
    );
    expect(prompt).toContain(
      "improved_text must stay in the same language as original_text",
    );
    // Regression: production translated English improved_text into Turkish.
    expect(prompt).toContain("Never translate improved_text into Turkish");
  });
});

describe("date grounding", () => {
  // Regression: without today's date the model fell back to its training
  // year and described July 2025 experience as "future dates" in mid-2026.
  it("supplies today's date to the model", () => {
    const today = new Date().toISOString().slice(0, 10);
    const parts = buildUserParts({
      jobTitle: "Engineer",
      jobDescription: "Build things.",
      resumeText: "Resume body",
    });
    const header = parts[0].text ?? "";
    expect(header).toContain(`<current_date>${today}</current_date>`);
  });

  it("instructs the model to judge recency only against the provided date", () => {
    expect(SYSTEM_PROMPT).toContain("Judge recency only against that date");
    expect(SYSTEM_PROMPT).toContain('"July 2025" must remain "July 2025"');
  });
});
