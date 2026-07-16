import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getUserMock,
  analysisChain,
  versionChain,
  storageChain,
  insertPayloads,
  usageInserts,
  usageState,
  insertSingleMock,
  analyzeMock,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  analysisChain: { row: null as Record<string, unknown> | null },
  versionChain: { version: null as Record<string, unknown> | null },
  storageChain: { bytes: null as Buffer | null },
  insertPayloads: [] as Record<string, unknown>[],
  usageInserts: [] as Record<string, unknown>[],
  usageState: { count: 0 },
  insertSingleMock: vi.fn(),
  analyzeMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { plan: "pro" }, error: null }),
            }),
          }),
        };
      }
      if (table === "usage_events") {
        return {
          select: () => ({
            eq: () => ({ gte: async () => ({ count: usageState.count }) }),
          }),
          insert: (payload: Record<string, unknown>) => {
            usageInserts.push(payload);
            return { error: null };
          },
        };
      }
      if (table === "resume_versions") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => ({
                    data: versionChain.version,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      // analyses
      return {
        select: (cols: string, opts?: { count?: string }) => {
          if (opts?.count) {
            return { gte: async () => ({ count: 0 }) };
          }
          return {
            eq: () => ({
              single: async () => ({ data: analysisChain.row, error: null }),
            }),
          };
        },
        insert: (payload: Record<string, unknown>) => {
          insertPayloads.push(payload);
          return { select: () => ({ single: insertSingleMock }) };
        },
      };
    },
    storage: {
      from: () => ({
        download: async () =>
          storageChain.bytes
            ? { data: new Blob([new Uint8Array(storageChain.bytes)]), error: null }
            : { data: null, error: { message: "no file" } },
      }),
    },
  }),
}));

vi.mock("@/lib/ai/analyze", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/ai/analyze")>("@/lib/ai/analyze");
  return { ...actual, analyze: analyzeMock };
});

import { POST } from "./route";

const baseAnalysis = {
  id: "analysis-1",
  user_id: "user-123",
  job_title: "Data Engineer",
  company: "Acme",
  job_description: "d".repeat(200),
  resume_text: "r".repeat(200),
  resume_file_path: null,
  resume_id: null,
  resume_version_id: null,
};

const ctx = { params: Promise.resolve({ id: "analysis-1" }) };

function makeRequest() {
  return new Request("http://localhost/api/analyses/analysis-1/rescore", {
    method: "POST",
  });
}

beforeEach(() => {
  getUserMock.mockResolvedValue({ data: { user: { id: "user-123" } } });
  analysisChain.row = { ...baseAnalysis };
  versionChain.version = null;
  storageChain.bytes = null;
  usageInserts.length = 0;
  usageState.count = 0;
  insertPayloads.length = 0;
  insertSingleMock.mockResolvedValue({ data: { id: "analysis-2" }, error: null });
  analyzeMock.mockReset();
  analyzeMock.mockResolvedValue({
    result: {
      fit_score: 85,
      fit_summary: "Better.",
      missing_skills: [],
      strengths: [],
      tailored_summary: "S.",
      cover_letter: "L.",
      ats_keywords: [],
      resume_suggestions: [],
    },
    servedBy: "gemini-2.5-flash",
  });
});

describe("POST /api/analyses/[id]/rescore", () => {
  it("returns 401 when not authenticated", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    expect((await POST(makeRequest(), ctx)).status).toBe(401);
  });

  it("returns 404 when the analysis does not exist", async () => {
    analysisChain.row = null;
    expect((await POST(makeRequest(), ctx)).status).toBe(404);
  });

  it("re-runs a legacy analysis with its stored resume text", async () => {
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe("analysis-2");
    expect(analyzeMock.mock.calls[0][0].resumeText).toBe("r".repeat(200));
    const insert = insertPayloads.find((p) => "fit_score" in p);
    expect(insert?.rescored_from).toBe("analysis-1");
  });

  it("consumes monthly quota like any analysis", async () => {
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(200);
    expect(usageInserts).toEqual([{ user_id: "user-123", kind: "analysis" }]);
  });

  it("returns 402 when quota is exhausted without touching resume data", async () => {
    usageState.count = 50; // pro monthly limit
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(402);
    // No new analysis, no quota consumed, nothing deleted — a resume
    // version created just before this call stays intact.
    expect(insertPayloads).toHaveLength(0);
    expect(usageInserts).toHaveLength(0);
    expect(analyzeMock).not.toHaveBeenCalled();
  });

  it("uses the latest saved-resume version when linked", async () => {
    analysisChain.row = {
      ...baseAnalysis,
      resume_id: "resume-1",
      resume_version_id: "version-1",
    };
    versionChain.version = {
      id: "version-2",
      resume_id: "resume-1",
      version: 2,
      content: "updated resume ".repeat(20),
      file_path: null,
      source: "paste",
    };
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(200);
    expect(analyzeMock.mock.calls[0][0].resumeText).toContain("updated resume");
    const insert = insertPayloads.find((p) => "fit_score" in p);
    expect(insert?.resume_version_id).toBe("version-2");
  });

  it("returns 400 when no resume source survives", async () => {
    analysisChain.row = { ...baseAnalysis, resume_text: null };
    expect((await POST(makeRequest(), ctx)).status).toBe(400);
  });

  it("prefers a version's parsed text over its PDF", async () => {
    analysisChain.row = { ...baseAnalysis, resume_id: "resume-1" };
    versionChain.version = {
      id: "version-3",
      resume_id: "resume-1",
      version: 3,
      content: "parsed resume text ".repeat(10),
      file_path: "user-123/cv.pdf",
      source: "pdf",
    };
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(200);
    const call = analyzeMock.mock.calls[0][0];
    // Text used, PDF left untouched (a download would have failed: the
    // storage mock returns no data).
    expect(call.resumeText).toContain("parsed resume text");
    expect(call.resumePdfBase64).toBeUndefined();
  });

  it("falls back to the PDF when a version has no parsed text", async () => {
    analysisChain.row = { ...baseAnalysis, resume_id: "resume-1" };
    versionChain.version = {
      id: "version-1",
      resume_id: "resume-1",
      version: 1,
      content: null,
      file_path: "user-123/cv.pdf",
      source: "pdf",
    };
    storageChain.bytes = Buffer.from(`%PDF-1.4 fake ${"x".repeat(60)}`);
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(200);
    const call = analyzeMock.mock.calls[0][0];
    expect(call.resumePdfBase64).toBeTruthy();
    expect(call.resumeText).toBeUndefined();
  });

  it("preserves the original analysis language on re-score", async () => {
    analysisChain.row = { ...baseAnalysis, output_language: "tr" };
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(200);
    expect(analyzeMock.mock.calls[0][0].outputLanguage).toBe("tr");
    const insert = insertPayloads.find((p) => "fit_score" in p);
    expect(insert?.output_language).toBe("tr");
  });

  it("defaults legacy analyses without a language to English", async () => {
    // baseAnalysis has no output_language column value (pre-migration row).
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(200);
    expect(analyzeMock.mock.calls[0][0].outputLanguage).toBe("en");
    const insert = insertPayloads.find((p) => "fit_score" in p);
    expect(insert?.output_language).toBe("en");
  });

  it("re-persists decoded metadata when re-scoring a legacy analysis", async () => {
    analysisChain.row = {
      ...baseAnalysis,
      job_title: "Engineer &amp; Architect",
      company: "Bytes &amp; Pixels GmbH",
    };
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(200);
    const insert = insertPayloads.find((p) => "fit_score" in p);
    expect(insert?.job_title).toBe("Engineer & Architect");
    expect(insert?.company).toBe("Bytes & Pixels GmbH");
  });
});
