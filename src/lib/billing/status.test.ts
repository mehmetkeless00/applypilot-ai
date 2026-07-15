import { describe, expect, it } from "vitest";
import { subscriptionSummary } from "./status";

const PERIOD_END = "2026-08-01T00:00:00.000Z";

describe("subscriptionSummary", () => {
  it("describes an active Pro subscription with its renewal date", () => {
    const s = subscriptionSummary({
      plan: "pro",
      subscription_status: "active",
      current_period_end: PERIOD_END,
      cancel_at_period_end: false,
    });
    expect(s.plan).toBe("pro");
    expect(s.statusLabel).toBe("Active");
    expect(s.detail).toContain("Renews on");
    expect(s.detail).toContain("2026");
    expect(s.warning).toBe(false);
  });

  it("labels trialing subscriptions as Pro", () => {
    const s = subscriptionSummary({
      plan: "pro",
      subscription_status: "trialing",
      current_period_end: PERIOD_END,
      cancel_at_period_end: false,
    });
    expect(s.plan).toBe("pro");
    expect(s.statusLabel).toBe("Trialing");
  });

  it("shows the access-end date when cancellation is scheduled", () => {
    const s = subscriptionSummary({
      plan: "pro",
      subscription_status: "active",
      current_period_end: PERIOD_END,
      cancel_at_period_end: true,
    });
    expect(s.plan).toBe("pro"); // access lasts until the paid period ends
    expect(s.statusLabel).toBe("Cancellation scheduled");
    expect(s.detail).toContain("ends on");
  });

  it("warns on past_due while keeping Pro (grace period)", () => {
    const s = subscriptionSummary({
      plan: "pro",
      subscription_status: "past_due",
      current_period_end: PERIOD_END,
      cancel_at_period_end: false,
    });
    expect(s.plan).toBe("pro");
    expect(s.warning).toBe(true);
    expect(s.statusLabel).toBe("Payment past due");
  });

  it("describes a fully canceled account as Free", () => {
    const s = subscriptionSummary({
      plan: "free",
      subscription_status: "canceled",
      current_period_end: null,
      cancel_at_period_end: false,
    });
    expect(s.plan).toBe("free");
    expect(s.statusLabel).toBe("Canceled");
  });

  it("supports legacy rows where the new billing columns are null", () => {
    // Rows written before migration 0008 have no period/cancel data.
    const legacyPro = subscriptionSummary({
      plan: "pro",
      subscription_status: "active",
    });
    expect(legacyPro.plan).toBe("pro");
    expect(legacyPro.statusLabel).toBe("Active");
    expect(legacyPro.detail).toBeNull();

    const legacyFree = subscriptionSummary({ plan: "free" });
    expect(legacyFree.plan).toBe("free");
    expect(legacyFree.warning).toBe(false);
  });

  it("fails closed for missing or junk profiles", () => {
    expect(subscriptionSummary(null).plan).toBe("free");
    expect(subscriptionSummary({ plan: "enterprise" }).plan).toBe("free");
  });
});
