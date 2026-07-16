import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { ApplySuggestionButton, SuggestionPreview } from "./ApplySuggestion";

const suggestion = {
  section: "Experience",
  original_text: "Worked on APIs",
  improved_text: "Designed and shipped public APIs",
  reason: "More specific about scope.",
  impact: "high" as const,
};

describe("SuggestionPreview", () => {
  const html = renderToStaticMarkup(
    <SuggestionPreview suggestion={suggestion} titleId="t1" />,
  );

  it("shows before, after, and the reason", () => {
    expect(html).toContain("Before");
    expect(html).toContain("After");
    expect(html).toContain("Worked on APIs");
    expect(html).toContain("Designed and shipped public APIs");
    expect(html).toContain("More specific about scope.");
  });

  it("warns that only the shown text will change", () => {
    expect(html).toContain("Only the text shown above will change");
  });

  it("uses a real heading tied to the dialog label", () => {
    expect(html).toContain('<h2 id="t1"');
    expect(html).toContain("Preview change");
  });
});

describe("ApplySuggestionButton", () => {
  const html = renderToStaticMarkup(
    <ApplySuggestionButton
      analysisId="analysis-1"
      suggestionIndex={0}
      suggestion={suggestion}
    />,
  );

  it("offers the Apply to resume entry point", () => {
    expect(html).toContain("Apply to resume");
  });

  it("renders an accessible dialog with confirm and cancel actions", () => {
    expect(html).toContain("<dialog");
    expect(html).toContain("aria-labelledby");
    expect(html).toContain("Cancel");
    expect(html).toContain("Create new version");
    expect(html).toContain(
      'aria-label="Create a new resume version with this change"',
    );
  });

  it("escapes suggestion content instead of rendering it as HTML", () => {
    const hostile = renderToStaticMarkup(
      <ApplySuggestionButton
        analysisId="analysis-1"
        suggestionIndex={0}
        suggestion={{
          ...suggestion,
          improved_text: '<script>alert("x")</script>',
        }}
      />,
    );
    expect(hostile).not.toContain("<script>");
    expect(hostile).toContain("&lt;script&gt;");
  });
});
