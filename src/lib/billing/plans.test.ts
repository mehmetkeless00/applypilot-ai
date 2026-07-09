import { describe, expect, it } from "vitest";
import { normalizePlan, PLANS, planFromSubscriptionStatus } from "./plans";
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
    expect(planFromSubscriptionStatus("incomplete_expired")).toBe("free");
    expect(planFromSubscriptionStatus("paused")).toBe("free");
    expect(planFromSubscriptionStatus(null)).toBe("free");
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
