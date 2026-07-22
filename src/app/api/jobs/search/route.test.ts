import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JobSearchOutcome } from "@/lib/jobs/types";

const { getUserMock, versionState, usageInserts, searchJobsMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  versionState: { row: null as Record<string, unknown> | null },
  usageInserts: [] as Record<string, unknown>[],
  searchJobsMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
    from: (table: string) => {
      if (table === "usage_events") {
        return {
          insert: (payload: Record<string, unknown>) => {
            usageInserts.push(payload);
            return { error: null };
          },
        };
      }
      // resume_versions: fetchVersion chains select().eq().eq().maybeSingle()
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: versionState.row, error: null }),
            }),
          }),
        }),
      };
    },
  }),
}));

vi.mock("@/lib/jobs/search", () => ({
  searchJobs: searchJobsMock,
}));

import { POST } from "./route";
import { clearSearchRateLimits } from "@/lib/jobs/ratelimit";

const RESUME_ID = "11111111-1111-4111-8111-111111111111";
const VERSION_ID = "22222222-2222-4222-8222-222222222222";

const validBody = {
  resumeId: RESUME_ID,
  resumeVersionId: VERSION_ID,
  query: "frontend developer",
  country: "de",
  workMode: "remote",
  experienceLevel: "junior",
  employmentType: "any",
  maxDaysOld: 0,
};

const outcome: JobSearchOutcome = {
  providers: { adzuna: "ok", remotive: "ok" },
  listings: [
    {
      id: "remotive:1",
      provider: "remotive",
      title: "Junior Frontend Developer",
      company: "Remote Co",
      location: "Worldwide",
      remote: true,
      remoteRestriction: "Worldwide",
      url: "https://remotive.com/remote-jobs/dev/1",
      postedAt: "2026-07-10T00:00:00.000Z",
      salary: null,
      employmentType: "full_time",
      description: "We use React and TypeScript to build the frontend.",
    },
    {
      id: "adzuna:2",
      provider: "adzuna",
      title: "Accountant",
      company: "Numbers Ltd",
      location: "Berlin",
      remote: false,
      remoteRestriction: null,
      url: "https://www.adzuna.de/land/ad/2",
      postedAt: null,
      salary: null,
      employmentType: null,
      description: "Bookkeeping role. SAP required.",
    },
  ],
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/jobs/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  clearSearchRateLimits();
  getUserMock.mockResolvedValue({ data: { user: { id: "user-123" } } });
  versionState.row = {
    id: VERSION_ID,
    resume_id: RESUME_ID,
    version: 1,
    content: "Frontend developer. React, TypeScript, Node.js. 2 years of experience.",
  };
  usageInserts.length = 0;
  searchJobsMock.mockReset();
  searchJobsMock.mockResolvedValue(outcome);
});

describe("POST /api/jobs/search", () => {
  it("rejects unauthenticated requests", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    expect((await POST(makeRequest(validBody))).status).toBe(401);
    expect(searchJobsMock).not.toHaveBeenCalled();
  });

  it("rejects invalid filters", async () => {
    expect((await POST(makeRequest({ ...validBody, query: "x" }))).status).toBe(400);
    expect((await POST(makeRequest({ ...validBody, country: "xx" }))).status).toBe(400);
    expect((await POST(makeRequest({ ...validBody, query: "y".repeat(200) }))).status).toBe(400);
    expect(searchJobsMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the CV version isn't owned or doesn't belong to the resume", async () => {
    versionState.row = null; // RLS-scoped lookup finds nothing
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(404);
    expect(searchJobsMock).not.toHaveBeenCalled();
  });

  it("scores and sorts listings against the CV, best match first", async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.providers).toEqual({ adzuna: "ok", remotive: "ok" });
    expect(payload.listings).toHaveLength(2);
    // The React role outranks the accountant role for this CV.
    expect(payload.listings[0].id).toBe("remotive:1");
    expect(payload.listings[0].match.score).toBeGreaterThan(
      payload.listings[1].match.score,
    );
    expect(payload.listings[0].match.matchedSkills).toEqual(
      expect.arrayContaining(["React", "TypeScript"]),
    );
    // SAP is required by the second listing but absent from the CV.
    expect(payload.listings[1].match.missingRequirements).toContain("SAP");
  });

  it("consumes no analysis quota and never echoes CV content or credentials", async () => {
    process.env.ADZUNA_APP_ID = "secret-app-id";
    process.env.ADZUNA_APP_KEY = "secret-app-key";
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const raw = JSON.stringify(await res.json());
    // Free preview: nothing lands in the usage ledger.
    expect(usageInserts).toHaveLength(0);
    // The CV text stays server-side; credentials stay in env.
    expect(raw).not.toContain("2 years of experience");
    expect(raw).not.toContain("secret-app-id");
    expect(raw).not.toContain("secret-app-key");
    delete process.env.ADZUNA_APP_ID;
    delete process.env.ADZUNA_APP_KEY;
  });

  it("rate limits repeated searches per user", async () => {
    for (let i = 0; i < 30; i++) {
      expect((await POST(makeRequest(validBody))).status).toBe(200);
    }
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(429);
    expect(searchJobsMock).toHaveBeenCalledTimes(30);
  });

  // Regression safety net: previously nothing wrapped the ownership-check
  // and provider-search logic, so an unexpected exception (a Supabase
  // hiccup, a scoring edge case) would propagate as a raw, unparseable
  // 500 instead of the same clean JSON error every other failure path
  // returns — which the client would still handle, but with no safe
  // server-side log of what happened.
  it("catches an unexpected exception, logs safely, and returns a clean JSON error", async () => {
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    searchJobsMock.mockRejectedValue(new Error("provider adapter exploded"));
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(500);
    const payload = await res.json();
    expect(payload).toEqual({ error: "Search failed. Try again." });
    expect(usageInserts).toHaveLength(0);
    expect(logSpy).toHaveBeenCalled();
    const logged = logSpy.mock.calls.flat().join(" ");
    // Safe diagnostic context (user id, error) without leaking secrets.
    expect(logged).toContain("user-123");
    expect(logged).not.toContain("secret");
    logSpy.mockRestore();
  });
});
