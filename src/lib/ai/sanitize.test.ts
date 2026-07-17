import { describe, expect, it } from "vitest";
import {
  containsForbiddenPhrase,
  isSuggestionSupported,
  sanitizeAnalysisResult,
  scrubNarrative,
} from "./sanitize";
import type { AnalysisResultData } from "./schema";

const RESUME = [
  "Senior Backend Engineer — Acme GmbH, Berlin",
  "July 2025 – Present: Led migration of payment services to Go.",
  "June 2025: Promoted to team lead.",
  "2023 – 2025: Built internal tooling in Python, cutting deploy time by 30%.",
  "B.Sc. Computer Science, TU Berlin, 2019.",
].join("\n");

function suggestion(original: string, improved: string) {
  return {
    section: "Experience",
    original_text: original,
    improved_text: improved,
    reason: "Stronger phrasing.",
    impact: "medium" as const,
  };
}

describe("isSuggestionSupported — dates", () => {
  it("keeps July 2025 as July 2025", () => {
    const s = suggestion(
      "July 2025 – Present: Led migration of payment services to Go.",
      "July 2025 – Present: Spearheaded the migration of payment services to Go.",
    );
    expect(isSuggestionSupported(s, RESUME)).toBe(true);
  });

  it("rejects July 2025 rewritten to July 2024", () => {
    const s = suggestion(
      "July 2025 – Present: Led migration of payment services to Go.",
      "July 2024 – Present: Led migration of payment services to Go.",
    );
    expect(isSuggestionSupported(s, RESUME)).toBe(false);
  });

  it("rejects June 2025 rewritten to May/June 2024", () => {
    const s = suggestion(
      "June 2025: Promoted to team lead.",
      "May 2024: Promoted to team lead.",
    );
    expect(isSuggestionSupported(s, RESUME)).toBe(false);
  });

  it("keeps 2023 as 2023", () => {
    const s = suggestion(
      "2023 – 2025: Built internal tooling in Python, cutting deploy time by 30%.",
      "2023 – 2025: Engineered internal Python tooling that cut deploy time by 30%.",
    );
    expect(isSuggestionSupported(s, RESUME)).toBe(true);
  });

  it("rejects a year absent from originalText and the resume", () => {
    const s = suggestion(
      "Led migration of payment services to Go.",
      "Since 2021, led migration of payment services to Go.",
    );
    expect(isSuggestionSupported(s, RESUME)).toBe(false);
  });
});

describe("isSuggestionSupported — forbidden qualifiers", () => {
  it("rejects 'Assumed corrected date' and variants", () => {
    for (const phrase of [
      "July 2024 (Assumed corrected date)",
      "July 2024 — assumed corrected dates",
      "May 2024 (corrected date)",
      "2024 (estimated date)",
    ]) {
      const s = suggestion("July 2025: Led migration.", phrase);
      expect(isSuggestionSupported(s, RESUME), phrase).toBe(false);
    }
  });
});

describe("isSuggestionSupported — invented facts", () => {
  it("rejects an unsupported company name", () => {
    const s = suggestion(
      "Led migration of payment services to Go.",
      "Led migration of payment services to Go at Google.",
    );
    expect(isSuggestionSupported(s, RESUME)).toBe(false);
  });

  it("rejects an unsupported job title", () => {
    const s = suggestion(
      "June 2025: Promoted to team lead.",
      "June 2025: Promoted to Principal Architect.",
    );
    expect(isSuggestionSupported(s, RESUME)).toBe(false);
  });

  it("rejects an unsupported location", () => {
    const s = suggestion(
      "Senior Backend Engineer — Acme GmbH, Berlin",
      "Senior Backend Engineer — Acme GmbH, Berlin and Zurich",
    );
    expect(isSuggestionSupported(s, RESUME)).toBe(false);
  });

  it("rejects an unsupported technology", () => {
    const s = suggestion(
      "Led migration of payment services to Go.",
      "Led migration of payment services to Go on Kubernetes.",
    );
    expect(isSuggestionSupported(s, RESUME)).toBe(false);
  });

  it("rejects an unsupported metric", () => {
    const s = suggestion(
      "Led migration of payment services to Go.",
      "Led migration of payment services to Go, boosting throughput by 45%.",
    );
    expect(isSuggestionSupported(s, RESUME)).toBe(false);
  });

  it("keeps metrics that the resume already contains", () => {
    const s = suggestion(
      "2023 – 2025: Built internal tooling in Python, cutting deploy time by 30%.",
      "Cut deploy time by 30% by building internal tooling in Python (2023 – 2025).",
    );
    expect(isSuggestionSupported(s, RESUME)).toBe(true);
  });

  it("keeps wording-only improvements with facts drawn from the resume", () => {
    const s = suggestion(
      "July 2025 – Present: Led migration of payment services to Go.",
      "July 2025 – Present: Led the end-to-end migration of payment services to Go at Acme GmbH, Berlin.",
    );
    expect(isSuggestionSupported(s, RESUME)).toBe(true);
  });
});

describe("scrubNarrative", () => {
  it("removes sentences with forbidden qualifiers and keeps the rest", () => {
    const text =
      "Your Go experience is a strong match. Dates were adjusted (assumed corrected dates). Emphasize the payment migration.";
    const scrubbed = scrubNarrative(text);
    expect(scrubbed).not.toMatch(/assumed corrected/i);
    expect(scrubbed).toContain("strong match");
    expect(scrubbed).toContain("payment migration");
  });

  it("leaves clean text untouched", () => {
    const text = "Strong fit for the role.\n\nEmphasize Go and Python.";
    expect(scrubNarrative(text)).toBe(text);
  });
});

describe("sanitizeAnalysisResult", () => {
  const base: AnalysisResultData = {
    fit_score: 80,
    fit_summary: "Strong match.",
    missing_skills: [],
    strengths: [],
    tailored_summary: "Backend engineer with Go experience.",
    cover_letter: "Dear team, my July 2025 promotion shows momentum.",
    ats_keywords: [],
    resume_suggestions: [],
  };

  it("drops fabricating suggestions and keeps supported ones", () => {
    const { result, droppedSuggestions } = sanitizeAnalysisResult(
      {
        ...base,
        resume_suggestions: [
          suggestion(
            "July 2025 – Present: Led migration of payment services to Go.",
            "July 2025 – Present: Spearheaded migration of payment services to Go.",
          ),
          suggestion(
            "July 2025 – Present: Led migration of payment services to Go.",
            "July 2024 – Present: Led migration (assumed corrected date).",
          ),
        ],
      },
      RESUME,
    );
    expect(droppedSuggestions).toBe(1);
    expect(result.resume_suggestions).toHaveLength(1);
    expect(result.resume_suggestions[0].improved_text).toContain("July 2025");
  });

  it("never lets 'assumed corrected date' through anywhere", () => {
    const { result } = sanitizeAnalysisResult(
      {
        ...base,
        fit_summary: "Good fit. Dates normalized (assumed corrected date).",
        cover_letter: "Dear team. I started in July 2024 (assumed corrected date). Regards.",
        tailored_summary: "Engineer. Timeline adjusted — assumed corrected dates apply.",
      },
      RESUME,
    );
    const everything = JSON.stringify(result).toLowerCase();
    expect(everything).not.toContain("assumed corrected");
    expect(containsForbiddenPhrase(everything)).toBe(false);
  });

  it("uses suggestion original_text as corpus when no resume text exists (PDF)", () => {
    const { result } = sanitizeAnalysisResult(
      {
        ...base,
        resume_suggestions: [
          suggestion(
            "June 2025: Promoted to team lead.",
            "June 2025: Promoted to team lead, expanding scope.",
          ),
        ],
      },
      undefined,
    );
    expect(result.resume_suggestions).toHaveLength(1);
  });

  it("passes legacy-shaped results through unchanged when clean", () => {
    const { result, droppedSuggestions } = sanitizeAnalysisResult(base, RESUME);
    expect(droppedSuggestions).toBe(0);
    expect(result).toEqual(base);
  });
});

describe("Turkish output support", () => {
  it("rejects Turkish date-guess qualifiers", () => {
    expect(containsForbiddenPhrase("Temmuz 2024 (varsayıldı)")).toBe(true);
    expect(containsForbiddenPhrase("tahmini tarih: 2023")).toBe(true);
    expect(containsForbiddenPhrase("Tarih düzeltildi: Temmuz 2024")).toBe(true);
    expect(containsForbiddenPhrase("Temmuz 2025'te başladı")).toBe(false);
  });

  it("accepts Turkish suggestions using proper nouns with case suffixes", () => {
    // "Google'da" is Google + Turkish locative suffix — the base name is in
    // the corpus, so this is rewording, not fabrication. The resume itself
    // is Turkish here: rewrites must stay in the resume's own language.
    const ok = isSuggestionSupported(
      suggestion(
        "Google'da arama altyapısı üzerinde çalıştı.",
        "Arama altyapısını Google'da geliştirdi ve sistemleri iyileştirdi.",
      ),
      "Google'da arama altyapısı üzerinde çalıştı. 2021'den beri görevde.",
    );
    expect(ok).toBe(true);
  });

  it("still rejects Turkish suggestions that invent facts", () => {
    const ok = isSuggestionSupported(
      suggestion(
        "Worked at Google on search infrastructure.",
        "Microsoft'ta geliri %45 artırdı.",
      ),
      "Worked at Google on search infrastructure since 2021.",
    );
    expect(ok).toBe(false);
  });
});

describe("translated improved_text guard", () => {
  // Regression: a production Turkish analysis translated an English
  // resume passage into Turkish in improved_text. Applying it would have
  // injected Turkish prose into an English resume.
  it("drops a Turkish rewrite of an English resume passage", () => {
    const ok = isSuggestionSupported(
      suggestion(
        "Developed dynamic and responsive user interfaces using Next.js, TypeScript, and Tailwind CSS.",
        "Next.js, TypeScript ve Tailwind CSS kullanarak dinamik ve duyarlı kullanıcı arayüzleri geliştirdim.",
      ),
      "Developed dynamic and responsive user interfaces using Next.js, TypeScript, and Tailwind CSS to improve user experience.",
    );
    expect(ok).toBe(false);
  });

  it("keeps Turkish rewrites when the resume itself is Turkish", () => {
    const ok = isSuggestionSupported(
      suggestion(
        "Veri işleme sistemleri geliştirdim.",
        "Ölçeklenebilir veri işleme sistemleri tasarlayıp geliştirdim.",
      ),
      "Veri işleme sistemleri geliştirdim. Python ve SQL kullandım.",
    );
    expect(ok).toBe(true);
  });

  it("tolerates a single Turkish proper noun in an English rewrite", () => {
    // One İ/ş/ğ/ı-bearing token is not evidence of translation.
    const ok = isSuggestionSupported(
      suggestion(
        "Worked in Istanbul on backend systems.",
        "Worked in İstanbul on backend systems, improving reliability.",
      ),
      "Worked in Istanbul on backend systems.",
    );
    expect(ok).toBe(true);
  });
});
