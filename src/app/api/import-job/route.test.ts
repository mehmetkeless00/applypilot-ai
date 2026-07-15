import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUserMock, usageChain, usageInserts, importMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  usageChain: { count: 0 },
  usageInserts: [] as Record<string, unknown>[],
  importMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
    from: () => ({
      select: () => ({
        eq: () => ({ gte: async () => ({ count: usageChain.count }) }),
      }),
      insert: (payload: Record<string, unknown>) => {
        usageInserts.push(payload);
        return { error: null };
      },
    }),
  }),
}));

vi.mock("@/lib/jobimport/providers", async () => {
  const actual = await vi.importActual<typeof import("@/lib/jobimport/providers")>(
    "@/lib/jobimport/providers",
  );
  return { ...actual, importJobFromUrl: importMock };
});

import { POST } from "./route";
import { JobImportError } from "@/lib/jobimport/errors";

function makeRequest(url = "https://careers.example.com/jobs/1") {
  return new Request("http://localhost/api/import-job", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
}

beforeEach(() => {
  getUserMock.mockResolvedValue({ data: { user: { id: "user-123" } } });
  usageChain.count = 0;
  usageInserts.length = 0;
  importMock.mockReset();
  importMock.mockResolvedValue({
    jobTitle: "Engineer",
    company: "Acme",
    jobDescription: "d".repeat(120),
  });
});

describe("POST /api/import-job", () => {
  it("returns 401 when not authenticated", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    expect((await POST(makeRequest())).status).toBe(401);
  });

  it("imports and records the attempt in the usage ledger", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect((await res.json()).jobTitle).toBe("Engineer");
    expect(usageInserts).toEqual([{ user_id: "user-123", kind: "import" }]);
  });

  it("returns 429 when the hourly import limit is reached", async () => {
    usageChain.count = 20;
    const res = await POST(makeRequest());
    expect(res.status).toBe(429);
    expect(importMock).not.toHaveBeenCalled();
  });

  it("records the attempt even when the import fails", async () => {
    importMock.mockRejectedValue(
      new JobImportError("blocked page", "blocked"),
    );
    const res = await POST(makeRequest());
    expect(res.status).toBe(422);
    expect(usageInserts).toHaveLength(1);
  });
});
