import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DiffView, VersionCompare, type CompareVersion } from "./VersionCompare";
import { diffLines } from "@/lib/diff";

function version(overrides: Partial<CompareVersion>): CompareVersion {
  return {
    id: "v1",
    version: 1,
    source: "paste",
    created_at: "2026-07-01T00:00:00.000Z",
    content: "hello",
    ...overrides,
  };
}

describe("DiffView", () => {
  it("renders additions as <ins> and removals as <del>", () => {
    const html = renderToStaticMarkup(
      <DiffView parts={diffLines("keep\nold line", "keep\nnew line")} />,
    );
    expect(html).toContain("<ins");
    expect(html).toContain("old line");
    expect(html).toContain("<del");
    expect(html).toContain("new line");
    expect(html).toContain("keep");
  });

  it("escapes HTML and script content instead of executing it", () => {
    const before = "safe line";
    const after = 'safe line\n<script>alert("pwned")</script>\n<img src=x onerror=hack()>';
    const html = renderToStaticMarkup(
      <DiffView parts={diffLines(before, after)} />,
    );
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img");
  });
});

describe("VersionCompare", () => {
  const versions: CompareVersion[] = [
    version({
      id: "v3",
      version: 3,
      source: "applied_suggestion",
      content: "Header\nImproved line\nFooter",
    }),
    version({ id: "v2", version: 2, content: "Header\nOld line\nFooter" }),
  ];

  it("compares the two most recent versions by default", () => {
    const html = renderToStaticMarkup(<VersionCompare versions={versions} />);
    expect(html).toContain("From version");
    expect(html).toContain("To version");
    expect(html).toContain("Old line");
    expect(html).toContain("Improved line");
    expect(html).toContain("<ins");
    expect(html).toContain("<del");
  });

  it("labels versions with their creation source", () => {
    const html = renderToStaticMarkup(<VersionCompare versions={versions} />);
    expect(html).toContain("Applied suggestion");
    expect(html).toContain("Manual edit");
  });

  it("explains when a PDF version has no text to compare", () => {
    const withPdf: CompareVersion[] = [
      versions[0],
      version({ id: "v1", version: 1, source: "pdf", content: null }),
    ];
    const html = renderToStaticMarkup(<VersionCompare versions={withPdf} />);
    expect(html).toContain("PDF without extracted text");
  });

  it("renders nothing with fewer than two versions", () => {
    expect(renderToStaticMarkup(<VersionCompare versions={[versions[0]]} />)).toBe("");
  });
});
