import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUserMock, state } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  state: {
    analysis: null as Record<string, unknown> | null,
    latestVersion: null as Record<string, unknown> | null,
    // Queue of results for the applied-suggestion lookup (pre-check first,
    // then the after-insert-failure recheck).
    appliedLookups: [] as (Record<string, unknown> | null)[],
    insertedVersions: [] as Record<string, unknown>[],
    insertFails: false,
    usageTouched: false,
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
    from: (table: string) => {
      if (table === "analyses") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: state.analysis, error: null }),
            }),
          }),
        };
      }
      if (table === "resume_versions") {
        return {
          select: (cols: string) => {
            if (cols === "*") {
              // fetchLatestVersion chain
              return {
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({
                        data: state.latestVersion,
                        error: null,
                      }),
                    }),
                  }),
                }),
              };
            }
            // Applied-suggestion idempotency lookup: five .eq() calls.
            const chain = {
              eq: () => chain,
              maybeSingle: async () => ({
                data: state.appliedLookups.shift() ?? null,
                error: null,
              }),
            };
            return chain;
          },
          insert: (payload: Record<string, unknown>) => {
            state.insertedVersions.push(payload);
            return {
              select: () => ({
                single: async () =>
                  state.insertFails
                    ? { data: null, error: { message: "duplicate key" } }
                    : { data: { id: "ver-new" }, error: null },
              }),
            };
          },
        };
      }
      if (table === "resumes") {
        return { update: () => ({ eq: async () => ({ error: null }) }) };
      }
      if (table === "usage_events") {
        state.usageTouched = true;
        return {
          select: () => ({ eq: () => ({ gte: async () => ({ count: 0 }) }) }),
          insert: () => ({ error: null }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  }),
}));

import { POST } from "./route";

const RESUME_TEXT = [
  "Jane Doe",
  "Experience",
  "Worked on backend services",
  "Led team meetings",
  "Education",
  "BSc Computer Science",
].join("\n");

const SUGGESTION = {
  section: "Experience",
  original_text: "Worked on backend services",
  improved_text: "Designed and maintained backend services used across the product",
  reason: "More specific about scope.",
  impact: "high",
};

const ctx = { params: Promise.resolve({ id: "analysis-1" }) };

function makeRequest(body: unknown = { suggestion: 0 }) {
  return new Request(
    "http://localhost/api/analyses/analysis-1/apply-suggestion",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

beforeEach(() => {
  getUserMock.mockResolvedValue({ data: { user: { id: "user-123" } } });
  state.analysis = {
    id: "analysis-1",
    user_id: "user-123",
    resume_id: "resume-1",
    resume_suggestions: [SUGGESTION],
  };
  state.latestVersion = {
    id: "ver-2",
    resume_id: "resume-1",
    user_id: "user-123",
    version: 2,
    content: RESUME_TEXT,
    file_path: null,
    source: "paste",
  };
  state.appliedLookups = [];
  state.insertedVersions = [];
  state.insertFails = false;
  state.usageTouched = false;
});

describe("POST /api/analyses/[id]/apply-suggestion", () => {
  it("rejects unauthenticated requests", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    expect((await POST(makeRequest(), ctx)).status).toBe(401);
    expect(state.insertedVersions).toHaveLength(0);
  });

  it("rejects invalid suggestion references", async () => {
    expect((await POST(makeRequest({}), ctx)).status).toBe(400);
    expect((await POST(makeRequest({ suggestion: "0" }), ctx)).status).toBe(400);
    expect((await POST(makeRequest({ suggestion: -1 }), ctx)).status).toBe(400);
    expect((await POST(makeRequest({ suggestion: 1.5 }), ctx)).status).toBe(400);
  });

  it("returns 404 when RLS hides the analysis (other user's data)", async () => {
    state.analysis = null;
    expect((await POST(makeRequest(), ctx)).status).toBe(404);
  });

  it("returns 404 when the analysis belongs to another user", async () => {
    state.analysis = { ...state.analysis!, user_id: "user-elsewhere" };
    expect((await POST(makeRequest(), ctx)).status).toBe(404);
    expect(state.insertedVersions).toHaveLength(0);
  });

  it("rejects a suggestion index that doesn't belong to the analysis", async () => {
    const res = await POST(makeRequest({ suggestion: 5 }), ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("doesn't belong");
  });

  it("rejects malformed suggestions", async () => {
    state.analysis = {
      ...state.analysis!,
      resume_suggestions: [{ ...SUGGESTION, improved_text: "  " }],
    };
    expect((await POST(makeRequest(), ctx)).status).toBe(422);
  });

  it("conflicts when the analysis has no linked saved resume", async () => {
    state.analysis = { ...state.analysis!, resume_id: null };
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("no_saved_resume");
  });

  it("verifies ownership of the linked resume version", async () => {
    state.latestVersion = { ...state.latestVersion!, user_id: "user-elsewhere" };
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(409);
    expect(state.insertedVersions).toHaveLength(0);
  });

  it("conflicts when the version has no editable text (PDF only)", async () => {
    state.latestVersion = {
      ...state.latestVersion!,
      content: null,
      file_path: "user-123/cv.pdf",
      source: "pdf",
    };
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("no_text");
  });

  it("replaces the original text exactly once and creates the next version", async () => {
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload).toEqual({
      versionId: "ver-new",
      version: 3,
      resumeId: "resume-1",
      alreadyApplied: false,
    });

    expect(state.insertedVersions).toHaveLength(1);
    const inserted = state.insertedVersions[0];
    expect(inserted.version).toBe(3);
    expect(inserted.source).toBe("applied_suggestion");
    expect(inserted.source_analysis_id).toBe("analysis-1");
    expect(inserted.source_suggestion).toBe(0);
    expect(inserted.previous_version_id).toBe("ver-2");
    const content = inserted.content as string;
    expect(content).toContain(SUGGESTION.improved_text);
    expect(content).not.toContain(SUGGESTION.original_text);
    // Everything else is untouched.
    expect(content).toContain("Jane Doe");
    expect(content).toContain("Led team meetings");
    expect(content).toContain("BSc Computer Science");
    // The previous version row was never modified.
    expect(state.latestVersion!.content).toBe(RESUME_TEXT);
    expect(state.latestVersion!.version).toBe(2);
  });

  it("never consumes analysis quota when creating a version", async () => {
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(200);
    expect(state.usageTouched).toBe(false);
  });

  it("conflicts when the original text no longer exists", async () => {
    state.latestVersion = {
      ...state.latestVersion!,
      content: "A completely rewritten resume without the old line.",
    };
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("text_not_found");
    expect(state.insertedVersions).toHaveLength(0);
  });

  it("conflicts instead of guessing when the text appears multiple times", async () => {
    state.latestVersion = {
      ...state.latestVersion!,
      content: `${RESUME_TEXT}\nWorked on backend services`,
    };
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("multiple_matches");
    expect(state.insertedVersions).toHaveLength(0);
  });

  it("returns the existing version on duplicate submission without inserting", async () => {
    state.appliedLookups = [{ id: "ver-3", version: 3 }];
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.alreadyApplied).toBe(true);
    expect(payload.versionId).toBe("ver-3");
    expect(state.insertedVersions).toHaveLength(0);
  });

  it("recovers when a concurrent double-click wins the insert race", async () => {
    state.insertFails = true;
    state.appliedLookups = [null, { id: "ver-3", version: 3 }];
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.alreadyApplied).toBe(true);
    expect(payload.versionId).toBe("ver-3");
  });

  it("refuses suggestions that fail the factual-integrity guard", async () => {
    state.analysis = {
      ...state.analysis!,
      resume_suggestions: [
        {
          ...SUGGESTION,
          improved_text:
            "Increased revenue by 45% working on backend services at Google",
        },
      ],
    };
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(422);
    expect((await res.json()).error).toContain("factual-accuracy");
    expect(state.insertedVersions).toHaveLength(0);
  });
});
