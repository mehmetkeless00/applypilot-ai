import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders the analyses empty state with an Analyze a job CTA", () => {
    const html = renderToStaticMarkup(
      <EmptyState
        title="No analyses yet"
        description="Get a fit score, skills-gap analysis, and a tailored cover letter."
        cta={{ href: "/dashboard/new", label: "Analyze a job" }}
      />,
    );
    expect(html).toContain("No analyses yet");
    expect(html).toContain('href="/dashboard/new"');
    expect(html).toContain("Analyze a job");
  });

  it("renders the resumes empty state with an Add your first resume CTA", () => {
    const html = renderToStaticMarkup(
      <EmptyState
        title="No resumes yet"
        description="Saved resumes are versioned — every edit becomes a new version you can re-score."
        cta={{ href: "#add-resume", label: "Add your first resume" }}
      />,
    );
    expect(html).toContain("No resumes yet");
    expect(html).toContain("re-score");
    expect(html).toContain('href="#add-resume"');
    expect(html).toContain("Add your first resume");
  });

  it("uses a real heading and an anchor CTA for accessibility", () => {
    const html = renderToStaticMarkup(
      <EmptyState
        title="Nothing here"
        description="Explanation."
        cta={{ href: "/x", label: "Go" }}
      />,
    );
    expect(html).toContain("<h2");
    expect(html).toContain("<a ");
    expect(html).not.toContain("onclick");
  });

  it("omits the CTA when none is given", () => {
    const html = renderToStaticMarkup(
      <EmptyState title="Nothing here" description="Explanation." />,
    );
    expect(html).not.toContain("<a ");
  });
});
