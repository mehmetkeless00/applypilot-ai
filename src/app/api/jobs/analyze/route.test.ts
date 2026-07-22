import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getUserMock,
  versionState,
  usageState,
  usageInserts,
  insertPayloads,
  insertSingleMock,
  analyzeMock,
  importJobMock,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  versionState: { row: null as Record<string, unknown> | null },
  usageState: { count: 0 },
  usageInserts: [] as Record<string, unknown>[],
  insertPayloads: [] as Record<string, unknown>[],
  insertSingleMock: vi.fn(),
  analyzeMock: vi.fn(),
  importJobMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { plan: "free" }, error: null }),
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
        // fetchVersion chains select().eq().eq().maybeSingle().
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: versionState.row, error: null }),
              }),
            }),
          }),
        };
      }
      // analyses
      return {
        insert: (payload: Record<string, unknown>) => {
          insertPayloads.push(payload);
          return { select: () => ({ single: insertSingleMock }) };
        },
      };
    },
  }),
}));

vi.mock("@/lib/ai/analyze", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/ai/analyze")>("@/lib/ai/analyze");
  return { ...actual, analyze: analyzeMock };
});

vi.mock("@/lib/jobimport/providers", async () => {
  const actual = await vi.importActual<typeof import("@/lib/jobimport/providers")>(
    "@/lib/jobimport/providers",
  );
  return { ...actual, importJobFromUrl: importJobMock };
});

import { POST } from "./route";

const RESUME_ID = "11111111-1111-4111-8111-111111111111";
const VERSION_ID = "22222222-2222-4222-8222-222222222222";

const adzunaListing = {
  provider: "adzuna",
  url: "https://www.adzuna.de/land/ad/42",
  title: "Junior Frontend Developer",
  company: "Acme GmbH",
  description:
    "Snippet: build UIs with React and TypeScript in a cross-functional product team shipping weekly…",
};

const remotiveListing = {
  provider: "remotive",
  url: "https://remotive.com/remote-jobs/dev/react-dev-9",
  title: "React Developer",
  description:
    "Full description of a fully remote React role with TypeScript, automated testing, and CI/CD pipelines.",
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/jobs/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    resumeId: RESUME_ID,
    resumeVersionId: VERSION_ID,
    listing: adzunaListing,
    outputLanguage: "en",
    ...overrides,
  };
}

beforeEach(() => {
  getUserMock.mockResolvedValue({ data: { user: { id: "user-123" } } });
  versionState.row = {
    id: VERSION_ID,
    resume_id: RESUME_ID,
    version: 3,
    content: "Frontend developer resume with React and TypeScript. ".repeat(5),
    file_path: null,
    source: "paste",
  };
  usageState.count = 0;
  usageInserts.length = 0;
  insertPayloads.length = 0;
  insertSingleMock.mockResolvedValue({ data: { id: "analysis-9" }, error: null });
  analyzeMock.mockReset();
  analyzeMock.mockResolvedValue({
    result: {
      fit_score: 70,
      fit_summary: "Good.",
      missing_skills: [],
      strengths: [],
      tailored_summary: "S.",
      cover_letter: "L.",
      ats_keywords: [],
      resume_suggestions: [],
    },
    servedBy: "gemini-2.5-flash",
  });
  importJobMock.mockReset();
  importJobMock.mockRejectedValue(new Error("no enrichment"));
});

describe("POST /api/jobs/analyze", () => {
  it("rejects unauthenticated requests", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    expect((await POST(makeRequest(validBody()))).status).toBe(401);
    expect(analyzeMock).not.toHaveBeenCalled();
  });

  it("rejects listing URLs that don't belong to the claimed provider", async () => {
    const res = await POST(
      makeRequest(
        validBody({ listing: { ...adzunaListing, url: "https://adzuna.evil.com/x" } }),
      ),
    );
    expect(res.status).toBe(400);
    expect(analyzeMock).not.toHaveBeenCalled();
    expect(usageInserts).toHaveLength(0);
  });

  it("returns 404 when the CV version isn't owned by the user", async () => {
    versionState.row = null;
    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(404);
    expect(analyzeMock).not.toHaveBeenCalled();
    expect(usageInserts).toHaveLength(0);
  });

  it("runs the full pipeline with the selected CV version and exactly one quota event", async () => {
    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe("analysis-9");
    // The pinned version's text — not some other version — feeds the AI.
    expect(analyzeMock.mock.calls[0][0].resumeText).toContain(
      "Frontend developer resume",
    );
    const insert = insertPayloads[0];
    expect(insert.resume_id).toBe(RESUME_ID);
    expect(insert.resume_version_id).toBe(VERSION_ID);
    expect(insert.job_title).toBe("Junior Frontend Developer");
    expect(insert.company).toBe("Acme GmbH");
    expect(insert.output_language).toBe("en");
    // Exactly one analysis event — searching was free, analyzing costs one.
    expect(usageInserts).toEqual([{ user_id: "user-123", kind: "analysis" }]);
  });

  it("preserves the provider and original listing URL in the stored job description", async () => {
    await POST(makeRequest(validBody()));
    const description = insertPayloads[0].job_description as string;
    expect(description).toContain("Source: Adzuna — https://www.adzuna.de/land/ad/42");
    // Turkish output stores the Turkish source line.
    insertPayloads.length = 0;
    await POST(makeRequest(validBody({ outputLanguage: "tr" })));
    expect(insertPayloads[0].job_description as string).toContain(
      "Kaynak: Adzuna — https://www.adzuna.de/land/ad/42",
    );
    expect(insertPayloads[0].output_language).toBe("tr");
  });

  it("enriches Adzuna snippets via the hardened importer when possible", async () => {
    const fullDescription =
      "Full imported description with every responsibility and requirement listed. ".repeat(4);
    importJobMock.mockResolvedValue({
      jobTitle: "Junior Frontend Developer",
      jobDescription: fullDescription,
    });
    await POST(makeRequest(validBody()));
    expect(importJobMock).toHaveBeenCalledWith(adzunaListing.url);
    expect(analyzeMock.mock.calls[0][0].jobDescription).toContain(
      "Full imported description",
    );
  });

  it("falls back to the snippet when enrichment fails, and skips it for Remotive", async () => {
    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(200);
    expect(analyzeMock.mock.calls[0][0].jobDescription).toContain("Snippet: build UIs");

    analyzeMock.mockClear();
    importJobMock.mockClear();
    await POST(makeRequest(validBody({ listing: remotiveListing })));
    expect(importJobMock).not.toHaveBeenCalled();
    expect(analyzeMock.mock.calls[0][0].jobDescription).toContain(
      "Source: Remotive — https://remotive.com/remote-jobs/dev/react-dev-9",
    );
  });

  it("returns 402 with zero side effects when the monthly quota is spent", async () => {
    usageState.count = 3; // free plan monthly limit
    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(402);
    expect(analyzeMock).not.toHaveBeenCalled();
    expect(insertPayloads).toHaveLength(0);
    expect(usageInserts).toHaveLength(0);
  });
});
