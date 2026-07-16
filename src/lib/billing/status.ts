import { normalizePlan, type Plan } from "./plans";
import { getMessages, type Locale } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

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

export function subscriptionSummary(
  profile: BillingProfileFields | null | undefined,
  locale: Locale = "en",
): SubscriptionSummary {
  const t = getMessages(locale).billing.status;
  const plan = normalizePlan(profile?.plan);
  const status = profile?.subscription_status ?? null;
  const periodEnd = profile?.current_period_end ?? null;
  const cancelAtPeriodEnd = profile?.cancel_at_period_end ?? false;
  const day = periodEnd ? formatDate(periodEnd, locale) : null;

  if (plan === "free") {
    return {
      plan,
      statusLabel: status === "canceled" ? t.canceled : t.freePlan,
      detail: null,
      warning: false,
    };
  }

  if (status === "past_due") {
    return {
      plan,
      statusLabel: t.pastDue,
      detail: day ? t.pastDueDetailWithDate(day) : t.pastDueDetail,
      warning: true,
    };
  }

  if (cancelAtPeriodEnd) {
    return {
      plan,
      statusLabel: t.cancelScheduled,
      detail: day ? t.cancelDetailWithDate(day) : t.cancelDetail,
      warning: false,
    };
  }

  return {
    plan,
    statusLabel: status === "trialing" ? t.trialing : t.active,
    detail: day ? t.renewsOn(day) : null,
    warning: false,
  };
}
