import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUserMock, singleMock, usageChain } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  singleMock: vi.fn(),
  usageChain: { count: 0 },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
    from: (table: string) =>
      table === "usage_events"
        ? {
            select: () => ({
              eq: () => ({ gte: async () => ({ count: usageChain.count }) }),
            }),
            insert: () => ({ error: null }),
          }
        : {
            select: () => ({ eq: () => ({ single: singleMock }) }),
          },
  }),
}));

import { GET } from "./route";

const analysis = {
  id: "analysis-1",
  user_id: "user-123",
  job_title: "Data Engineer",
  company: "Acme",
  job_description: "d".repeat(200),
  resume_text: "r".repeat(200),
  resume_file_path: null,
  fit_score: 77,
  fit_summary: "Good match overall.",
  missing_skills: [
    { skill: "Airflow", importance: "important", suggestion: "Mention DAGs." },
  ],
  strengths: [{ strength: "SQL", evidence: "8 years of SQL." }],
  tailored_summary: "Data engineer with 8 years of experience.",
  cover_letter: "Dear team,\n\nI am **excited** to apply.",
  ats_keywords: [
    {
      keyword: "SQL",
      status: "matched",
      importance: "required",
      suggestion: "Keep SQL prominent.",
    },
  ],
  resume_suggestions: [
    {
      section: "Summary",
      original_text: "Data person.",
      improved_text: "Data engineer with 8 years of experience.",
      reason: "Specific and role-aligned.",
      impact: "high",
    },
  ],
  model: "gemini-2.5-flash",
  created_at: "2026-07-01T00:00:00Z",
};

function makeRequest(query: string) {
  return new Request(`http://localhost/api/analyses/analysis-1/export${query}`);
}

const ctx = { params: Promise.resolve({ id: "analysis-1" }) };

beforeEach(() => {
  getUserMock.mockResolvedValue({ data: { user: { id: "user-123" } } });
  singleMock.mockResolvedValue({ data: analysis, error: null });
  usageChain.count = 0;
});

describe("GET /api/analyses/[id]/export", () => {
  it("returns 401 when not authenticated", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const res = await GET(makeRequest("?format=pdf&doc=summary"), ctx);
    expect(res.status).toBe(401);
  });

  it("returns 400 for an unknown format or doc", async () => {
    expect((await GET(makeRequest("?format=rtf&doc=summary"), ctx)).status).toBe(400);
    expect((await GET(makeRequest("?format=pdf&doc=resume"), ctx)).status).toBe(400);
  });

  it("returns 400 for the full report as docx", async () => {
    const res = await GET(makeRequest("?format=docx&doc=full"), ctx);
    expect(res.status).toBe(400);
  });

  it("returns 429 when the hourly export limit is reached", async () => {
    usageChain.count = 60;
    const res = await GET(makeRequest("?format=pdf&doc=summary"), ctx);
    expect(res.status).toBe(429);
  });

  it("returns 404 when the analysis does not exist (or is not the caller's)", async () => {
    singleMock.mockResolvedValue({ data: null, error: { message: "0 rows" } });
    const res = await GET(makeRequest("?format=pdf&doc=summary"), ctx);
    expect(res.status).toBe(404);
  });

  it("exports the summary as a PDF", async () => {
    const res = await GET(makeRequest("?format=pdf&doc=summary"), ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain(
      'filename="summary-data-engineer.pdf"',
    );
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("%PDF");
  });

  it("exports the cover letter as a DOCX", async () => {
    const res = await GET(makeRequest("?format=docx&doc=cover_letter"), ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("wordprocessingml");
    expect(res.headers.get("Content-Disposition")).toContain(
      'filename="cover-letter-data-engineer.docx"',
    );
    const bytes = new Uint8Array(await res.arrayBuffer());
    // DOCX is a zip archive: PK magic bytes.
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });

  it("decodes legacy entity-encoded metadata in exports and filenames", async () => {
    singleMock.mockResolvedValue({
      data: {
        ...analysis,
        job_title: "Engineer &amp; Architect",
        company: "Labeless (Bytes &amp; Pixels GmbH)",
      },
      error: null,
    });
    const res = await GET(makeRequest("?format=pdf&doc=summary"), ctx);
    expect(res.status).toBe(200);
    // Slug comes from the decoded title — no "-amp-" artifacts.
    expect(res.headers.get("Content-Disposition")).toContain(
      'filename="summary-engineer-architect.pdf"',
    );
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("%PDF");
  });

  it("exports the full report as a PDF and defaults to it", async () => {
    const res = await GET(makeRequest(""), ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain(
      'filename="fit-report-data-engineer.pdf"',
    );
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("%PDF");
  });
});
