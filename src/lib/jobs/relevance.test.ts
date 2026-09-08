import { describe, expect, it } from "vitest";
import {
  computeRelevance,
  DEFAULT_MIN_RELEVANCE,
  isEmploymentTypeCompatible,
  isRemoteLocationCompatible,
  isSeniorityCompatible,
  rankListings,
} from "./relevance";
import type { JobListing, JobSearchFilters } from "./types";

// Regression coverage for two real reported problems:
// 1. Searching Italy + Remote returned Brazil/Uruguay/Americas-restricted
//    listings — location scoring only ever penalized incompatibility, it
//    never excluded it, and unmapped country names (Uruguay isn't an
//    Adzuna-supported search country) fell through to a neutral default.
// 2. Searching "Developer" returned Customer Operations / Writing
//    Specialist / unrelated roles — an uninformative listing (no stated
//    skills) got half-credit on the biggest scoring component (skills,
//    45/100) for free, so a totally unrelated posting still cleared a
//    respectable floor score with nothing to hard-filter it out.

function listing(overrides: Partial<JobListing>): JobListing {
  return {
    id: "remotive:1",
    provider: "remotive",
    title: "Backend Developer",
    company: "Acme",
    location: "Worldwide",
    remote: true,
    remoteRestriction: "Worldwide",
    url: "https://remotive.com/remote-jobs/dev/1",
    postedAt: null,
    salary: null,
    employmentType: null,
    description: "Build APIs with Node.js and TypeScript.",
    ...overrides,
  };
}

const italyRemote: JobSearchFilters = {
  query: "developer",
  country: "it",
  workMode: "remote",
  experienceLevel: "any",
  employmentType: "any",
  maxDaysOld: 0,
};

describe("computeRelevance", () => {
  it("scores a matching title highly", () => {
    expect(computeRelevance("developer", listing({ title: "Backend Developer" }))).toBeGreaterThanOrEqual(40);
  });

  it("recognizes engineer/programmer as developer-role synonyms", () => {
    expect(computeRelevance("developer", listing({ title: "Software Engineer" }))).toBeGreaterThanOrEqual(40);
    expect(computeRelevance("engineer", listing({ title: "Backend Developer" }))).toBeGreaterThanOrEqual(40);
  });

  it("scores unrelated roles at zero, not a neutral default", () => {
    expect(
      computeRelevance(
        "developer",
        listing({ title: "Customer Operations Specialist", description: "Support customers via email and chat." }),
      ),
    ).toBe(0);
    expect(
      computeRelevance("developer", listing({ title: "Writing Specialist", description: "Write blog content." })),
    ).toBe(0);
  });

  it("does not treat 'Business Development' as a developer-role match (real production false positive)", () => {
    // Confirmed via a live Remotive search: this listing scored 85/100 and
    // ranked #1 for a "developer" query, because the synonym map used to
    // expand "developer" to the bare noun "development" — a word that's
    // common in non-tech titles too. Only the agent-noun forms (developer/
    // engineer/programmer) should cross-match, not the gerund/noun forms.
    expect(
      computeRelevance(
        "developer",
        listing({
          title: "Business Development Representative",
          description: "Drive outbound sales and grow our client portfolio.",
        }),
      ),
    ).toBe(0);
    expect(
      computeRelevance(
        "engineer",
        listing({
          title: "Sales Engineering Manager",
          description: "Own the sales engineering process for enterprise deals.",
        }),
      ),
    ).toBe(0);
  });

  it("doesn't credit 'Business Developer' sales titles as software-developer matches (real production false positive)", () => {
    // Confirmed via a live Adzuna search: a "Business Developer" sales
    // role at an AI SaaS company ranked #1 for "AI developer" (relevance
    // 55) — its title's literal word "developer" and its description's
    // unrelated "AI-powered website builder" company blurb combined to
    // clear the threshold. "Developer" is a standard non-tech job title
    // in sales/real estate/property contexts, distinct from a software
    // developer.
    const businessDeveloper = listing({
      title: "Business Developer - Italy Restaurants & Hotels (Remote)",
      description:
        "CentralApp is a SaaS startup revolutionising websites for SMEs. Today we're entering a new chapter: a pivot toward an AI-powered website builder. As a Business Developer, you'll sell effectively using cutting-edge tools.",
    });
    expect(computeRelevance("AI developer", businessDeveloper)).toBeLessThan(DEFAULT_MIN_RELEVANCE);
    expect(computeRelevance("developer", businessDeveloper)).toBe(0);
  });

  it("gives a relevance boost for shared recognized technologies independent of title wording", () => {
    const withTech = computeRelevance(
      "Node.js developer",
      listing({ title: "Backend Engineer", description: "We use Node.js and PostgreSQL." }),
    );
    const withoutTech = computeRelevance(
      "Node.js developer",
      listing({ title: "Backend Engineer", description: "We use Python and Django." }),
    );
    expect(withTech).toBeGreaterThan(withoutTech);
  });
});

describe("isRemoteLocationCompatible", () => {
  it("keeps worldwide/unrestricted remote listings", () => {
    expect(isRemoteLocationCompatible(italyRemote, listing({ remoteRestriction: "Worldwide" }))).toBe(true);
    expect(isRemoteLocationCompatible(italyRemote, listing({ remoteRestriction: null }))).toBe(true);
  });

  it("keeps listings restricted to the searched country or a region containing it", () => {
    expect(isRemoteLocationCompatible(italyRemote, listing({ remoteRestriction: "Italy only" }))).toBe(true);
    expect(isRemoteLocationCompatible(italyRemote, listing({ remoteRestriction: "Europe" }))).toBe(true);
    expect(isRemoteLocationCompatible(italyRemote, listing({ remoteRestriction: "Americas, Europe, Israel" }))).toBe(true);
  });

  it("excludes listings restricted to a clearly incompatible region or country", () => {
    expect(isRemoteLocationCompatible(italyRemote, listing({ remoteRestriction: "Americas" }))).toBe(false);
    expect(isRemoteLocationCompatible(italyRemote, listing({ remoteRestriction: "Brazil" }))).toBe(false);
    expect(isRemoteLocationCompatible(italyRemote, listing({ remoteRestriction: "Uruguay" }))).toBe(false);
    expect(isRemoteLocationCompatible(italyRemote, listing({ remoteRestriction: "Canada" }))).toBe(false);
  });

  it("keeps unrecognized restriction text (benefit of the doubt)", () => {
    expect(isRemoteLocationCompatible(italyRemote, listing({ remoteRestriction: "Northern hemisphere only" }))).toBe(true);
  });

  it("excludes a listing not itself flagged remote when searching remote", () => {
    expect(isRemoteLocationCompatible(italyRemote, listing({ remote: false }))).toBe(false);
  });

  it("never filters on-site searches (already scoped by the provider query)", () => {
    const onsite: JobSearchFilters = { ...italyRemote, workMode: "onsite", city: "Milan" };
    expect(isRemoteLocationCompatible(onsite, listing({ remote: false, remoteRestriction: "Brazil" }))).toBe(true);
  });
});

describe("isEmploymentTypeCompatible", () => {
  it("excludes only on a stated conflict", () => {
    const filters: JobSearchFilters = { ...italyRemote, employmentType: "full_time" };
    expect(isEmploymentTypeCompatible(filters, listing({ employmentType: "part_time" }))).toBe(false);
    expect(isEmploymentTypeCompatible(filters, listing({ employmentType: "full_time" }))).toBe(true);
    expect(isEmploymentTypeCompatible(filters, listing({ employmentType: null }))).toBe(true);
  });
});

describe("isSeniorityCompatible", () => {
  it("excludes a senior-only listing for a junior-tier search", () => {
    const filters: JobSearchFilters = { ...italyRemote, experienceLevel: "junior" };
    expect(isSeniorityCompatible(filters, listing({ title: "Senior Backend Developer" }))).toBe(false);
    expect(isSeniorityCompatible(filters, listing({ title: "Junior Backend Developer" }))).toBe(true);
    expect(isSeniorityCompatible(filters, listing({ title: "Backend Developer" }))).toBe(true);
  });
});

describe("rankListings", () => {
  const cv = { cvSkills: ["React", "TypeScript", "Node.js"], roleKeywords: "developer" };

  it("filters out geographically incompatible remote listings (Italy + Remote)", () => {
    const listings = [
      listing({ id: "a", title: "Backend Developer", location: "Italy", remoteRestriction: "Italy" }),
      listing({ id: "b", title: "Backend Developer", location: "Brazil", remoteRestriction: "Brazil" }),
      listing({ id: "c", title: "Backend Developer", location: "Uruguay", remoteRestriction: "Uruguay" }),
      listing({ id: "d", title: "Backend Developer", location: "Worldwide", remoteRestriction: "Worldwide" }),
      listing({ id: "e", title: "Backend Developer", location: "Americas", remoteRestriction: "Americas" }),
    ];
    const result = rankListings(listings, italyRemote, cv);
    expect(result.map((l) => l.id).sort()).toEqual(["a", "d"]);
  });

  it("filters out roles irrelevant to the query, even when the CV would score them non-zero", () => {
    const listings = [
      listing({ id: "dev", title: "Backend Developer", description: "Node.js and TypeScript role." }),
      listing({
        id: "ops",
        title: "Customer Operations",
        description: "Handle support tickets and escalations.",
      }),
      listing({
        id: "writer",
        title: "Writing Specialist",
        description: "Produce marketing copy for our blog.",
      }),
      listing({
        id: "consulting",
        title: "AI Consulting Analyst",
        description: "Advise clients on AI strategy roadmaps.",
      }),
    ];
    const result = rankListings(listings, { ...italyRemote, query: "developer" }, cv);
    expect(result.map((l) => l.id)).toEqual(["dev"]);
  });

  it("sorts by relevance, then match score, then posting recency", () => {
    const listings = [
      listing({
        id: "older-tied",
        title: "Software Engineer",
        description: "Generic engineering role.",
        postedAt: "2026-01-01T00:00:00.000Z",
      }),
      listing({
        id: "newer-tied",
        title: "Software Engineer",
        description: "Generic engineering role.",
        postedAt: "2026-06-01T00:00:00.000Z",
      }),
    ];
    const result = rankListings(listings, { ...italyRemote, query: "engineer" }, cv);
    // Same relevance, same match score (identical text) -> recency breaks the tie.
    expect(result.map((l) => l.id)).toEqual(["newer-tied", "older-tied"]);
  });

  it("respects a configurable minimum relevance threshold", () => {
    const listings = [listing({ id: "partial", title: "Backend Team Assistant", description: "General office support." })];
    const lenient = rankListings(listings, { ...italyRemote, query: "developer" }, cv, 0);
    const strict = rankListings(listings, { ...italyRemote, query: "developer" }, cv, DEFAULT_MIN_RELEVANCE);
    expect(lenient).toHaveLength(1);
    expect(strict).toHaveLength(0);
  });
});
