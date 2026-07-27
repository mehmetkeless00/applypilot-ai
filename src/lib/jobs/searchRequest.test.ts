import { describe, expect, it, vi } from "vitest";
import {
  isTurkeyOnsiteBlocked,
  recoverSearchParams,
  runJobSearch,
  type JobSearchRequestBody,
} from "./searchRequest";

// Regression: the Find jobs page could silently stay on its initial state
// when clicked — no loading, no results, no error. Root cause: none of
// the filter controls had a `name` attribute and the form relied solely
// on onSubmit; if the browser ever falls back to a native submission
// (JS not yet hydrated), it does a GET-to-self carrying no data at all,
// and the remounted page looks exactly like nothing happened. These
// tests cover the two halves of the fix: the request/response classifier
// that guarantees the UI phase always leaves "loading" (runJobSearch),
// and the recovery parser that completes a native-fallback submission
// instead of discarding it (recoverSearchParams).

const body: JobSearchRequestBody = {
  resumeId: "resume-1",
  resumeVersionId: "version-1",
  query: "frontend developer",
  country: "gb",
  workMode: "remote",
  experienceLevel: "junior",
  employmentType: "any",
  maxDaysOld: 0,
};

const FALLBACK = "Search failed. Try again.";

function jsonResponse(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), { status });
}

describe("runJobSearch", () => {
  it("invokes POST /api/jobs/search with the exact filter body", async () => {
    const fetchImpl = vi.fn(async (_url: string, _init: RequestInit) =>
      jsonResponse(200, { listings: [], providers: {} }),
    );
    await runJobSearch(body, FALLBACK, fetchImpl as unknown as typeof fetch);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("/api/jobs/search");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body as string)).toEqual(body);
  });

  it("passes through a successful response, including zero results", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, { listings: [], providers: { adzuna: "ok", remotive: "ok" } }),
    );
    const result = await runJobSearch(body, FALLBACK, fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({
      status: "ok",
      data: { listings: [], providers: { adzuna: "ok", remotive: "ok" } },
    });
  });

  it("passes through real listings on success", async () => {
    const listings = [{ id: "adzuna:1", title: "Frontend Developer" }];
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, { listings, providers: { adzuna: "ok", remotive: "skipped" } }),
    );
    const result = await runJobSearch(body, FALLBACK, fetchImpl as unknown as typeof fetch);
    expect(result.status).toBe("ok");
    expect(result.status === "ok" && result.data.listings).toEqual(listings);
  });

  it("classifies a non-2xx status as an error using the server's message", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(429, { error: "Search limit reached." }));
    const result = await runJobSearch(body, FALLBACK, fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ status: "error", message: "Search limit reached." });
  });

  it("falls back to the generic message when an error response has no body", async () => {
    const fetchImpl = vi.fn(async () => new Response("Internal Server Error", { status: 500 }));
    const result = await runJobSearch(body, FALLBACK, fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ status: "error", message: FALLBACK });
  });

  it("never throws on a malformed (non-JSON) response — renders safely instead", async () => {
    const fetchImpl = vi.fn(async () => new Response("<html>not json</html>", { status: 200 }));
    await expect(
      runJobSearch(body, FALLBACK, fetchImpl as unknown as typeof fetch),
    ).resolves.toEqual({ status: "error", message: FALLBACK });
  });

  it("never throws on a 200 with an unexpected shape (missing listings/providers)", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { ok: true }));
    const result = await runJobSearch(body, FALLBACK, fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ status: "error", message: FALLBACK });
  });

  it("never throws when the network request itself rejects (offline, DNS failure)", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(
      runJobSearch(body, FALLBACK, fetchImpl as unknown as typeof fetch),
    ).resolves.toEqual({ status: "error", message: FALLBACK });
  });

  it("never throws when the request times out — the phase can always leave loading", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new DOMException("The operation was aborted.", "AbortError");
    });
    await expect(
      runJobSearch(body, FALLBACK, fetchImpl as unknown as typeof fetch),
    ).resolves.toEqual({ status: "error", message: FALLBACK });
  });

  it("sends no analysis-quota header or field — the request is search-only", async () => {
    const fetchImpl = vi.fn(async (_url: string, _init: RequestInit) =>
      jsonResponse(200, { listings: [], providers: {} }),
    );
    await runJobSearch(body, FALLBACK, fetchImpl as unknown as typeof fetch);
    const [, init] = fetchImpl.mock.calls[0]!;
    const sentBody = JSON.parse(init.body as string);
    expect(sentBody).not.toHaveProperty("quota");
    expect(sentBody).not.toHaveProperty("consumeQuota");
  });
});

describe("recoverSearchParams", () => {
  function paramsFrom(overrides: Record<string, string> = {}) {
    return new URLSearchParams({
      resumeId: "resume-1",
      resumeVersionId: "version-1",
      query: "frontend developer",
      country: "gb",
      workMode: "remote",
      experienceLevel: "junior",
      employmentType: "any",
      maxDaysOld: "0",
      ...overrides,
    });
  }

  it("recovers a full native-form-submission query string", () => {
    expect(recoverSearchParams(paramsFrom())).toEqual({
      resumeId: "resume-1",
      resumeVersionId: "version-1",
      query: "frontend developer",
      country: "gb",
      workMode: "remote",
      city: undefined,
      experienceLevel: "junior",
      employmentType: "any",
      maxDaysOld: 0,
    });
  });

  it("includes city only for on-site submissions", () => {
    const params = paramsFrom({ workMode: "onsite", city: "Berlin" });
    expect(recoverSearchParams(params)?.city).toBe("Berlin");
    // A city value carried over for a remote submission is ignored.
    const remoteWithCity = paramsFrom({ city: "Berlin" });
    expect(recoverSearchParams(remoteWithCity)?.city).toBeUndefined();
  });

  it("returns null when the query string is empty (a normal page load, not a fallback submission)", () => {
    expect(recoverSearchParams(new URLSearchParams())).toBeNull();
  });

  it("returns null when a required field is missing", () => {
    for (const key of ["resumeId", "resumeVersionId", "query", "country", "workMode"]) {
      const params = paramsFrom();
      params.delete(key);
      expect(recoverSearchParams(params)).toBeNull();
    }
  });

  it("accepts Turkey alongside the Adzuna countries", () => {
    const params = paramsFrom({ country: "tr", workMode: "onsite", city: "Istanbul" });
    expect(recoverSearchParams(params)).toMatchObject({ country: "tr", city: "Istanbul" });
  });

  it("returns null for invalid enum or out-of-range values instead of guessing", () => {
    expect(recoverSearchParams(paramsFrom({ country: "zz" }))).toBeNull();
    expect(recoverSearchParams(paramsFrom({ workMode: "hybrid" }))).toBeNull();
    expect(recoverSearchParams(paramsFrom({ experienceLevel: "expert" }))).toBeNull();
    expect(recoverSearchParams(paramsFrom({ employmentType: "gig" }))).toBeNull();
    expect(recoverSearchParams(paramsFrom({ maxDaysOld: "999" }))).toBeNull();
  });

  it("returns null for a too-short query, matching the client-side minimum", () => {
    expect(recoverSearchParams(paramsFrom({ query: "x" }))).toBeNull();
  });
});

describe("isTurkeyOnsiteBlocked", () => {
  it("blocks Turkey on-site — the only combination with no working provider", () => {
    expect(isTurkeyOnsiteBlocked("tr", "onsite")).toBe(true);
  });

  it("allows Turkey remote (Remotive covers it)", () => {
    expect(isTurkeyOnsiteBlocked("tr", "remote")).toBe(false);
  });

  it("never blocks any other country, on-site or remote", () => {
    expect(isTurkeyOnsiteBlocked("gb", "onsite")).toBe(false);
    expect(isTurkeyOnsiteBlocked("gb", "remote")).toBe(false);
    expect(isTurkeyOnsiteBlocked("de", "onsite")).toBe(false);
  });
});
