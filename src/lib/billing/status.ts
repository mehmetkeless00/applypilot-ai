import { normalizePlan, type Plan } from "./plans";

// Pure presentation logic for subscription state, shared by the billing
// page (and testable without rendering). Tolerates legacy rows where the
// period/cancel columns are null.

export interface BillingProfileFields {
  plan?: string | null;
  subscription_status?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean | null;
}

export interface SubscriptionSummary {
  plan: Plan;
  /** Short status label, e.g. "Active", "Payment past due". */
  statusLabel: string;
  /** One-line detail, e.g. "Renews on Aug 1, 2026." May be null. */
  detail: string | null;
  /** True when the user should be warned (past_due). */
  warning: boolean;
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function subscriptionSummary(
  profile: BillingProfileFields | null | undefined,
): SubscriptionSummary {
  const plan = normalizePlan(profile?.plan);
  const status = profile?.subscription_status ?? null;
  const periodEnd = profile?.current_period_end ?? null;
  const cancelAtPeriodEnd = profile?.cancel_at_period_end ?? false;

  if (plan === "free") {
    return {
      plan,
      statusLabel: status === "canceled" ? "Canceled" : "Free plan",
      detail: null,
      warning: false,
    };
  }

  if (status === "past_due") {
    return {
      plan,
      statusLabel: "Payment past due",
      detail: periodEnd
        ? `Pro access continues while we retry — update your payment method to keep it past ${formatDay(periodEnd)}.`
        : "Pro access continues while we retry your payment.",
      warning: true,
    };
  }

  if (cancelAtPeriodEnd) {
    return {
      plan,
      statusLabel: "Cancellation scheduled",
      detail: periodEnd
        ? `Pro access ends on ${formatDay(periodEnd)}. You can resume anytime before then.`
        : "Pro access ends at the close of the paid period.",
      warning: false,
    };
  }

  return {
    plan,
    statusLabel: status === "trialing" ? "Trialing" : "Active",
    detail: periodEnd ? `Renews on ${formatDay(periodEnd)}.` : null,
    warning: false,
  };
}
