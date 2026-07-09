import { beforeEach, describe, expect, it, vi } from "vitest";

const { constructEventMock, updateMock, updateResult } = vi.hoisted(() => ({
  constructEventMock: vi.fn(),
  updateMock: vi.fn(),
  updateResult: { data: [{ id: "profile-1" }] as { id: string }[], error: null },
}));

vi.mock("@/lib/billing/stripe", () => ({
  BillingConfigError: class BillingConfigError extends Error {},
  getStripe: () => ({ webhooks: { constructEvent: constructEventMock } }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      update: (fields: Record<string, unknown>) => {
        updateMock(fields);
        return { eq: () => ({ select: async () => updateResult }) };
      },
    }),
  }),
}));

import { POST } from "./route";

function makeRequest(withSignature = true) {
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: withSignature ? { "stripe-signature": "sig_test" } : {},
    body: JSON.stringify({}),
  });
}

beforeEach(() => {
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  constructEventMock.mockReset();
  updateMock.mockReset();
  updateResult.data = [{ id: "profile-1" }];
});

describe("POST /api/stripe/webhook", () => {
  it("returns 400 when the signature header is missing", async () => {
    const res = await POST(makeRequest(false));
    expect(res.status).toBe(400);
  });

  it("returns 400 when signature verification fails", async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error("bad signature");
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("upgrades the profile on checkout.session.completed", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: { customer: "cus_1", mode: "subscription", subscription: "sub_1" },
      },
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith({
      plan: "pro",
      stripe_subscription_id: "sub_1",
      subscription_status: "active",
    });
  });

  it("applies the mapped plan on customer.subscription.updated", async () => {
    constructEventMock.mockReturnValue({
      type: "customer.subscription.updated",
      data: { object: { id: "sub_1", customer: "cus_1", status: "canceled" } },
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith({
      plan: "free",
      stripe_subscription_id: "sub_1",
      subscription_status: "canceled",
    });
  });

  it("keeps pro while a renewal is trialing or active", async () => {
    constructEventMock.mockReturnValue({
      type: "customer.subscription.updated",
      data: { object: { id: "sub_1", customer: "cus_1", status: "trialing" } },
    });
    await POST(makeRequest());
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ plan: "pro" }),
    );
  });

  it("downgrades on customer.subscription.deleted", async () => {
    constructEventMock.mockReturnValue({
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_1", customer: "cus_1", status: "canceled" } },
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith({
      plan: "free",
      stripe_subscription_id: null,
      subscription_status: "canceled",
    });
  });

  it("marks past_due but keeps pro on invoice.payment_failed", async () => {
    constructEventMock.mockReturnValue({
      type: "invoice.payment_failed",
      data: { object: { customer: "cus_1" } },
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith({
      plan: "pro",
      subscription_status: "past_due",
    });
  });

  it("acknowledges events for unknown customers with 200", async () => {
    updateResult.data = [];
    constructEventMock.mockReturnValue({
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_x", customer: "cus_unknown", status: "canceled" } },
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
  });

  it("ignores unrelated event types", async () => {
    constructEventMock.mockReturnValue({
      type: "payment_intent.succeeded",
      data: { object: {} },
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(updateMock).not.toHaveBeenCalled();
  });
});
