import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUserMock, profileChain, portalCreateMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  profileChain: { profile: null as Record<string, unknown> | null },
  portalCreateMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: profileChain.profile, error: null }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/billing/stripe", () => ({
  BillingConfigError: class BillingConfigError extends Error {},
  getStripe: () => ({
    billingPortal: { sessions: { create: portalCreateMock } },
  }),
}));

import { POST } from "./route";

function makeRequest(body?: unknown) {
  return new Request("http://localhost/api/billing/portal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_APP_URL = "https://applypilot.test";
  getUserMock.mockResolvedValue({ data: { user: { id: "user-123" } } });
  profileChain.profile = { stripe_customer_id: "cus_own" };
  portalCreateMock.mockReset();
  portalCreateMock.mockResolvedValue({ url: "https://billing.stripe.com/p/1" });
});

describe("POST /api/billing/portal", () => {
  it("rejects unauthenticated requests", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    expect((await POST(makeRequest())).status).toBe(401);
    expect(portalCreateMock).not.toHaveBeenCalled();
  });

  it("rejects users without a billing account", async () => {
    profileChain.profile = { stripe_customer_id: null };
    expect((await POST(makeRequest())).status).toBe(400);
    expect(portalCreateMock).not.toHaveBeenCalled();
  });

  it("only ever opens the caller's own customer portal", async () => {
    // A hostile client names another customer — the route must never read it.
    const res = await POST(makeRequest({ customerId: "cus_victim" }));
    expect(res.status).toBe(200);
    const params = portalCreateMock.mock.calls[0][0];
    expect(params.customer).toBe("cus_own");
    expect(JSON.stringify(params)).not.toContain("cus_victim");
    expect(params.return_url).toBe("https://applypilot.test/dashboard/billing");
  });
});
