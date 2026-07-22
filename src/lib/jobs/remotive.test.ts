import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearRemotiveCache, normalizeRemotiveJob, searchRemotive } from "./remotive";
import { JobProviderError, type JobSearchFilters } from "./types";

const filters: JobSearchFilters = {
  query: "react",
  country: "de",
  workMode: "remote",
  experienceLevel: "any",
  employmentType: "any",
  maxDaysOld: 0,
};

beforeEach(() => clearRemotiveCache());
afterEach(() => vi.restoreAllMocks());

describe("normalizeRemotiveJob", () => {
  const raw = {
    id: 777,
    url: "https://remotive.com/remote-jobs/software-dev/react-developer-777",
    title: "React Developer",
    company_name: "Remote Co",
    job_type: "full_time",
    publication_date: "2026-07-01T08:30:00",
    candidate_required_location: "Worldwide",
    salary: "$60k – $80k",
    description: "<p>Build with <strong>React</strong>.</p><script>alert(1)</script>",
    tags: ["react", "typescript"],
  };

  it("maps provider fields and strips HTML from the description", () => {
    const listing = normalizeRemotiveJob(raw);
    expect(listing).toMatchObject({
      id: "remotive:777",
      provider: "remotive",
      title: "React Developer",
      company: "Remote Co",
      remote: true,
      remoteRestriction: "Worldwide",
      url: raw.url,
      salary: "$60k – $80k",
      employmentType: "full_time",
    });
    // External HTML never survives normalization.
    expect(listing?.description).not.toContain("<");
    expect(listing?.description).not.toContain("alert(1)");
    expect(listing?.description).toContain("Build with React");
    // Provider tags ride along as searchable text.
    expect(listing?.description).toContain("typescript");
  });

  it("never invents missing fields", () => {
    const listing = normalizeRemotiveJob({
      id: 1,
      url: "https://remotive.com/remote-jobs/x/1",
      title: "Writer",
    });
    expect(listing).toMatchObject({
      company: null,
      salary: null,
      employmentType: null,
      postedAt: null,
      remoteRestriction: null,
    });
  });

  it("drops jobs without the required identity fields", () => {
    expect(normalizeRemotiveJob({ url: "https://r.c", title: "X" })).toBeNull();
    expect(normalizeRemotiveJob({ id: 2, title: "X" })).toBeNull();
    expect(normalizeRemotiveJob({ id: 3, url: "https://r.c" })).toBeNull();
  });
});

describe("searchRemotive", () => {
  function stubJobs(jobs: unknown[]) {
    const mock = vi.fn(async () => new Response(JSON.stringify({ jobs })));
    vi.stubGlobal("fetch", mock);
    return mock;
  }

  it("applies the recency filter locally since the API has none", async () => {
    stubJobs([
      { id: 1, url: "https://remotive.com/j/1", title: "Old", publication_date: "2026-06-01T00:00:00" },
      { id: 2, url: "https://remotive.com/j/2", title: "New", publication_date: "2026-07-15T00:00:00" },
      { id: 3, url: "https://remotive.com/j/3", title: "Undated" },
    ]);
    const listings = await searchRemotive(
      { ...filters, maxDaysOld: 7 },
      new Date("2026-07-19T00:00:00Z"),
    );
    expect(listings.map((l) => l.title)).toEqual(["New"]);
  });

  it("applies the employment-type filter without dropping unlabeled jobs", async () => {
    stubJobs([
      { id: 1, url: "https://remotive.com/j/1", title: "FT", job_type: "full_time" },
      { id: 2, url: "https://remotive.com/j/2", title: "Contract", job_type: "contract" },
      { id: 3, url: "https://remotive.com/j/3", title: "Unlabeled" },
    ]);
    const listings = await searchRemotive({ ...filters, employmentType: "full_time" });
    expect(listings.map((l) => l.title)).toEqual(["FT", "Unlabeled"]);
  });

  it("memoizes responses per query to respect Remotive's rate expectations", async () => {
    const mock = stubJobs([{ id: 1, url: "https://remotive.com/j/1", title: "One" }]);
    await searchRemotive(filters);
    await searchRemotive({ ...filters, maxDaysOld: 30 });
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it("throws JobProviderError on malformed responses and timeouts", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>oops</html>")));
    await expect(searchRemotive(filters)).rejects.toBeInstanceOf(JobProviderError);
    clearRemotiveCache();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ jobs: "no" }))));
    await expect(searchRemotive(filters)).rejects.toBeInstanceOf(JobProviderError);
    clearRemotiveCache();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("timeout", "TimeoutError");
      }),
    );
    await expect(searchRemotive(filters)).rejects.toBeInstanceOf(JobProviderError);
  });
});
