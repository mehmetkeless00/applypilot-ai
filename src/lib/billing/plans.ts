export type Plan = "free" | "pro";

export interface PlanInfo {
  name: string;
  analysesPerMonth: number;
  /** Display price in USD per month. Keep in sync with the Stripe price. */
  priceMonthly: number;
  features: string[];
}

export const PLANS: Record<Plan, PlanInfo> = {
  free: {
    name: "Free",
    analysesPerMonth: 3,
    priceMonthly: 0,
    features: [
      "3 analyses per month",
      "Fit score & skills-gap analysis",
      "ATS keyword coverage",
      "Tailored summary & cover letter",
      "Resume library with versions",
    ],
  },
  pro: {
    name: "Pro",
    analysesPerMonth: 50,
    priceMonthly: 12,
    features: [
      "50 analyses per month",
      "Everything in Free",
      "Re-score as often as you edit",
      "PDF & DOCX exports",
      "Priority support",
    ],
  },
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
