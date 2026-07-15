import { describe, expect, it } from "vitest";
import { extractPdfText } from "./extract";
import { samplePdf } from "./pdf-test-fixture";

const RESUME_TEXT =
  "Senior Backend Engineer at Acme GmbH since July 2025. " +
  "Led migration of payment services to Go, cutting deploy time by 30%.";

describe("extractPdfText", () => {
  it("extracts readable text from a real PDF", async () => {
    const pdf = await samplePdf(RESUME_TEXT);
    const text = await extractPdfText(pdf);
    expect(text).toBeTruthy();
    expect(text).toContain("Acme GmbH");
    expect(text).toContain("July 2025");
  });

  it("returns null for invalid PDF bytes", async () => {
    expect(await extractPdfText(Buffer.from("not a pdf at all"))).toBeNull();
  });

  it("returns null when there is no usable text", async () => {
    const pdf = await samplePdf("hi");
    expect(await extractPdfText(pdf)).toBeNull();
  });
});
