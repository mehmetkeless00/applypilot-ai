import { afterEach, describe, expect, it } from "vitest";
import { normalizePlan, PLANS, planFromSubscriptionStatus } from "./plans";
import { billingAvailable, missingBillingConfig } from "./stripe";
import { monthStartUtc } from "./usage";

describe("planFromSubscriptionStatus", () => {
  it("maps active and trialing to pro", () => {
    expect(planFromSubscriptionStatus("active")).toBe("pro");
    expect(planFromSubscriptionStatus("trialing")).toBe("pro");
  });

  it("keeps pro during the past_due grace period", () => {
    expect(planFromSubscriptionStatus("past_due")).toBe("pro");
  });

  it("maps terminal and unknown statuses to free", () => {
    expect(planFromSubscriptionStatus("canceled")).toBe("free");
    expect(planFromSubscriptionStatus("unpaid")).toBe("free");
    expect(planFromSubscriptionStatus("incomplete")).toBe("free");
    expect(planFromSubscriptionStatus("incomplete_expired")).toBe("free");
    expect(planFromSubscriptionStatus("paused")).toBe("free");
    expect(planFromSubscriptionStatus(null)).toBe("free");
  });
});

describe("missingBillingConfig", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("names unset or placeholder variables without leaking values", () => {
    delete process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_your-webhook-secret";
    process.env.STRIPE_PRO_PRICE_ID = "price_real";
    process.env.NEXT_PUBLIC_APP_URL = "https://applypilot.test";
    const missing = missingBillingConfig();
    expect(missing).toEqual(["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]);
  });

  it("returns empty when everything is configured", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_1";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_1";
    process.env.STRIPE_PRO_PRICE_ID = "price_1";
    process.env.NEXT_PUBLIC_APP_URL = "https://applypilot.test";
    expect(missingBillingConfig()).toEqual([]);
  });
});

describe("billingAvailable", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("is false while any billing variable is unset", () => {
    delete process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_1";
    process.env.STRIPE_PRO_PRICE_ID = "price_1";
    process.env.NEXT_PUBLIC_APP_URL = "https://applypilot.test";
    expect(billingAvailable()).toBe(false);
  });

  it("flips to true automatically once all variables are set", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_1";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_1";
    process.env.STRIPE_PRO_PRICE_ID = "price_1";
    process.env.NEXT_PUBLIC_APP_URL = "https://applypilot.test";
    expect(billingAvailable()).toBe(true);
  });
});

describe("normalizePlan", () => {
  it("defaults anything but pro to free", () => {
    expect(normalizePlan("pro")).toBe("pro");
    expect(normalizePlan("free")).toBe("free");
    expect(normalizePlan(undefined)).toBe("free");
    expect(normalizePlan("enterprise")).toBe("free");
  });
});

describe("plan limits", () => {
  it("free allows 3 and pro allows 50 analyses per month", () => {
    expect(PLANS.free.analysesPerMonth).toBe(3);
    expect(PLANS.pro.analysesPerMonth).toBe(50);
  });

  it("exposes display pricing and features for both plans", () => {
    expect(PLANS.free.priceMonthly).toBe(0);
    expect(PLANS.pro.priceMonthly).toBeGreaterThan(0);
    expect(PLANS.free.features.length).toBeGreaterThan(0);
    expect(PLANS.pro.features.length).toBeGreaterThan(0);
  });
});

describe("monthStartUtc", () => {
  it("returns the first instant of the UTC month", () => {
    const start = monthStartUtc(new Date("2026-07-09T15:30:00Z"));
    expect(start.toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });

  it("uses UTC even when local time is in the previous month", () => {
    // 00:30 UTC on the 1st can still be the previous month locally.
    const start = monthStartUtc(new Date("2026-08-01T00:30:00Z"));
    expect(start.toISOString()).toBe("2026-08-01T00:00:00.000Z");
  });
});
