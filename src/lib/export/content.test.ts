import { describe, expect, it } from "vitest";
import {
  exportFilename,
  exportLanguage,
  exportStrings,
  paragraphs,
  stripMarkdown,
} from "./content";
import type { Analysis } from "@/lib/types";

describe("stripMarkdown", () => {
  it("removes common markdown markers", () => {
    const input = "# Hello\n\nI am **bold** and *keen*.\n\n- one\n- two";
    const out = stripMarkdown(input);
    expect(out).not.toContain("#");
    expect(out).not.toContain("**");
    expect(out).toContain("I am bold and keen.");
    expect(out).toContain("• one");
  });
});

describe("paragraphs", () => {
  it("splits on blank lines and drops empties", () => {
    expect(paragraphs("a\n\nb\n\n\n\nc\n\n")).toEqual(["a", "b", "c"]);
  });
});

describe("export localization", () => {
  it("derives the export language from the analysis, defaulting legacy rows to English", () => {
    expect(exportLanguage({ output_language: "tr" } as Analysis)).toBe("tr");
    expect(exportLanguage({ output_language: "en" } as Analysis)).toBe("en");
    expect(exportLanguage({} as Analysis)).toBe("en");
  });

  it("provides Turkish document titles and section headings", () => {
    const t = exportStrings("tr");
    expect(t.docTitles.cover_letter).toBe("Ön Yazı");
    expect(t.docTitles.full).toBe("Başvuru Uyum Raporu");
    expect(t.strengths).toBe("Güçlü yönler");
    expect(t.missingSkills).toBe("Eksik yetkinlikler");
    expect(t.impact("high")).toBe("yüksek etki");
    expect(t.status.matched).toBe("eşleşti");
  });

  it("keeps English strings as before", () => {
    const t = exportStrings("en");
    expect(t.docTitles.summary).toBe("Tailored Professional Summary");
    expect(t.atsCoverage).toBe("ATS keyword coverage");
  });

  it("never localizes user data in filenames (job titles stay verbatim)", () => {
    const analysis = {
      job_title: "Kıdemli Backend Engineer",
      output_language: "tr",
    } as Analysis;
    // Filename slugging is mechanical; the title's own words are preserved
    // (non-ASCII characters are dropped by the slug rule, not translated).
    expect(exportFilename(analysis, "cover_letter", "pdf")).toContain(
      "backend-engineer",
    );
  });
});
