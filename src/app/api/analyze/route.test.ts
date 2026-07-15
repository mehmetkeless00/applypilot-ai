import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getUserMock,
  countChain,
  profileChain,
  versionChain,
  insertSingleMock,
  insertPayloads,
  analyzeMock,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  countChain: { count: 0 },
  profileChain: { plan: "free" },
  versionChain: { version: null as Record<string, unknown> | null },
  insertSingleMock: vi.fn(),
  insertPayloads: [] as Record<string, unknown>[],
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
              single: async () => ({
                data: { plan: profileChain.plan },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "usage_events") {
        return {
          select: () => ({
            eq: () => ({
              gte: async () => ({ count: countChain.count }),
            }),
          }),
          insert: (payload: Record<string, unknown>) => {
            insertPayloads.push(payload);
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
      return {
        select: (cols: string, opts?: { count?: string }) => {
          if (opts?.count) {
            return { gte: async () => ({ count: countChain.count }) };
          }
          return {};
        },
        insert: (payload: Record<string, unknown>) => {
          insertPayloads.push(payload);
          return {
            select: () => ({ single: insertSingleMock }),
          };
        },
      };
    },
    storage: {
      from: () => ({
        download: async () => ({
          data: new Blob([new Uint8Array([1, 2, 3])]),
          error: null,
        }),
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
import { AnalysisRefusedError } from "@/lib/ai/analyze";

const user = { id: "user-123" };

const validBody = {
  jobTitle: "Data Engineer",
  jobDescription: "d".repeat(200),
  resumeText: "r".repeat(200),
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const analysisResult = {
  result: {
    fit_score: 77,
    fit_summary: "Good match.",
    missing_skills: [],
    strengths: [],
    tailored_summary: "Summary.",
    cover_letter: "Letter.",
    ats_keywords: [],
    resume_suggestions: [],
  },
  servedBy: "gemini-2.5-flash",
};

beforeEach(() => {
  getUserMock.mockResolvedValue({ data: { user } });
  countChain.count = 0;
  profileChain.plan = "free";
  versionChain.version = null;
  insertPayloads.length = 0;
  insertSingleMock.mockResolvedValue({ data: { id: "analysis-1" }, error: null });
  analyzeMock.mockReset();
  analyzeMock.mockResolvedValue(analysisResult);
});

describe("POST /api/analyze", () => {
  it("returns 401 when not authenticated", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid body", async () => {
    const res = await POST(makeRequest({ jobTitle: "x" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  it("returns 429 when the hourly rate limit is reached", async () => {
    profileChain.plan = "pro"; // under the monthly cap, over the hourly one
    countChain.count = 10;
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(429);
  });

  it("returns 402 when a free user hits the monthly limit", async () => {
    countChain.count = 3;
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(402);
    const json = await res.json();
    expect(json.error).toContain("Upgrade to Pro");
  });

  it("returns 402 when a pro user hits the monthly limit", async () => {
    profileChain.plan = "pro";
    countChain.count = 50;
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(402);
  });

  it("allows a pro user past the free limit", async () => {
    profileChain.plan = "pro";
    countChain.count = 5;
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
  });

  it("rejects a resume file path belonging to another user", async () => {
    const res = await POST(
      makeRequest({
        ...validBody,
        resumeText: undefined,
        resumeFilePath: "someone-else/resume.pdf",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("saves the analysis and returns its id on success", async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe("analysis-1");
    expect(analyzeMock).toHaveBeenCalledOnce();
  });

  it("analyzes against a saved resume's latest version", async () => {
    versionChain.version = {
      id: "version-9",
      resume_id: "resume-1",
      version: 3,
      content: "s".repeat(200),
      file_path: null,
      source: "paste",
    };
    const res = await POST(
      makeRequest({
        ...validBody,
        resumeText: undefined,
        resumeId: "6f1c1f7e-9dcb-4f2a-8f4e-2b8a1a3d9c10",
      }),
    );
    expect(res.status).toBe(200);
    const analysisInsert = insertPayloads.find((p) => "fit_score" in p);
    expect(analysisInsert?.resume_id).toBe(
      "6f1c1f7e-9dcb-4f2a-8f4e-2b8a1a3d9c10",
    );
    expect(analysisInsert?.resume_version_id).toBe("version-9");
    expect(analyzeMock.mock.calls[0][0].resumeText).toBe("s".repeat(200));
  });

  it("returns 404 when the saved resume has no versions", async () => {
    versionChain.version = null;
    const res = await POST(
      makeRequest({
        ...validBody,
        resumeText: undefined,
        resumeId: "6f1c1f7e-9dcb-4f2a-8f4e-2b8a1a3d9c10",
      }),
    );
    expect(res.status).toBe(404);
  });

  it("drops resume suggestions that alter facts before saving", async () => {
    analyzeMock.mockResolvedValue({
      ...analysisResult,
      result: {
        ...analysisResult.result,
        resume_suggestions: [
          {
            section: "Experience",
            original_text: "July 2025: Led data platform work.",
            improved_text: "July 2025: Directed data platform work.",
            reason: "Stronger verb.",
            impact: "medium",
          },
          {
            section: "Experience",
            original_text: "July 2025: Led data platform work.",
            improved_text: "July 2024: Led data platform work (assumed corrected date).",
            reason: "Date looked off.",
            impact: "low",
          },
        ],
      },
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const insert = insertPayloads.find((p) => "fit_score" in p) as {
      resume_suggestions: Array<{ improved_text: string }>;
    };
    expect(insert.resume_suggestions).toHaveLength(1);
    expect(insert.resume_suggestions[0].improved_text).toContain("July 2025");
    expect(JSON.stringify(insert.resume_suggestions)).not.toMatch(/assumed/i);
  });

  it("maps a refusal to a 422 with a friendly message", async () => {
    analyzeMock.mockRejectedValue(new AnalysisRefusedError());
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(422);
  });

  it("returns 500 when saving fails", async () => {
    insertSingleMock.mockResolvedValue({
      data: null,
      error: { message: "boom" },
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(500);
  });
});
