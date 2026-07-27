import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { JobSearchPanel } from "./JobSearchPanel";
import type { JobSearchResponse } from "@/lib/jobs/types";

// Regression coverage for the "Search jobs" state machine: every phase
// renders something distinct, the initial hint can never coexist with
// any other phase's content, and a malformed/empty/failed response each
// gets its own clear, localized treatment — never a silent no-op.

const listing = {
  id: "remotive:1",
  provider: "remotive" as const,
  title: "React Developer",
  company: "Remote Co",
  location: "Worldwide",
  remote: true,
  remoteRestriction: null,
  url: "https://remotive.com/remote-jobs/dev/react-developer-1",
  postedAt: null,
  salary: null,
  employmentType: null,
  description: "Build with React.",
  match: {
    score: 80,
    matchedSkills: ["React"],
    missingRequirements: [],
    reasons: [{ kind: "title" as const, matched: ["react"], total: 1 }],
  },
};

const okProviders = { adzuna: "ok" as const, remotive: "ok" as const };

function render(props: Partial<Parameters<typeof JobSearchPanel>[0]> = {}) {
  return renderToStaticMarkup(
    <JobSearchPanel
      phase="initial"
      results={null}
      formError={null}
      onRetry={vi.fn()}
      onAnalyze={vi.fn()}
      {...props}
    />,
  );
}

describe("JobSearchPanel phase rendering", () => {
  it("shows the initial hint only in the initial phase", () => {
    const html = render({ phase: "initial" });
    expect(html).toContain("Pick a CV, adjust the filters");
  });

  it("clears the initial hint the moment the phase leaves initial (loading)", () => {
    const html = render({ phase: "loading" });
    expect(html).not.toContain("Pick a CV, adjust the filters");
    // Skeleton placeholders, not text — but they must be present.
    expect(html).toContain("animate-pulse");
  });

  it("renders real results on success", () => {
    const results: JobSearchResponse = { listings: [listing], providers: okProviders };
    const html = render({ phase: "loaded", results });
    expect(html).not.toContain("Pick a CV, adjust the filters");
    expect(html).toContain("1 job found");
    expect(html).toContain("React Developer");
    expect(html).toContain("Analyze this job");
  });

  it("renders the localized zero-results state when providers succeed with no listings", () => {
    const results: JobSearchResponse = { listings: [], providers: okProviders };
    const html = render({ phase: "loaded", results });
    expect(html).not.toContain("Pick a CV, adjust the filters");
    expect(html).toContain("No jobs found");
    expect(html).toContain("Try broader keywords");
  });

  it("renders the localized error state on API/provider failure, with a retry action", () => {
    const html = render({ phase: "failed", formError: "Search failed. Try again." });
    expect(html).not.toContain("Pick a CV, adjust the filters");
    expect(html).toContain('role="alert"');
    expect(html).toContain("Search failed. Try again.");
    expect(html).toContain("Try again");
  });

  it("falls back to a generic failure message when none is provided (malformed-response safety net)", () => {
    const html = render({ phase: "failed", formError: null });
    expect(html).toContain('role="alert"');
    expect(html).toContain("Job sources couldn&#x27;t be reached");
  });

  it("shows the not-configured message when no provider is active, without naming a provider", () => {
    const results: JobSearchResponse = {
      listings: [],
      providers: { adzuna: "unavailable", remotive: "skipped" },
    };
    const html = render({ phase: "loaded", results });
    expect(html).toContain("On-site search isn&#x27;t available for the selected country right now");
    expect(html).not.toContain("Adzuna");
    // No misleading "no results" copy alongside the unavailable notice.
    expect(html).not.toContain("No jobs found");
  });

  it("shows the same not-configured message for a Turkey on-site search (no provider covers it)", () => {
    const results: JobSearchResponse = {
      listings: [],
      providers: { adzuna: "skipped", remotive: "skipped" },
    };
    const html = render({ phase: "loaded", results });
    expect(html).toContain("On-site search isn&#x27;t available for the selected country right now");
  });

  it("shows a partial-failure notice when only one provider failed", () => {
    const results: JobSearchResponse = {
      listings: [listing],
      providers: { adzuna: "failed", remotive: "ok" },
    };
    const html = render({ phase: "loaded", results });
    expect(html).toContain("Some job sources couldn&#x27;t be reached");
    expect(html).toContain("React Developer");
  });

  it("renders in Turkish", () => {
    const html = render({ phase: "initial", locale: "tr" });
    expect(html).toContain("Bir CV seçin, filtreleri ayarlayın");
  });
});
