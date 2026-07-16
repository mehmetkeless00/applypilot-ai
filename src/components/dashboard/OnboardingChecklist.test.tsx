import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  OnboardingChecklist,
  onboardingSteps,
  shouldShowOnboarding,
} from "./OnboardingChecklist";

describe("shouldShowOnboarding", () => {
  it("shows onboarding only while the user has no analyses", () => {
    expect(shouldShowOnboarding(0)).toBe(true);
  });

  it("hides onboarding once the first analysis exists", () => {
    expect(shouldShowOnboarding(1)).toBe(false);
    expect(shouldShowOnboarding(12)).toBe(false);
  });
});

describe("onboardingSteps", () => {
  it("marks the resume step complete once a resume is saved", () => {
    expect(onboardingSteps(false).map((s) => s.done)).toEqual([
      false,
      false,
      false,
    ]);
    expect(onboardingSteps(true).map((s) => s.done)).toEqual([
      true,
      false,
      false,
    ]);
  });
});

describe("OnboardingChecklist", () => {
  it("guides a brand-new user through all three steps", () => {
    const html = renderToStaticMarkup(<OnboardingChecklist hasResume={false} />);
    expect(html).toContain("Add your resume");
    expect(html).toContain("Add a job");
    expect(html).toContain("Review your fit report");
    // First incomplete step's CTA goes to the resume library.
    expect(html).toContain('href="/dashboard/resumes"');
    // The analyze CTA is always reachable.
    expect(html).toContain('href="/dashboard/new"');
    expect(html).toContain("Analyze a job");
    expect(html).not.toContain("(completed)");
  });

  it("shows the resume step as completed for a user with a saved resume", () => {
    const html = renderToStaticMarkup(<OnboardingChecklist hasResume={true} />);
    expect(html).toContain("(completed)");
    expect(html).toContain("✓");
    // A completed step no longer advertises its CTA.
    expect(html).not.toContain('href="/dashboard/resumes"');
    expect(html).toContain('href="/dashboard/new"');
  });

  it("renders fully in Turkish when the locale is tr", () => {
    const html = renderToStaticMarkup(
      <OnboardingChecklist hasResume={false} locale="tr" />,
    );
    expect(html).toContain("İlk uyum raporunuzu alın");
    expect(html).toContain("CV&#x27;nizi ekleyin");
    expect(html).toContain("İlan analiz et");
    expect(html).not.toContain("Add your resume");
  });

  it("uses accessible landmark, heading, and list semantics", () => {
    const html = renderToStaticMarkup(<OnboardingChecklist hasResume={false} />);
    expect(html).toContain('aria-labelledby="onboarding-title"');
    expect(html).toContain('id="onboarding-title"');
    expect(html).toContain("<h2");
    expect(html).toContain("<h3");
    expect(html).toContain("<ol");
    // CTAs are real links (keyboard focusable), not click-handler divs.
    expect(html).toContain("<a ");
    expect(html).not.toContain("onclick");
  });
});
