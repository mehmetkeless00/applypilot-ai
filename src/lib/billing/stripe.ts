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
