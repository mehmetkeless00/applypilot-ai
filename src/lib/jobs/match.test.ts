import { describe, expect, it } from "vitest";
import { detectListingSeniority, scoreListing, type MatchCvInput } from "./match";
import type { JobListing, JobSearchFilters } from "./types";

function listing(overrides: Partial<JobListing>): JobListing {
  return {
    id: "adzuna:1",
    provider: "adzuna",
    title: "Frontend Developer",
    company: "Acme",
    location: "Berlin",
    remote: false,
    remoteRestriction: null,
    url: "https://www.adzuna.de/land/ad/1",
    postedAt: null,
    salary: null,
    employmentType: null,
    description: "We build web apps with React and TypeScript.",
    ...overrides,
  };
}

const cv: MatchCvInput = {
  cvSkills: ["React", "TypeScript", "Node.js"],
  roleKeywords: "frontend developer",
};

const filters: JobSearchFilters = {
  query: "frontend developer",
  country: "de",
  workMode: "onsite",
  city: "Berlin",
  experienceLevel: "junior",
  employmentType: "any",
  maxDaysOld: 0,
};

describe("scoreListing", () => {
  it("is deterministic for identical inputs", () => {
    const a = scoreListing(cv, filters, listing({}));
    const b = scoreListing(cv, filters, listing({}));
    expect(a).toEqual(b);
  });

  it("scores skill overlap and reports matched skills", () => {
    const result = scoreListing(cv, filters, listing({}));
    expect(result.matchedSkills).toContain("React");
    expect(result.matchedSkills).toContain("TypeScript");
    const noOverlap = scoreListing(
      { ...cv, cvSkills: ["Photoshop"] },
      filters,
      listing({}),
    );
    expect(result.score).toBeGreaterThan(noOverlap.score);
  });

  it("penalizes senior roles for junior candidates below an equivalent junior role", () => {
    const junior = scoreListing(cv, filters, listing({ title: "Junior Frontend Developer" }));
    const senior = scoreListing(cv, filters, listing({ title: "Senior Frontend Developer" }));
    expect(senior.score).toBeLessThan(junior.score);
    expect(senior.reasons).toContainEqual({ kind: "seniority", fit: "above" });
    expect(junior.reasons).toContainEqual({ kind: "seniority", fit: "match" });
  });

  it("penalizes a non-remote listing for a remote search", () => {
    const remoteFilters: JobSearchFilters = { ...filters, workMode: "remote", city: undefined };
    const onsiteListing = scoreListing(cv, remoteFilters, listing({ remote: false }));
    const remoteListing = scoreListing(cv, remoteFilters, listing({ remote: true }));
    expect(onsiteListing.score).toBeLessThan(remoteListing.score);
    expect(onsiteListing.reasons).toContainEqual({ kind: "location", fit: "mismatch" });
  });

  it("recognizes Turkey as a remote-restriction country name", () => {
    const turkeyRemoteFilters: JobSearchFilters = { ...filters, workMode: "remote", country: "tr", city: undefined };
    const restricted = scoreListing(
      cv,
      turkeyRemoteFilters,
      listing({ remote: true, remoteRestriction: "USA Only" }),
    );
    const open = scoreListing(
      cv,
      turkeyRemoteFilters,
      listing({ remote: true, remoteRestriction: "Turkey" }),
    );
    expect(restricted.reasons).toContainEqual({ kind: "location", fit: "mismatch" });
    expect(open.reasons).toContainEqual({ kind: "location", fit: "match" });
  });

  it("penalizes remote listings restricted to an incompatible region", () => {
    const remoteFilters: JobSearchFilters = { ...filters, workMode: "remote", country: "de" };
    const restricted = scoreListing(
      cv,
      remoteFilters,
      listing({ remote: true, remoteRestriction: "USA Only" }),
    );
    const open = scoreListing(
      cv,
      remoteFilters,
      listing({ remote: true, remoteRestriction: "Worldwide" }),
    );
    expect(restricted.score).toBeLessThan(open.score);
    expect(restricted.reasons).toContainEqual({ kind: "location", fit: "mismatch" });
    expect(open.reasons).toContainEqual({ kind: "location", fit: "match" });
  });

  it("penalizes work-authorization restrictions", () => {
    const plain = scoreListing(cv, filters, listing({}));
    const restricted = scoreListing(
      cv,
      filters,
      listing({
        description:
          "We build web apps with React and TypeScript. US citizens only, no visa sponsorship.",
      }),
    );
    expect(restricted.score).toBeLessThan(plain.score);
    expect(restricted.reasons).toContainEqual({ kind: "authorization" });
  });

  it("penalizes mandatory requirements the CV doesn't show and lists them", () => {
    const result = scoreListing(
      cv,
      filters,
      listing({
        description:
          "We build web apps with React and TypeScript. Kubernetes experience is required. Docker is required.",
      }),
    );
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["Kubernetes", "Docker"]),
    );
    expect(result.reasons).toContainEqual({
      kind: "mandatory",
      missing: expect.arrayContaining(["Kubernetes", "Docker"]),
    });
    const withoutMandatory = scoreListing(cv, filters, listing({}));
    expect(result.score).toBeLessThan(withoutMandatory.score);
    // A required skill the CV *does* have is not flagged.
    const covered = scoreListing(
      cv,
      filters,
      listing({ description: "React is required for this role." }),
    );
    expect(covered.missingRequirements).toEqual([]);
  });

  it("rewards matching employment type and penalizes a mismatch", () => {
    const ftFilters: JobSearchFilters = { ...filters, employmentType: "full_time" };
    const match = scoreListing(cv, ftFilters, listing({ employmentType: "full_time" }));
    const mismatch = scoreListing(cv, ftFilters, listing({ employmentType: "part_time" }));
    expect(match.score).toBeGreaterThan(mismatch.score);
    expect(mismatch.reasons).toContainEqual({ kind: "employment", fit: "mismatch" });
  });

  it("clamps the score to 0–100", () => {
    const worst = scoreListing(
      { cvSkills: [], roleKeywords: "accountant" },
      { ...filters, workMode: "remote", experienceLevel: "internship" },
      listing({
        title: "Senior Staff Engineer",
        remote: false,
        description:
          "Kubernetes required. Terraform required. AWS required. US citizens only, no visa sponsorship.",
      }),
    );
    expect(worst.score).toBeGreaterThanOrEqual(0);
    expect(worst.score).toBeLessThanOrEqual(100);
  });
});

describe("detectListingSeniority", () => {
  it("recognizes seniority markers in titles (English and Turkish)", () => {
    expect(detectListingSeniority("Senior Backend Engineer")).toBe("senior");
    expect(detectListingSeniority("Kıdemli Yazılım Mühendisi")).toBe("senior");
    expect(detectListingSeniority("Junior Data Analyst")).toBe("junior");
    expect(detectListingSeniority("Software Engineering Intern")).toBe("internship");
    expect(detectListingSeniority("Frontend Developer")).toBeNull();
  });
});
