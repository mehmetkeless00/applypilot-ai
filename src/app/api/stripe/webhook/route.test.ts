import { beforeEach, describe, expect, it, vi } from "vitest";

interface RecordedUpdate {
  fields: Record<string, unknown>;
  filterCol: string;
  filterVal: string;
  orFilter?: string;
}

const { constructEventMock, retrieveMock, state } = vi.hoisted(() => ({
  constructEventMock: vi.fn(),
  retrieveMock: vi.fn(),
  state: {
    seenEvents: new Set<string>(),
    updates: [] as RecordedUpdate[],
    customerMatches: 1, // rows matched when updating by stripe_customer_id
    linkMatches: 1, // rows matched when linking by profile id
    released: [] as string[],
  },
}));

vi.mock("@/lib/billing/stripe", () => ({
  BillingConfigError: class BillingConfigError extends Error {},
  getStripe: () => ({
    webhooks: { constructEvent: constructEventMock },
    subscriptions: { retrieve: retrieveMock },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "stripe_events") {
        return {
          upsert: (row: { id: string }) => ({
            select: async () => {
              if (state.seenEvents.has(row.id)) return { data: [], error: null };
              state.seenEvents.add(row.id);
              return { data: [{ id: row.id }], error: null };
            },
          }),
          delete: () => ({
            eq: async (_col: string, id: string) => {
              state.seenEvents.delete(id);
              state.released.push(id);
              return { error: null };
            },
          }),
        };
      }
      // profiles
      return {
        update: (fields: Record<string, unknown>) => ({
          eq: (col: string, val: string) => {
            const record: RecordedUpdate = { fields, filterCol: col, filterVal: val };
            state.updates.push(record);
            return {
              or: (filter: string) => {
                record.orFilter = filter;
                return {
                  select: async () => ({
                    data:
                      state.customerMatches > 0 ? [{ id: "profile-1" }] : [],
                    error: null,
                  }),
                };
              },
              select: async () => ({
                data: state.linkMatches > 0 ? [{ id: "profile-1" }] : [],
                error: null,
              }),
            };
          },
        }),
      };
    },
  }),
}));

import { POST } from "./route";

const EVENT_CREATED = 1_752_600_000; // arbitrary fixed epoch seconds
const EVENT_CREATED_ISO = new Date(EVENT_CREATED * 1000).toISOString();

const proSubscription = {
  id: "sub_1",
  customer: "cus_1",
  status: "active",
  cancel_at_period_end: false,
  items: {
    data: [
      {
        price: { id: "price_pro" },
        current_period_start: 1_752_000_000,
        current_period_end: 1_754_600_000,
      },
    ],
  },
};

function makeEvent(type: string, object: Record<string, unknown>, id = "evt_1") {
  return { id, type, created: EVENT_CREATED, data: { object } };
}

function makeRequest(withSignature = true) {
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: withSignature ? { "stripe-signature": "sig_test" } : {},
    body: JSON.stringify({}),
  });
}

function profileUpdates(): RecordedUpdate[] {
  return state.updates.filter((u) => u.filterCol === "stripe_customer_id");
}

beforeEach(() => {
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  constructEventMock.mockReset();
  retrieveMock.mockReset();
  retrieveMock.mockResolvedValue(proSubscription);
  state.seenEvents.clear();
  state.updates.length = 0;
  state.released.length = 0;
  state.customerMatches = 1;
  state.linkMatches = 1;
});

describe("POST /api/stripe/webhook — verification", () => {
  it("returns 400 when the signature header is missing", async () => {
    expect((await POST(makeRequest(false))).status).toBe(400);
  });

  it("returns 400 and processes nothing on an invalid signature", async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error("bad signature");
    });
    expect((await POST(makeRequest())).status).toBe(400);
    expect(state.updates).toHaveLength(0);
    expect(state.seenEvents.size).toBe(0);
  });
});

describe("POST /api/stripe/webhook — checkout.session.completed", () => {
  const session = {
    customer: "cus_1",
    mode: "subscription",
    subscription: "sub_1",
    client_reference_id: "user-1",
  };

  it("derives real state from Stripe instead of assuming active", async () => {
    constructEventMock.mockReturnValue(
      makeEvent("checkout.session.completed", session),
    );
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(retrieveMock).toHaveBeenCalledWith("sub_1");
    const update = profileUpdates()[0];
    expect(update.filterVal).toBe("cus_1");
    expect(update.fields).toMatchObject({
      plan: "pro",
      subscription_status: "active",
      stripe_subscription_id: "sub_1",
      stripe_price_id: "price_pro",
      cancel_at_period_end: false,
      billing_event_at: EVENT_CREATED_ISO,
    });
    expect(update.fields.current_period_end).toBe(
      new Date(1_754_600_000 * 1000).toISOString(),
    );
    expect(update.orFilter).toContain("billing_event_at");
  });

  it("falls back to client_reference_id when the customer is unlinked", async () => {
    state.customerMatches = 0;
    constructEventMock.mockReturnValue(
      makeEvent("checkout.session.completed", session),
    );
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const link = state.updates.find((u) => u.filterCol === "id");
    expect(link?.filterVal).toBe("user-1");
    expect(link?.fields).toMatchObject({
      plan: "pro",
      stripe_customer_id: "cus_1",
    });
  });
});

describe("POST /api/stripe/webhook — subscription lifecycle", () => {
  it("applies pro on customer.subscription.created", async () => {
    constructEventMock.mockReturnValue(
      makeEvent("customer.subscription.created", proSubscription),
    );
    expect((await POST(makeRequest())).status).toBe(200);
    expect(profileUpdates()[0].fields).toMatchObject({
      plan: "pro",
      subscription_status: "active",
      stripe_price_id: "price_pro",
    });
  });

  it("stores cancel_at_period_end while keeping pro until period end", async () => {
    constructEventMock.mockReturnValue(
      makeEvent("customer.subscription.updated", {
        ...proSubscription,
        cancel_at_period_end: true,
      }),
    );
    expect((await POST(makeRequest())).status).toBe(200);
    expect(profileUpdates()[0].fields).toMatchObject({
      plan: "pro",
      subscription_status: "active",
      cancel_at_period_end: true,
    });
  });

  it("downgrades on canceled status", async () => {
    constructEventMock.mockReturnValue(
      makeEvent("customer.subscription.updated", {
        ...proSubscription,
        status: "canceled",
      }),
    );
    expect((await POST(makeRequest())).status).toBe(200);
    expect(profileUpdates()[0].fields).toMatchObject({ plan: "free" });
  });

  it("clears billing state on customer.subscription.deleted", async () => {
    constructEventMock.mockReturnValue(
      makeEvent("customer.subscription.deleted", proSubscription),
    );
    expect((await POST(makeRequest())).status).toBe(200);
    expect(profileUpdates()[0].fields).toMatchObject({
      plan: "free",
      stripe_subscription_id: null,
      subscription_status: "canceled",
      stripe_price_id: null,
      current_period_end: null,
      cancel_at_period_end: false,
    });
  });
});

describe("POST /api/stripe/webhook — invoices", () => {
  it("refreshes state from Stripe on invoice.paid", async () => {
    constructEventMock.mockReturnValue(
      makeEvent("invoice.paid", {
        customer: "cus_1",
        parent: { subscription_details: { subscription: "sub_1" } },
      }),
    );
    expect((await POST(makeRequest())).status).toBe(200);
    expect(retrieveMock).toHaveBeenCalledWith("sub_1");
    expect(profileUpdates()[0].fields).toMatchObject({
      plan: "pro",
      subscription_status: "active",
    });
  });

  it("marks past_due but keeps pro on invoice.payment_failed", async () => {
    constructEventMock.mockReturnValue(
      makeEvent("invoice.payment_failed", { customer: "cus_1" }),
    );
    expect((await POST(makeRequest())).status).toBe(200);
    expect(profileUpdates()[0].fields).toMatchObject({
      plan: "pro",
      subscription_status: "past_due",
    });
  });
});

describe("POST /api/stripe/webhook — idempotency and ordering", () => {
  it("processes an event id exactly once across retries", async () => {
    constructEventMock.mockReturnValue(
      makeEvent("customer.subscription.updated", proSubscription, "evt_same"),
    );
    expect((await POST(makeRequest())).status).toBe(200);
    expect((await POST(makeRequest())).status).toBe(200);
    expect(profileUpdates()).toHaveLength(1);
  });

  it("guards profile writes with the event timestamp (out-of-order safety)", async () => {
    constructEventMock.mockReturnValue(
      makeEvent("customer.subscription.updated", proSubscription),
    );
    await POST(makeRequest());
    const update = profileUpdates()[0];
    expect(update.orFilter).toBe(
      `billing_event_at.is.null,billing_event_at.lt.${EVENT_CREATED_ISO}`,
    );
    expect(update.fields.billing_event_at).toBe(EVENT_CREATED_ISO);
  });

  it("acknowledges stale/unmatched events with 200 so Stripe stops retrying", async () => {
    state.customerMatches = 0;
    constructEventMock.mockReturnValue(
      makeEvent("customer.subscription.updated", proSubscription),
    );
    expect((await POST(makeRequest())).status).toBe(200);
  });

  it("releases the idempotency claim when a handler fails, so the retry reprocesses", async () => {
    retrieveMock.mockRejectedValue(new Error("stripe down"));
    constructEventMock.mockReturnValue(
      makeEvent("checkout.session.completed", {
        customer: "cus_1",
        mode: "subscription",
        subscription: "sub_1",
      }, "evt_fail"),
    );
    expect((await POST(makeRequest())).status).toBe(500);
    expect(state.released).toContain("evt_fail");

    // Retry succeeds and is processed (claim was released).
    retrieveMock.mockResolvedValue(proSubscription);
    expect((await POST(makeRequest())).status).toBe(200);
    expect(profileUpdates()).toHaveLength(1);
  });

  it("ignores unrelated event types", async () => {
    constructEventMock.mockReturnValue(makeEvent("payment_intent.succeeded", {}));
    expect((await POST(makeRequest())).status).toBe(200);
    expect(state.updates).toHaveLength(0);
  });
});
