import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

import { NewAnalysisForm } from "./NewAnalysisForm";

describe("NewAnalysisForm output language", () => {
  it("offers an analysis-language selector with both languages", () => {
    const html = renderToStaticMarkup(<NewAnalysisForm />);
    expect(html).toContain('name="outputLanguage"');
    expect(html).toContain("Analysis language");
    expect(html).toContain(">English</option>");
    expect(html).toContain(">Türkçe</option>");
  });

  it("defaults the analysis language to the UI locale", () => {
    const en = renderToStaticMarkup(<NewAnalysisForm locale="en" />);
    expect(en).toMatch(/<option value="en" selected="">/);

    const tr = renderToStaticMarkup(<NewAnalysisForm locale="tr" />);
    expect(tr).toMatch(/<option value="tr" selected="">/);
    // The user can still pick the other language — both options render.
    expect(tr).toContain('value="en"');
    expect(tr).toContain("Analiz dili");
  });

  it("renders the whole form in Turkish for tr", () => {
    const html = renderToStaticMarkup(<NewAnalysisForm locale="tr" />);
    expect(html).toContain("Pozisyon");
    expect(html).toContain("İlan metni");
    expect(html).toContain("Başvuruyu analiz et");
    expect(html).not.toContain("Analyze application");
  });
});
