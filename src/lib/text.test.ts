import { describe, expect, it } from "vitest";
import {
  cleanMetadataText,
  decodeAnalysisMetadata,
  decodeHtmlEntities,
} from "./text";

describe("decodeHtmlEntities", () => {
  it("decodes named entities", () => {
    expect(decodeHtmlEntities("Bytes &amp; Pixels GmbH")).toBe(
      "Bytes & Pixels GmbH",
    );
    expect(decodeHtmlEntities("&quot;Senior&quot; Engineer")).toBe(
      '"Senior" Engineer',
    );
  });

  it("decodes numeric and hex entities", () => {
    expect(decodeHtmlEntities("O&#39;Brien")).toBe("O'Brien");
    expect(decodeHtmlEntities("O&#x27;Brien &#8211; Lead")).toBe(
      "O'Brien – Lead",
    );
  });

  it("leaves already-decoded text unchanged", () => {
    expect(decodeHtmlEntities("Bytes & Pixels GmbH")).toBe(
      "Bytes & Pixels GmbH",
    );
    expect(decodeHtmlEntities("Plain title")).toBe("Plain title");
  });

  it("decodes angle brackets to plain text, not markup", () => {
    // The result is a plain string rendered via React escaping — it can
    // never become executable markup.
    const decoded = decodeHtmlEntities("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(decoded).toBe("<script>alert(1)</script>");
    expect(typeof decoded).toBe("string");
  });
});

describe("cleanMetadataText", () => {
  it("decodes, collapses whitespace, and trims", () => {
    expect(cleanMetadataText("  Labeless (Bytes &amp;  Pixels GmbH) ")).toBe(
      "Labeless (Bytes & Pixels GmbH)",
    );
  });

  it("returns undefined for empty input", () => {
    expect(cleanMetadataText("")).toBeUndefined();
    expect(cleanMetadataText(null)).toBeUndefined();
    expect(cleanMetadataText("   ")).toBeUndefined();
  });
});

describe("decodeAnalysisMetadata", () => {
  it("decodes legacy encoded database values for rendering", () => {
    const decoded = decodeAnalysisMetadata({
      job_title: "Engineer &amp; Architect",
      company: "Labeless (Bytes &amp; Pixels GmbH)",
    });
    expect(decoded.job_title).toBe("Engineer & Architect");
    expect(decoded.company).toBe("Labeless (Bytes & Pixels GmbH)");
  });

  it("passes through clean values and null company", () => {
    const clean = decodeAnalysisMetadata({ job_title: "Engineer", company: null });
    expect(clean.job_title).toBe("Engineer");
    expect(clean.company).toBeNull();
  });
});
