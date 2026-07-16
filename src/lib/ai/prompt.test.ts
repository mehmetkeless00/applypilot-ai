import { describe, expect, it } from "vitest";
import { SYSTEM_PROMPT, systemPromptFor } from "./prompt";

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
  });
});
