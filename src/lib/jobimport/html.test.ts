import { describe, expect, it } from "vitest";
import { decodeEntities, extractJobPostingJsonLd, htmlToText } from "./html";

describe("decodeEntities", () => {
  it("decodes named, decimal, and hex entities", () => {
    expect(decodeEntities("Fish &amp; Chips &#233; &#x41;")).toBe("Fish & Chips é A");
  });

  it("leaves unknown entities untouched", () => {
    expect(decodeEntities("&unknownthing;")).toBe("&unknownthing;");
  });
});

describe("htmlToText", () => {
  it("converts paragraphs, lists, and breaks to readable text", () => {
    const html =
      "<p>About the role</p><ul><li>Build features</li><li>Review code</li></ul><p>Apply&nbsp;now</p>";
    const text = htmlToText(html);
    expect(text).toContain("About the role");
    expect(text).toContain("• Build features");
    expect(text).toContain("• Review code");
    expect(text).toContain("Apply now");
  });

  it("drops script and style content", () => {
    const text = htmlToText("<style>.a{}</style><p>Visible</p><script>alert(1)</script>");
    expect(text).toBe("Visible");
  });

  it("collapses excessive blank lines", () => {
    const text = htmlToText("<p>a</p><p></p><p></p><p>b</p>");
    expect(text).toBe("a\n\nb");
  });
});

describe("extractJobPostingJsonLd", () => {
  const posting = {
    "@type": "JobPosting",
    title: "Staff Engineer",
    description: "<p>Do great work</p>",
    hiringOrganization: { name: "Acme" },
    jobLocation: { address: { addressLocality: "Berlin", addressCountry: "DE" } },
  };

  it("extracts a JobPosting from a JSON-LD script block", () => {
    const html = `<html><head><script type="application/ld+json">${JSON.stringify(posting)}</script></head></html>`;
    const result = extractJobPostingJsonLd(html);
    expect(result?.title).toBe("Staff Engineer");
    expect(result?.company).toBe("Acme");
    expect(result?.location).toBe("Berlin, DE");
    expect(result?.descriptionHtml).toContain("Do great work");
  });

  it("handles arrays of JSON-LD entities and skips non-postings", () => {
    const html = `<script type="application/ld+json">${JSON.stringify([
      { "@type": "Organization", name: "Acme" },
      posting,
    ])}</script>`;
    expect(extractJobPostingJsonLd(html)?.title).toBe("Staff Engineer");
  });

  it("returns null when no posting exists or JSON is invalid", () => {
    expect(extractJobPostingJsonLd("<p>nothing here</p>")).toBeNull();
    expect(
      extractJobPostingJsonLd(
        '<script type="application/ld+json">{not json}</script>',
      ),
    ).toBeNull();
  });
});
