import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JobListing, JobSearchFilters } from "./types";

const state = vi.hoisted(() => ({
  adzunaAvailable: true,
  adzuna: null as JobListing[] | Error | null,
  remotive: null as JobListing[] | Error | null,
}));

vi.mock("./adzuna", () => ({
  adzunaAvailable: () => state.adzunaAvailable,
  searchAdzuna: async () => {
    if (state.adzuna instanceof Error) throw state.adzuna;
    return state.adzuna ?? [];
  },
}));

vi.mock("./remotive", () => ({
  searchRemotive: async () => {
    if (state.remotive instanceof Error) throw state.remotive;
    return state.remotive ?? [];
  },
}));

import { dedupeListings, searchJobs } from "./search";

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
    description: "React and TypeScript role.",
    ...overrides,
  };
}

const remoteFilters: JobSearchFilters = {
  query: "react",
  country: "de",
  workMode: "remote",
  experienceLevel: "any",
  employmentType: "any",
  maxDaysOld: 0,
};

beforeEach(() => {
  state.adzunaAvailable = true;
  state.adzuna = [];
  state.remotive = [];
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("dedupeListings", () => {
  it("collapses the same title+company across providers, keeping the fuller listing", () => {
    const short = listing({ id: "adzuna:1", description: "Short snippet…", salary: "50,000" });
    const full = listing({
      id: "remotive:9",
      provider: "remotive",
      url: "https://remotive.com/remote-jobs/dev/9",
      description: "A much longer real description of the same role at Acme.",
    });
    const deduped = dedupeListings([short, full]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].id).toBe("remotive:9");
    // Fields the kept listing lacked are borrowed rather than lost.
    expect(deduped[0].salary).toBe("50,000");
  });

  it("keeps distinct jobs separate", () => {
    const a = listing({ id: "adzuna:1" });
    const b = listing({ id: "adzuna:2", title: "Backend Developer" });
    const c = listing({ id: "adzuna:3", company: "Other GmbH" });
    expect(dedupeListings([a, b, c])).toHaveLength(3);
  });
});

describe("searchJobs", () => {
  it("merges both providers for remote searches", async () => {
    state.adzuna = [listing({ id: "adzuna:1" })];
    state.remotive = [listing({ id: "remotive:2", provider: "remotive", title: "Data Analyst" })];
    const { listings, providers } = await searchJobs(remoteFilters);
    expect(listings).toHaveLength(2);
    expect(providers).toEqual({ adzuna: "ok", remotive: "ok" });
  });

  it("returns partial results when one provider fails", async () => {
    state.adzuna = new Error("adzuna down");
    state.remotive = [listing({ id: "remotive:2", provider: "remotive" })];
    const { listings, providers } = await searchJobs(remoteFilters);
    expect(listings).toHaveLength(1);
    expect(providers.adzuna).toBe("failed");
    expect(providers.remotive).toBe("ok");
  });

  it("reports both providers failed without throwing", async () => {
    state.adzuna = new Error("boom");
    state.remotive = new Error("boom");
    const { listings, providers } = await searchJobs(remoteFilters);
    expect(listings).toEqual([]);
    expect(providers).toEqual({ adzuna: "failed", remotive: "failed" });
  });

  it("marks Adzuna unavailable when credentials are missing", async () => {
    state.adzunaAvailable = false;
    state.remotive = [listing({ id: "remotive:2", provider: "remotive" })];
    const { listings, providers } = await searchJobs(remoteFilters);
    expect(providers.adzuna).toBe("unavailable");
    expect(listings).toHaveLength(1);
  });

  it("skips Remotive for onsite searches (its listings are remote-only)", async () => {
    state.adzuna = [listing({ id: "adzuna:1" })];
    state.remotive = [listing({ id: "remotive:2", provider: "remotive" })];
    const { listings, providers } = await searchJobs({
      ...remoteFilters,
      workMode: "onsite",
      city: "Berlin",
    });
    expect(providers.remotive).toBe("skipped");
    expect(listings.map((l) => l.provider)).toEqual(["adzuna"]);
  });
});
