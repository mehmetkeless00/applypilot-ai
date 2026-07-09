import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { planFromSubscriptionStatus } from "@/lib/billing/plans";
import { BillingConfigError, getStripe } from "@/lib/billing/stripe";

// Applies a billing state to the profile owning the Stripe customer.
// Unknown customers are logged and acknowledged with 200 so Stripe does
// not retry events we can never process (e.g. from another environment).
async function applyToCustomer(
  customerId: string,
  fields: Record<string, string | null>,
) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update(fields)
    .eq("stripe_customer_id", customerId)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    console.warn(`Stripe webhook: no profile for customer ${customerId}`);
  }
}

function customerIdOf(value: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing webhook signature or secret" },
      { status: 400 },
    );
  }

  // Signature verification needs the exact raw body, not parsed JSON.
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    if (err instanceof BillingConfigError) {
      console.error(err.message);
      return NextResponse.json({ error: "Billing not configured" }, { status: 500 });
    }
    console.error("Stripe signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const customerId = customerIdOf(session.customer);
        if (customerId && session.mode === "subscription") {
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : (session.subscription?.id ?? null);
          await applyToCustomer(customerId, {
            plan: "pro",
            stripe_subscription_id: subscriptionId,
            subscription_status: "active",
          });
        }
        break;
      }

      // Covers renewal, plan change, cancellation-at-period-end, and the
      // final state after failed payment retries (past_due → canceled/unpaid).
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const customerId = customerIdOf(subscription.customer);
        if (customerId) {
          await applyToCustomer(customerId, {
            plan: planFromSubscriptionStatus(subscription.status),
            stripe_subscription_id: subscription.id,
            subscription_status: subscription.status,
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = customerIdOf(subscription.customer);
        if (customerId) {
          await applyToCustomer(customerId, {
            plan: "free",
            stripe_subscription_id: null,
            subscription_status: "canceled",
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = customerIdOf(invoice.customer);
        if (customerId) {
          // Grace period: plan mapping keeps Pro while Stripe retries.
          await applyToCustomer(customerId, {
            plan: planFromSubscriptionStatus("past_due"),
            subscription_status: "past_due",
          });
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error(`Stripe webhook handler failed for ${event.type}:`, err);
    // Non-2xx makes Stripe retry the event later.
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
