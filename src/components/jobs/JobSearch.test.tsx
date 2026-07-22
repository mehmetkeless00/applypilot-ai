import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { JobSearch, type ResumeOption } from "./JobSearch";

const resumes: ResumeOption[] = [
  {
    id: "resume-1",
    title: "Backend Engineer CV",
    versions: [
      {
        id: "version-2",
        version: 2,
        label: "v2 — Jul 10, 2026",
        terms: {
          titles: ["Backend Developer", "Software Engineer"],
          skills: ["Python", "Django", "PostgreSQL"],
          level: "mid",
        },
      },
      {
        id: "version-1",
        version: 1,
        label: "v1 — Jun 1, 2026",
        terms: { titles: [], skills: [], level: null },
      },
    ],
  },
];

describe("JobSearch filters", () => {
  it("renders accessible, labelled filters with CV-derived suggestions (English)", () => {
    const html = renderToStaticMarkup(<JobSearch resumes={resumes} locale="en" />);
    // Every filter is a real labelled control inside a fieldset.
    expect(html).toContain("<fieldset");
    expect(html).toContain("Search filters");
    expect(html).toContain("Role keywords");
    expect(html).toContain("Country");
    expect(html).toContain("Work location");
    expect(html).toContain("Experience level");
    expect(html).toContain("Employment type");
    expect(html).toContain("Posted within");
    // CV and version selectors with the version label.
    expect(html).toContain("Backend Engineer CV");
    expect(html).toContain("v2 — Jul 10, 2026");
    // Suggestions come from the CV and are editable chips (real buttons).
    expect(html).toContain("Titles found in your CV");
    expect(html).toContain("Backend Developer");
    expect(html).toContain("Technologies found in your CV");
    expect(html).toContain("Django");
    expect(html).toContain("Suggestions come only from your CV&#x27;s own text.");
    // The keywords field is prefilled from the CV's first suggested title.
    expect(html).toContain('value="Backend Developer"');
    // CV-derived level preselects mid.
    expect(html).toMatch(/<option value="mid" selected="">/);
    // Initial state hint before any search.
    expect(html).toContain("Pick a CV, adjust the filters");
    expect(html).toContain("Search jobs");
  });

  // Regression: the form previously had no `name` attributes and relied
  // solely on onSubmit. If the browser ever falls back to a native
  // submission (JS not yet hydrated), an unnamed form submits nothing at
  // all — a GET-to-self that silently drops every filter the user chose
  // and remounts the page back to its pristine initial state. Naming
  // every field turns that fallback into a recoverable submission
  // (see searchRequest.test.ts for the recovery-parsing side).
  it("names every filter field so a native form fallback carries real data, not silence", () => {
    const html = renderToStaticMarkup(<JobSearch resumes={resumes} locale="en" />);
    expect(html).toContain('name="resumeId"');
    expect(html).toContain('name="resumeVersionId"');
    expect(html).toContain('name="query"');
    expect(html).toContain('name="country"');
    expect(html).toContain('name="workMode"');
    expect(html).toContain('name="experienceLevel"');
    expect(html).toContain('name="employmentType"');
    expect(html).toContain('name="maxDaysOld"');
  });

  it("gives the search form an explicit GET method so a fallback submission lands as query params", () => {
    const html = renderToStaticMarkup(<JobSearch resumes={resumes} locale="en" />);
    expect(html).toMatch(/<form[^>]*method="get"/);
  });

  it("renders the full Turkish experience", () => {
    const html = renderToStaticMarkup(<JobSearch resumes={resumes} locale="tr" />);
    expect(html).toContain("Arama filtreleri");
    expect(html).toContain("Rol anahtar kelimeleri");
    expect(html).toContain("Ülke");
    expect(html).toContain("Çalışma şekli");
    expect(html).toContain("Deneyim seviyesi");
    expect(html).toContain("Yayınlanma süresi");
    expect(html).toContain("İş ara");
    expect(html).toContain("CV&#x27;nizde geçen unvanlar");
    expect(html).toContain("Almanya");
    // Suggested terms are user facts and stay untranslated.
    expect(html).toContain("Backend Developer");
    expect(html).toContain("PostgreSQL");
    expect(html).not.toContain("Search jobs");
  });

  it("mounts the analyze-confirmation dialog with accessible semantics", () => {
    const html = renderToStaticMarkup(<JobSearch resumes={resumes} locale="en" />);
    expect(html).toContain("<dialog");
    expect(html).toContain('aria-labelledby="analyze-job-title"');
    expect(html).toContain('id="analyze-job-title"');
    expect(html).toContain("Analyze this job?");
    expect(html).toContain("uses one analysis from your monthly quota");
    expect(html).toContain("Analysis language");
    expect(html).toContain("Cancel");
  });

  it("confirms quota use in Turkish before analyzing", () => {
    const html = renderToStaticMarkup(<JobSearch resumes={resumes} locale="tr" />);
    expect(html).toContain("Bu ilan analiz edilsin mi?");
    expect(html).toContain("Aylık kotanızdan bir analiz kullanılır.");
    expect(html).toContain("Analizi başlat");
    expect(html).toContain("Vazgeç");
  });
});
