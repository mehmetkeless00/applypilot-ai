import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  adzunaAvailable,
  adzunaSalary,
  buildAdzunaUrl,
  normalizeAdzunaResult,
  searchAdzuna,
} from "./adzuna";
import { JobProviderError, type JobSearchFilters } from "./types";

const filters: JobSearchFilters = {
  query: "frontend developer",
  country: "gb",
  workMode: "onsite",
  city: "London",
  experienceLevel: "junior",
  employmentType: "full_time",
  maxDaysOld: 7,
};

const savedEnv = { ...process.env };

beforeEach(() => {
  process.env.ADZUNA_APP_ID = "test-app-id";
  process.env.ADZUNA_APP_KEY = "test-app-key";
});

afterEach(() => {
  process.env = { ...savedEnv };
  vi.restoreAllMocks();
});

describe("adzunaAvailable", () => {
  it("requires both server-side credentials", () => {
    expect(adzunaAvailable()).toBe(true);
    delete process.env.ADZUNA_APP_KEY;
    expect(adzunaAvailable()).toBe(false);
    delete process.env.ADZUNA_APP_ID;
    expect(adzunaAvailable()).toBe(false);
  });
});

describe("buildAdzunaUrl", () => {
  it("builds the documented search URL with filters", () => {
    const url = new URL(buildAdzunaUrl(filters));
    expect(url.origin + url.pathname).toBe(
      "https://api.adzuna.com/v1/api/jobs/gb/search/1",
    );
    expect(url.searchParams.get("app_id")).toBe("test-app-id");
    expect(url.searchParams.get("app_key")).toBe("test-app-key");
    expect(url.searchParams.get("what")).toBe("frontend developer");
    expect(url.searchParams.get("where")).toBe("London");
    expect(url.searchParams.get("max_days_old")).toBe("7");
    expect(url.searchParams.get("full_time")).toBe("1");
    expect(url.searchParams.get("part_time")).toBeNull();
  });

  it("omits unset filters and uses the remote keyword for remote mode", () => {
    const url = new URL(
      buildAdzunaUrl({
        ...filters,
        workMode: "remote",
        employmentType: "any",
        maxDaysOld: 0,
      }),
    );
    expect(url.searchParams.get("where")).toBe("remote");
    expect(url.searchParams.get("max_days_old")).toBeNull();
    expect(url.searchParams.get("full_time")).toBeNull();
  });
});

describe("normalizeAdzunaResult", () => {
  const raw = {
    id: 4321,
    title: "Junior Frontend Developer",
    description: "Build UIs with React &amp; TypeScript.",
    company: { display_name: "Acme Ltd" },
    location: { display_name: "London, UK" },
    created: "2026-07-10T09:00:00Z",
    redirect_url: "https://www.adzuna.co.uk/land/ad/4321",
    salary_min: 40000,
    salary_max: 50000,
    salary_is_predicted: "0",
    contract_time: "full_time",
  };

  it("maps provider fields onto the internal listing", () => {
    const listing = normalizeAdzunaResult(raw);
    expect(listing).toMatchObject({
      id: "adzuna:4321",
      provider: "adzuna",
      title: "Junior Frontend Developer",
      company: "Acme Ltd",
      location: "London, UK",
      url: "https://www.adzuna.co.uk/land/ad/4321",
      postedAt: "2026-07-10T09:00:00Z",
      salary: "40,000 – 50,000",
      employmentType: "full_time",
      remote: false,
    });
    // Entities are decoded, tags stripped — description is plain text.
    expect(listing?.description).toBe("Build UIs with React & TypeScript.");
  });

  it("never invents missing fields", () => {
    const listing = normalizeAdzunaResult({
      id: 1,
      title: "Backend Engineer",
      redirect_url: "https://www.adzuna.de/land/ad/1",
    });
    expect(listing).toMatchObject({
      company: null,
      location: null,
      salary: null,
      employmentType: null,
      postedAt: null,
      description: "",
    });
  });

  it("suppresses Adzuna-predicted salaries instead of presenting them as real", () => {
    expect(adzunaSalary({ ...raw, salary_is_predicted: "1" })).toBeNull();
    expect(adzunaSalary({ ...raw, salary_min: undefined, salary_max: undefined })).toBeNull();
    expect(adzunaSalary({ ...raw, salary_max: undefined })).toBe("40,000");
  });

  it("drops results without a title, id, or original URL", () => {
    expect(normalizeAdzunaResult({ title: "X", redirect_url: "https://a.b" })).toBeNull();
    expect(normalizeAdzunaResult({ id: 2, redirect_url: "https://a.b" })).toBeNull();
    expect(normalizeAdzunaResult({ id: 3, title: "X" })).toBeNull();
  });
});

describe("searchAdzuna", () => {
  it("normalizes a successful response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ results: [{ id: 9, title: "Data Analyst", redirect_url: "https://www.adzuna.co.uk/land/ad/9" }] })),
      ),
    );
    const listings = await searchAdzuna(filters);
    expect(listings).toHaveLength(1);
    expect(listings[0].id).toBe("adzuna:9");
  });

  it("throws JobProviderError on malformed JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not json")));
    await expect(searchAdzuna(filters)).rejects.toBeInstanceOf(JobProviderError);
  });

  it("throws JobProviderError when the results array is missing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ nope: true }))));
    await expect(searchAdzuna(filters)).rejects.toBeInstanceOf(JobProviderError);
  });

  it("throws JobProviderError on HTTP errors and network failures", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("denied", { status: 401 })));
    await expect(searchAdzuna(filters)).rejects.toBeInstanceOf(JobProviderError);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("timeout", "TimeoutError");
      }),
    );
    await expect(searchAdzuna(filters)).rejects.toBeInstanceOf(JobProviderError);
  });
});
