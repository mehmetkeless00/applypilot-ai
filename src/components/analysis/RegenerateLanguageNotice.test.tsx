import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { RegenerateLanguageNotice } from "./RegenerateLanguageNotice";

describe("RegenerateLanguageNotice", () => {
  it("explains an English analysis in Turkish and offers Turkish regeneration", () => {
    const html = renderToStaticMarkup(
      <RegenerateLanguageNotice analysisId="a1" targetLanguage="tr" locale="tr" />,
    );
    expect(html).toContain(
      "Bu analiz İngilizce oluşturuldu. Türkçe bir rapor için analizi Türkçe çıktı diliyle yeniden oluşturun.",
    );
    expect(html).toContain("Türkçe yeniden oluştur");
    expect(html).not.toContain("Regenerate in English");
  });

  it("explains a Turkish analysis in English and offers English regeneration", () => {
    const html = renderToStaticMarkup(
      <RegenerateLanguageNotice analysisId="a1" targetLanguage="en" locale="en" />,
    );
    expect(html).toContain(
      "This analysis was generated in Turkish. Re-run it with English output to create an English report.",
    );
    expect(html).toContain("Regenerate in English");
  });

  it("confirms via an accessible native dialog before running", () => {
    const html = renderToStaticMarkup(
      <RegenerateLanguageNotice analysisId="a1" targetLanguage="en" locale="en" />,
    );
    expect(html).toContain("<dialog");
    expect(html).toContain('aria-labelledby="regenerate-language-title"');
    expect(html).toContain('id="regenerate-language-title"');
    expect(html).toContain("Regenerate in English?");
    expect(html).toContain("the original analysis is kept");
    expect(html).toContain("Cancel");
    // Real buttons only — keyboard reachable, no click-handler divs.
    expect(html).not.toContain("onclick");
  });
});
