import { describe, expect, it } from "vitest";
import { analysisPdfBuffer } from "./pdf";
import { extractPdfText } from "@/lib/resumes/extract";
import type { Analysis } from "@/lib/types";

// Regression: the export previously used the built-in Helvetica fonts,
// whose WinAnsi encoding corrupts Turkish characters (ş → _, ı → 1,
// İ → 0, ğ dropped) in every generated PDF. Round-trip through the same
// extractor the app uses for uploaded resumes to prove glyphs survive.

const turkishAnalysis = {
  job_title: "Kıdemli Yazılım Mühendisi",
  company: "Şirket Öğütçü",
  fit_score: 72,
  fit_summary:
    "Güçlü uyum. Değerlendirme çğıİöşüÇĞIÖŞÜ karakterlerinin tamamını içerir.",
  strengths: [
    {
      strength: "SQL ve Python konusunda güçlü temeller",
      evidence: "Strong foundation in SQL and experience with Python.",
    },
  ],
  missing_skills: [
    {
      skill: "Danimarka'da çalışma izni",
      importance: "critical",
      suggestion: "Çalışma izni durumunuzu özgeçmişinizde açıkça belirtin.",
    },
  ],
  ats_keywords: [
    {
      keyword: "İş zekası",
      status: "missing",
      importance: "preferred",
      suggestion: "BI deneyiminizi ölçülebilir örneklerle gösterin.",
    },
  ],
  resume_suggestions: [
    {
      section: "Özet",
      original_text: "Software engineer with SQL experience.",
      improved_text: "Software engineer with strong SQL experience.",
      reason: "İlanın diliyle uyumlu, daha güçlü bir ifade.",
      impact: "high",
    },
  ],
  tailored_summary: "Bilgisayar Mühendisliği mezunuyum; veri işleme deneyimim var.",
  cover_letter: "Sayın İşe Alım Ekibi,\n\nBaşvurumu değerlendirmeniz için yazıyorum.",
  output_language: "tr",
} as unknown as Analysis;

describe("analysisPdfBuffer Turkish character support", () => {
  it("preserves every Turkish glyph in the full report", async () => {
    const buffer = await analysisPdfBuffer(turkishAnalysis, "full");
    const text = await extractPdfText(buffer);
    expect(text).toBeTruthy();
    // Turkish headings from the analysis language.
    expect(text).toContain("Başvuru Uyum Raporu");
    expect(text).toContain("Güçlü yönler");
    // User facts and narrative keep dotless-ı, ş, ğ, İ, ö, ü intact.
    expect(text).toContain("Kıdemli Yazılım Mühendisi");
    expect(text).toContain("Danimarka'da çalışma izni");
    expect(text).toContain("İş zekası");
    expect(text).toContain("çğıİöşüÇĞIÖŞÜ");
    // The historical corruption patterns must not reappear.
    expect(text).not.toContain("Ba_vuru");
    expect(text).not.toContain("yaz1l1m");
  }, 30000);

  it("keeps English exports intact with the embedded font", async () => {
    const english = {
      ...turkishAnalysis,
      output_language: "en",
      job_title: "Senior Software Engineer",
    } as unknown as Analysis;
    const buffer = await analysisPdfBuffer(english, "cover_letter");
    const text = await extractPdfText(buffer);
    expect(text).toBeTruthy();
    expect(text).toContain("Cover Letter");
    expect(text).toContain("Senior Software Engineer");
  }, 30000);
});
