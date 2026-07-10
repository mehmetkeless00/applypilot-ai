import { afterEach, describe, expect, it, vi } from "vitest";
import { importJobFromUrl, JobImportError, parseJobUrl } from "./providers";

describe("parseJobUrl", () => {
  it("parses Greenhouse board URLs", () => {
    expect(
      parseJobUrl("https://boards.greenhouse.io/acme/jobs/4141234"),
    ).toEqual({ provider: "greenhouse", board: "acme", jobId: "4141234" });
    expect(
      parseJobUrl("https://job-boards.greenhouse.io/acme/jobs/4141234?gh_src=x"),
    ).toEqual({ provider: "greenhouse", board: "acme", jobId: "4141234" });
  });

  it("parses Lever URLs", () => {
    expect(
      parseJobUrl("https://jobs.lever.co/acme/1234-abcd-5678"),
    ).toEqual({ provider: "lever", company: "acme", jobId: "1234-abcd-5678" });
  });

  it("parses Ashby URLs", () => {
    expect(parseJobUrl("https://jobs.ashbyhq.com/acme/uuid-123")).toEqual({
      provider: "ashby",
      org: "acme",
      jobId: "uuid-123",
    });
  });

  it("parses Workable URLs", () => {
    expect(
      parseJobUrl("https://apply.workable.com/acme/j/ABC123/"),
    ).toEqual({ provider: "workable", account: "acme", shortcode: "ABC123" });
  });

  it("rejects LinkedIn with a dedicated kind", () => {
    try {
      parseJobUrl("https://www.linkedin.com/jobs/view/123456");
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(JobImportError);
      expect((err as JobImportError).kind).toBe("linkedin");
    }
  });

  it("rejects invalid URLs and non-http protocols", () => {
    expect(() => parseJobUrl("not a url")).toThrowError(JobImportError);
    try {
      parseJobUrl("ftp://boards.greenhouse.io/acme/jobs/1");
      expect.unreachable();
    } catch (err) {
      expect((err as JobImportError).kind).toBe("invalid_url");
    }
  });

  it("routes unknown hosts to the generic pipeline without fetching", () => {
    expect(parseJobUrl("https://careers.example.com/jobs/1")).toEqual({
      provider: "generic",
      url: "https://careers.example.com/jobs/1",
    });
  });

  it("routes supported hosts with unrecognized paths to the generic pipeline", () => {
    expect(parseJobUrl("https://boards.greenhouse.io/acme")).toEqual({
      provider: "generic",
      url: "https://boards.greenhouse.io/acme",
    });
  });
});

describe("importJobFromUrl (adapters, mocked fetch)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubFetch(response: Partial<Response> & { jsonBody?: unknown; textBody?: string }) {
    const mock = vi.fn().mockResolvedValue({
      ok: response.ok ?? true,
      status: response.status ?? 200,
      json: async () => response.jsonBody,
      text: async () => response.textBody ?? "",
    });
    vi.stubGlobal("fetch", mock);
    return mock;
  }

  it("imports a Greenhouse posting via the boards API", async () => {
    const fetchMock = stubFetch({
      jsonBody: {
        title: "Platform Engineer",
        company_name: "Acme",
        location: { name: "Remote — EU" },
        content: `&lt;p&gt;${"We build platforms. ".repeat(10)}&lt;/p&gt;`,
      },
    });

    const job = await importJobFromUrl("https://boards.greenhouse.io/acme/jobs/99");
    expect(fetchMock.mock.calls[0][0]).toContain(
      "boards-api.greenhouse.io/v1/boards/acme/jobs/99",
    );
    expect(job.jobTitle).toBe("Platform Engineer");
    expect(job.company).toBe("Acme");
    expect(job.location).toBe("Remote — EU");
    expect(job.jobDescription).toContain("We build platforms.");
    // Entity-encoded tags must be decoded THEN stripped, not left as literals.
    expect(job.jobDescription).not.toContain("<p>");
  });

  it("imports a Lever posting including list sections", async () => {
    stubFetch({
      jsonBody: {
        text: "Backend Engineer",
        categories: { location: "NYC" },
        descriptionPlain: "Join our backend team building high-scale systems every day.",
        lists: [
          { text: "Requirements", content: "<li>5 years Go</li><li>Postgres</li>" },
        ],
      },
    });

    const job = await importJobFromUrl("https://jobs.lever.co/acme/uuid-1");
    expect(job.jobTitle).toBe("Backend Engineer");
    expect(job.jobDescription).toContain("Join our backend team");
    expect(job.jobDescription).toContain("Requirements");
    expect(job.jobDescription).toContain("• 5 years Go");
  });

  it("finds the matching Ashby job in the board feed", async () => {
    stubFetch({
      jsonBody: {
        jobs: [
          { id: "other", title: "Nope", descriptionHtml: "<p>x</p>" },
          {
            id: "uuid-42",
            title: "ML Engineer",
            location: "SF",
            descriptionHtml: `<p>${"Train models at scale. ".repeat(5)}</p>`,
          },
        ],
      },
    });

    const job = await importJobFromUrl("https://jobs.ashbyhq.com/acme/uuid-42");
    expect(job.jobTitle).toBe("ML Engineer");
    expect(job.location).toBe("SF");
  });

  it("maps a 404 to a not_found import error", async () => {
    stubFetch({ ok: false, status: 404 });
    try {
      await importJobFromUrl("https://boards.greenhouse.io/acme/jobs/1");
      expect.unreachable();
    } catch (err) {
      expect((err as JobImportError).kind).toBe("not_found");
    }
  });

  it("maps network failures to fetch_failed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNRESET")));
    try {
      await importJobFromUrl("https://jobs.lever.co/acme/uuid-1");
      expect.unreachable();
    } catch (err) {
      expect((err as JobImportError).kind).toBe("fetch_failed");
    }
  });

  it("rejects postings with unusably short descriptions", async () => {
    stubFetch({
      jsonBody: { title: "Ghost Role", content: "<p>tiny</p>" },
    });
    try {
      await importJobFromUrl("https://boards.greenhouse.io/acme/jobs/2");
      expect.unreachable();
    } catch (err) {
      expect((err as JobImportError).kind).toBe("not_found");
    }
  });
});
