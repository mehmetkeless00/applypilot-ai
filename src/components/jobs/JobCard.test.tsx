import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { JobCard } from "./JobCard";
import type { ScoredJobListing } from "@/lib/jobs/types";

const listing: ScoredJobListing = {
  id: "remotive:1",
  provider: "remotive",
  title: "React Developer",
  company: "Remote Co",
  location: "Worldwide",
  remote: true,
  remoteRestriction: "Worldwide",
  url: "https://remotive.com/remote-jobs/dev/react-developer-1",
  postedAt: "2026-07-10T00:00:00.000Z",
  salary: "$60k – $80k",
  employmentType: "full_time",
  description: "Build with React and TypeScript.",
  match: {
    score: 78,
    matchedSkills: ["React", "TypeScript"],
    missingRequirements: ["Kubernetes"],
    reasons: [
      { kind: "title", matched: ["react"], total: 2 },
      { kind: "skills", matched: ["React", "TypeScript"], total: 3 },
      { kind: "seniority", fit: "unknown" },
      { kind: "location", fit: "match" },
      { kind: "employment", fit: "unknown" },
      { kind: "mandatory", missing: ["Kubernetes"] },
    ],
  },
};

describe("JobCard", () => {
  it("shows every real listing field with source attribution and the original link", () => {
    const html = renderToStaticMarkup(
      <JobCard listing={listing} locale="en" onAnalyze={vi.fn()} />,
    );
    expect(html).toContain("React Developer");
    expect(html).toContain("Remote Co");
    expect(html).toContain("Worldwide");
    expect(html).toContain("Remote");
    expect(html).toContain("Full-time");
    expect(html).toContain("Salary: $60k – $80k");
    expect(html).toContain("Posted Jul 10, 2026");
    expect(html).toContain("Source: Remotive");
    expect(html).toContain(
      'href="https://remotive.com/remote-jobs/dev/react-developer-1"',
    );
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });

  it("labels the deterministic score as an estimate with an explanation and disclaimer", () => {
    const html = renderToStaticMarkup(
      <JobCard listing={listing} locale="en" onAnalyze={vi.fn()} />,
    );
    expect(html).toContain("Estimated match");
    expect(html).toContain('aria-label="Estimated match: 78 out of 100"');
    expect(html).toContain("<details");
    expect(html).toContain("How this estimate was calculated");
    expect(html).toContain("2 of 3 technologies named in the listing appear in your CV");
    expect(html).toContain("Marked as required but not found in your CV: Kubernetes");
    expect(html).toContain(
      "doesn&#x27;t guarantee eligibility, interviews, or offers",
    );
    expect(html).toContain("Analyze this job");
  });

  it("renders naturally in Turkish, keeping company names and technologies untranslated", () => {
    const html = renderToStaticMarkup(
      <JobCard listing={listing} locale="tr" onAnalyze={vi.fn()} />,
    );
    expect(html).toContain("Tahmini uyum");
    expect(html).toContain("Kaynak: Remotive");
    expect(html).toContain("Bu ilanı analiz et");
    expect(html).toContain("Eşleşen beceriler");
    expect(html).toContain("uygunluk, mülakat veya iş garantisi vermez");
    // Facts are never translated.
    expect(html).toContain("React Developer");
    expect(html).toContain("Remote Co");
    expect(html).toContain("TypeScript");
  });

  it("omits absent fields instead of inventing them", () => {
    const sparse: ScoredJobListing = {
      ...listing,
      company: null,
      location: null,
      salary: null,
      employmentType: null,
      postedAt: null,
      remote: false,
    };
    const html = renderToStaticMarkup(
      <JobCard listing={sparse} locale="en" onAnalyze={vi.fn()} />,
    );
    expect(html).not.toContain("Salary:");
    expect(html).not.toContain("Posted ");
    expect(html).not.toContain("Full-time");
  });

  it("escapes hostile listing content instead of rendering it as HTML", () => {
    const hostile: ScoredJobListing = {
      ...listing,
      title: '<script>alert("xss")</script>',
      company: "<img src=x onerror=alert(1)>",
    };
    const html = renderToStaticMarkup(
      <JobCard listing={hostile} locale="en" onAnalyze={vi.fn()} />,
    );
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;");
  });
});
