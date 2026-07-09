export type Plan = "free" | "pro";

export const PLANS: Record<Plan, { name: string; analysesPerMonth: number }> = {
  free: { name: "Free", analysesPerMonth: 3 },
  pro: { name: "Pro", analysesPerMonth: 50 },
};

export function normalizePlan(value: unknown): Plan {
  return value === "pro" ? "pro" : "free";
}

// Maps a Stripe subscription status to the plan the user should be on.
// past_due keeps Pro as a grace period while Stripe retries the payment;
// a final failure arrives as canceled/unpaid and drops the user to free.
export function planFromSubscriptionStatus(status: string | null): Plan {
  switch (status) {
    case "active":
    case "trialing":
    case "past_due":
      return "pro";
    default:
      return "free";
  }
}
