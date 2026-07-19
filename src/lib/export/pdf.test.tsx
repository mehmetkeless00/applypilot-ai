import { describe, expect, it } from "vitest";
import { getDocumentProxy } from "unpdf";
import { analysisPdfBuffer } from "./pdf";
import { extractPdfText } from "@/lib/resumes/extract";
import type { Analysis } from "@/lib/types";

interface TextRect {
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Positioned text runs of one PDF page, in PDF user-space coordinates. */
async function pageTextRects(pdf: Buffer, pageNumber: number): Promise<TextRect[]> {
  const doc = await getDocumentProxy(new Uint8Array(pdf));
  const page = await doc.getPage(pageNumber);
  const content = await page.getTextContent();
  return (content.items as { str: string; transform: number[]; width: number; height: number }[])
    .filter((item) => item.str.trim().length > 0)
    .map((item) => ({
      str: item.str,
      x: item.transform[4],
      y: item.transform[5],
      w: item.width,
      h: item.height,
    }));
}

function rectsIntersect(a: TextRect, b: TextRect): boolean {
  // Shrink by 1pt to ignore mere touching edges.
  return (
    a.x + 1 < b.x + b.w &&
    b.x + 1 < a.x + a.w &&
    a.y + 1 < b.y + b.h &&
    b.y + 1 < a.y + a.h
  );
}

// Regression: the export previously used the built-in Helvetica fonts,
// whose WinAnsi encoding corrupts Turkish characters (ş → _, ı → 1,
// İ → 0, ğ dropped) in every generated PDF. Round-trip through the same
// extractor the app uses for uploaded resumes to prove glyphs survive.

const turkishAnalysis = {
  job_title: "Kıdemli Yazılım Mühendisi",
  company: "Şirket Öğütçü",
  created_at: "2026-07-01T10:00:00.000Z",
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

describe("analysisPdfBuffer layout", () => {
  // Regression: the score ("72") previously rendered with an inherited
  // line box shorter than its glyphs and collided with the summary text.
  it("keeps the score card clear of every other text run", async () => {
    const buffer = await analysisPdfBuffer(turkishAnalysis, "full");
    const rects = await pageTextRects(buffer, 1);
    const score = rects.find((r) => r.str.trim() === "72");
    expect(score).toBeDefined();
    for (const other of rects) {
      if (other === score) continue;
      expect(rectsIntersect(score!, other)).toBe(false);
    }
  }, 30000);

  it("shows the report language and date in the header", async () => {
    const tr = await extractPdfText(await analysisPdfBuffer(turkishAnalysis, "full"));
    expect(tr).toContain("Türkçe");
    const en = await extractPdfText(
      await analysisPdfBuffer(
        { ...turkishAnalysis, output_language: "en" } as unknown as Analysis,
        "full",
      ),
    );
    expect(en).toContain("English");
  }, 30000);

  it("groups ATS keywords by matched / weak / missing status", async () => {
    const grouped = {
      ...turkishAnalysis,
      output_language: "en",
      ats_keywords: [
        { keyword: "SQL", status: "matched", importance: "required", suggestion: "Keep it prominent." },
        { keyword: "Python", status: "matched", importance: "required", suggestion: "Quantify usage." },
        { keyword: "dbt", status: "weak", importance: "preferred", suggestion: "Name it explicitly." },
        { keyword: "BigQuery", status: "missing", importance: "preferred", suggestion: "Add if genuine." },
      ],
    } as unknown as Analysis;
    const text = (await extractPdfText(await analysisPdfBuffer(grouped, "full")))!;
    expect(text).toContain("matched (2)");
    expect(text).toContain("weak (1)");
    expect(text).toContain("missing (1)");
    // Group headers keep keywords of the same status together.
    expect(text.indexOf("SQL")).toBeLessThan(text.indexOf("dbt"));
    expect(text.indexOf("dbt")).toBeLessThan(text.indexOf("BigQuery"));
  }, 30000);

  it("paginates long reports with page numbers and no entity leakage", async () => {
    const longParagraph =
      "ApplyPilot değerlendirmesi, adayın R&D deneyimini ve ölçeklenebilir veri işleme geçmişini ayrıntılı olarak inceler. ".repeat(4);
    const long = {
      ...turkishAnalysis,
      cover_letter: Array.from({ length: 30 }, () => longParagraph).join("\n\n"),
      tailored_summary: Array.from({ length: 6 }, () => longParagraph).join("\n\n"),
      resume_suggestions: Array.from({ length: 8 }, (_, i) => ({
        section: `Deneyim ${i + 1}`,
        original_text: "Developed data processing systems with Python and SQL for analytics teams.",
        improved_text: "Developed scalable data processing systems with Python and SQL, supporting analytics teams.",
        reason: "İlanın diliyle uyumlu, daha güçlü ve ölçülebilir bir ifade sağlar.",
        impact: "medium",
      })),
    } as unknown as Analysis;

    const buffer = await analysisPdfBuffer(long, "full");
    const doc = await getDocumentProxy(new Uint8Array(buffer));
    expect(doc.numPages).toBeGreaterThanOrEqual(5);

    // No text run may collide with any other on any page — this is the
    // pagination-safety net for the whole report.
    for (let pageNo = 1; pageNo <= doc.numPages; pageNo++) {
      const rects = await pageTextRects(buffer, pageNo);
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          if (rectsIntersect(rects[i], rects[j])) {
            throw new Error(
              `page ${pageNo}: "${rects[i].str}" collides with "${rects[j].str}"`,
            );
          }
        }
      }
    }

    const text = (await extractPdfText(buffer))!;
    // Fixed footer paginates every page: "1 / N" … "N / N".
    expect(text).toContain(`1 / ${doc.numPages}`);
    expect(text).toContain(`${doc.numPages} / ${doc.numPages}`);
    // Raw user text passes through without HTML-entity encoding.
    expect(text).toContain("R&D");
    expect(text).not.toContain("&amp;");
    expect(text).not.toContain("&#x27;");
  }, 30000);
});
