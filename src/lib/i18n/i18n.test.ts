import { describe, expect, it } from "vitest";
import { dateLocale, getMessages, normalizeLocale } from "./index";
import { en } from "./en";
import { tr } from "./tr";
import { formatDate, resumeSourceLabel } from "@/lib/utils";

describe("normalizeLocale", () => {
  it("accepts supported locales and falls back to English otherwise", () => {
    expect(normalizeLocale("tr")).toBe("tr");
    expect(normalizeLocale("en")).toBe("en");
    expect(normalizeLocale("de")).toBe("en");
    expect(normalizeLocale(undefined)).toBe("en");
    expect(normalizeLocale(null)).toBe("en");
    expect(normalizeLocale(42)).toBe("en");
  });
});

describe("getMessages", () => {
  it("returns the Turkish catalog for tr", () => {
    expect(getMessages("tr").nav.myAnalyses).toBe("Analizlerim");
    expect(getMessages("tr").nav.billing).toBe("Abonelik");
  });

  it("falls back to English for unknown or missing locales", () => {
    expect(getMessages("fr").nav.myAnalyses).toBe("My analyses");
    expect(getMessages(undefined).nav.myAnalyses).toBe("My analyses");
  });
});

// Walks the English catalog and asserts the Turkish catalog provides a
// value of the same kind at every path — the runtime guarantee behind the
// compile-time Messages type.
function assertCovered(enNode: unknown, trNode: unknown, path: string) {
  if (typeof enNode === "string") {
    expect(typeof trNode, path).toBe("string");
    expect((trNode as string).length, path).toBeGreaterThan(0);
    return;
  }
  if (typeof enNode === "function") {
    expect(typeof trNode, path).toBe("function");
    return;
  }
  if (Array.isArray(enNode)) {
    expect(Array.isArray(trNode), path).toBe(true);
    expect((trNode as unknown[]).length, path).toBe(enNode.length);
    enNode.forEach((item, i) =>
      assertCovered(item, (trNode as unknown[])[i], `${path}[${i}]`),
    );
    return;
  }
  expect(typeof trNode, path).toBe("object");
  for (const key of Object.keys(enNode as object)) {
    assertCovered(
      (enNode as Record<string, unknown>)[key],
      (trNode as Record<string, unknown>)[key],
      `${path}.${key}`,
    );
  }
}

describe("catalog coverage", () => {
  it("Turkish provides every English key (no missing translations)", () => {
    assertCovered(en, tr, "messages");
  });

  it("parameterized messages return text in both locales", () => {
    expect(en.errors.quotaFree(3, 50)).toContain("3");
    expect(tr.errors.quotaFree(3, 50)).toContain("3");
    expect(en.analysis.comparison.improvedBy(8)).toBe(
      "Score improved by 8 points",
    );
    expect(tr.analysis.comparison.improvedBy(8)).toBe("Puan 8 puan yükseldi");
    expect(tr.analysis.suggestions.rescoreWith(3)).toBe(
      "Sürüm 3 ile yeniden puanla",
    );
  });
});

describe("locale-aware formatting", () => {
  it("formats dates per locale", () => {
    expect(dateLocale("en")).toBe("en-US");
    expect(dateLocale("tr")).toBe("tr-TR");
    expect(formatDate("2026-08-01T00:00:00.000Z", "en")).toBe("Aug 1, 2026");
    expect(formatDate("2026-08-01T00:00:00.000Z", "tr")).toContain("Ağu");
    // Default stays English for backward compatibility.
    expect(formatDate("2026-08-01T00:00:00.000Z")).toBe("Aug 1, 2026");
  });

  it("localizes resume source labels", () => {
    expect(resumeSourceLabel("applied_suggestion")).toBe("Applied suggestion");
    expect(resumeSourceLabel("applied_suggestion", "tr")).toBe("Uygulanan öneri");
    expect(resumeSourceLabel("pdf", "tr")).toBe("PDF yükleme");
    expect(resumeSourceLabel("unknown-source", "tr")).toBe("Elle düzenleme");
  });
});
