import Stripe from "stripe";

export class BillingConfigError extends Error {}

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes("placeholder")) {
    throw new BillingConfigError("STRIPE_SECRET_KEY is not set");
  }
  _stripe = new Stripe(key);
  return _stripe;
}

export function getProPriceId(): string {
  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  if (!priceId || priceId.includes("placeholder")) {
    throw new BillingConfigError("STRIPE_PRO_PRICE_ID is not set");
  }
  return priceId;
}

const REQUIRED_BILLING_VARS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRO_PRICE_ID",
  "NEXT_PUBLIC_APP_URL",
] as const;

/**
 * Names (never values) of billing env vars that are missing or still
 * placeholders. Empty array = fully configured. Used by billing routes to
 * produce actionable server logs without leaking secrets.
 */
export function missingBillingConfig(
  required: readonly string[] = REQUIRED_BILLING_VARS,
): string[] {
  return required.filter((name) => {
    const value = process.env[name];
    return !value || value.includes("placeholder") || value.includes("your-");
  });
}

/**
 * Whether Stripe billing is fully configured and Pro upgrades can be
 * offered. When false, the UI shows Pro as "Coming soon" and checkout is
 * refused with a neutral message — the Free plan keeps working. Becomes
 * true automatically once all billing env vars are set (no code change).
 */
export function billingAvailable(): boolean {
  return missingBillingConfig().length === 0;
}

/** Throws a BillingConfigError naming (not leaking) unset variables. */
export function assertBillingConfig(required?: readonly string[]): void {
  const missing = missingBillingConfig(required);
  if (missing.length > 0) {
    throw new BillingConfigError(
      `Billing is not configured — set ${missing.join(", ")}`,
    );
  }
}
