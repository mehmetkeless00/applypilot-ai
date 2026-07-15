import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getUserMock,
  profileChain,
  customersCreateMock,
  sessionsCreateMock,
  adminUpdates,
  billingState,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  profileChain: { profile: null as Record<string, unknown> | null },
  customersCreateMock: vi.fn(),
  sessionsCreateMock: vi.fn(),
  adminUpdates: [] as Record<string, unknown>[],
  billingState: { available: true },
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

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      update: (fields: Record<string, unknown>) => {
        adminUpdates.push(fields);
        return { eq: async () => ({ error: null }) };
      },
    }),
  }),
}));

vi.mock("@/lib/billing/stripe", () => ({
  BillingConfigError: class BillingConfigError extends Error {},
  assertBillingConfig: () => {},
  billingAvailable: () => billingState.available,
  missingBillingConfig: () =>
    billingState.available ? [] : ["STRIPE_SECRET_KEY", "STRIPE_PRO_PRICE_ID"],
  getProPriceId: () => process.env.STRIPE_PRO_PRICE_ID as string,
  getStripe: () => ({
    customers: { create: customersCreateMock },
    checkout: { sessions: { create: sessionsCreateMock } },
  }),
}));

import { POST } from "./route";

function makeRequest(body?: unknown) {
  return new Request("http://localhost/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  billingState.available = true;
  process.env.STRIPE_PRO_PRICE_ID = "price_server_configured";
  process.env.NEXT_PUBLIC_APP_URL = "https://applypilot.test";
  getUserMock.mockResolvedValue({
    data: { user: { id: "user-123", email: "u@example.com" } },
  });
  profileChain.profile = { plan: "free", stripe_customer_id: null };
  customersCreateMock.mockReset();
  customersCreateMock.mockResolvedValue({ id: "cus_new" });
  sessionsCreateMock.mockReset();
  sessionsCreateMock.mockResolvedValue({ url: "https://checkout.stripe.com/s/1" });
  adminUpdates.length = 0;
});

describe("POST /api/billing/checkout", () => {
  it("rejects unauthenticated requests", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    expect((await POST(makeRequest())).status).toBe(401);
    expect(sessionsCreateMock).not.toHaveBeenCalled();
  });

  it("refuses checkout with a neutral message when billing is not configured", async () => {
    billingState.available = false;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(makeRequest());
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe(
      "Pro subscriptions are not available yet. The Free plan remains fully usable.",
    );
    // Env var names stay in server logs, never in the response.
    expect(JSON.stringify(body)).not.toContain("STRIPE");
    expect(JSON.stringify(body)).not.toContain("configured on the server");
    expect(errorSpy.mock.calls.flat().join(" ")).toContain("STRIPE_SECRET_KEY");
    expect(sessionsCreateMock).not.toHaveBeenCalled();
    expect(customersCreateMock).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("still rejects unauthenticated requests when billing is not configured", async () => {
    billingState.available = false;
    getUserMock.mockResolvedValue({ data: { user: null } });
    expect((await POST(makeRequest())).status).toBe(401);
  });

  it("rejects users already on Pro", async () => {
    profileChain.profile = { plan: "pro", stripe_customer_id: "cus_9" };
    expect((await POST(makeRequest())).status).toBe(400);
    expect(sessionsCreateMock).not.toHaveBeenCalled();
  });

  it("creates a session with only the server-configured price, ignoring client input", async () => {
    // A hostile client sends its own price — the route must never read it.
    const res = await POST(makeRequest({ priceId: "price_evil", quantity: 99 }));
    expect(res.status).toBe(200);
    const params = sessionsCreateMock.mock.calls[0][0];
    expect(params.mode).toBe("subscription");
    expect(params.line_items).toEqual([
      { price: "price_server_configured", quantity: 1 },
    ]);
    expect(JSON.stringify(params)).not.toContain("price_evil");
  });

  it("associates the authenticated user via client_reference_id and metadata", async () => {
    await POST(makeRequest());
    const params = sessionsCreateMock.mock.calls[0][0];
    expect(params.client_reference_id).toBe("user-123");
    expect(params.metadata).toEqual({ user_id: "user-123" });
    expect(params.subscription_data).toEqual({ metadata: { user_id: "user-123" } });
    expect(params.success_url).toBe(
      "https://applypilot.test/dashboard/billing?checkout=success",
    );
    expect(params.cancel_url).toBe(
      "https://applypilot.test/dashboard/billing?checkout=canceled",
    );
  });

  it("reuses an existing Stripe customer", async () => {
    profileChain.profile = { plan: "free", stripe_customer_id: "cus_existing" };
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(customersCreateMock).not.toHaveBeenCalled();
    expect(sessionsCreateMock.mock.calls[0][0].customer).toBe("cus_existing");
  });

  it("creates and persists a customer when none exists", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(customersCreateMock).toHaveBeenCalledWith({
      email: "u@example.com",
      metadata: { user_id: "user-123" },
    });
    expect(adminUpdates[0]).toEqual({ stripe_customer_id: "cus_new" });
    expect(sessionsCreateMock.mock.calls[0][0].customer).toBe("cus_new");
    expect((await res.json()).url).toBe("https://checkout.stripe.com/s/1");
  });
});
