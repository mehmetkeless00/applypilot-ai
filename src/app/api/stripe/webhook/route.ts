import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { planFromSubscriptionStatus } from "@/lib/billing/plans";
import { BillingConfigError, getStripe } from "@/lib/billing/stripe";

// Stripe webhook: the single source of truth for subscription state.
// Design:
// - Signature is verified against the raw request body.
// - Idempotent: event IDs are recorded in stripe_events first; a replayed
//   delivery is acknowledged without reprocessing.
// - Out-of-order safe: profile writes carry the event's `created` time and
//   only apply when newer than the last applied event (billing_event_at).
// - State is derived from Stripe objects (or re-fetched from Stripe for
//   checkout/invoice events), never from client input. Ownership comes
//   from the stored customer ID or the session's client_reference_id —
//   never from an email address.

type ProfileBillingFields = Record<string, string | boolean | null>;

function idOf(
  value: string | { id: string } | null | undefined,
): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function toIso(unixSeconds: number | null | undefined): string | null {
  return unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null;
}

/**
 * Extracts the billing state we persist from a Stripe subscription.
 * Period boundaries live on the subscription item since API 2025-03-31.
 */
function subscriptionFields(sub: Stripe.Subscription): ProfileBillingFields {
  const item = sub.items?.data?.[0];
  return {
    plan: planFromSubscriptionStatus(sub.status),
    stripe_subscription_id: sub.id,
    subscription_status: sub.status,
    stripe_price_id: item?.price?.id ?? null,
    current_period_start: toIso(item?.current_period_start),
    current_period_end: toIso(item?.current_period_end),
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
  };
}

/**
 * Applies billing fields to the profile owning the Stripe customer,
 * skipping the write when a newer event has already been applied.
 * Returns the number of rows updated.
 */
async function applyToCustomer(
  customerId: string,
  fields: ProfileBillingFields,
  eventCreatedIso: string,
): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({ ...fields, billing_event_at: eventCreatedIso })
    .eq("stripe_customer_id", customerId)
    .or(`billing_event_at.is.null,billing_event_at.lt.${eventCreatedIso}`)
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}

/** First-time link of a customer to a profile via client_reference_id. */
async function applyToUserId(
  userId: string,
  customerId: string,
  fields: ProfileBillingFields,
  eventCreatedIso: string,
): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({
      ...fields,
      stripe_customer_id: customerId,
      billing_event_at: eventCreatedIso,
    })
    .eq("id", userId)
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}

/** Records the event ID; false means it was already processed (retry). */
async function claimEvent(event: Stripe.Event): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("stripe_events")
    .upsert(
      { id: event.id, type: event.type },
      { onConflict: "id", ignoreDuplicates: true },
    )
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/** Releases a claim after a failed handler so Stripe's retry reprocesses. */
async function releaseEvent(event: Stripe.Event): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("stripe_events").delete().eq("id", event.id);
  } catch (err) {
    console.error(`Failed to release webhook claim for ${event.id}:`, err);
  }
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
  let stripe: Stripe;
  try {
    stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    if (err instanceof BillingConfigError) {
      console.error(err.message);
      return NextResponse.json({ error: "Billing not configured" }, { status: 500 });
    }
    console.error("Stripe signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const eventCreatedIso = new Date(event.created * 1000).toISOString();

  try {
    if (!(await claimEvent(event))) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    switch (event.type) {
      // The moment of purchase. Derive real state from the subscription —
      // never assume "active" (the first payment could be processing).
      case "checkout.session.completed": {
        const session = event.data.object;
        const customerId = idOf(session.customer);
        const subscriptionId = idOf(session.subscription);
        if (!customerId || session.mode !== "subscription" || !subscriptionId) {
          break;
        }
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const fields = subscriptionFields(sub);
        const updated = await applyToCustomer(customerId, fields, eventCreatedIso);
        // The customer may not be linked yet (e.g. the pre-checkout profile
        // write failed) — fall back to the session's client_reference_id,
        // which we set server-side from the authenticated user.
        if (updated === 0 && session.client_reference_id) {
          const linked = await applyToUserId(
            session.client_reference_id,
            customerId,
            fields,
            eventCreatedIso,
          );
          if (linked === 0) {
            console.warn(
              `Stripe webhook: no profile for customer ${customerId} or reference ${session.client_reference_id}`,
            );
          }
        }
        break;
      }

      // Creation, renewal, plan change, cancellation-at-period-end, and
      // the final state after failed payment retries all arrive here.
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const customerId = idOf(sub.customer as string | { id: string });
        if (customerId) {
          const updated = await applyToCustomer(
            customerId,
            subscriptionFields(sub),
            eventCreatedIso,
          );
          if (updated === 0) {
            console.warn(
              `Stripe webhook: stale or unmatched ${event.type} for customer ${customerId}`,
            );
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const customerId = idOf(sub.customer as string | { id: string });
        if (customerId) {
          await applyToCustomer(
            customerId,
            {
              plan: "free",
              stripe_subscription_id: null,
              subscription_status: "canceled",
              stripe_price_id: null,
              current_period_start: null,
              current_period_end: null,
              cancel_at_period_end: false,
            },
            eventCreatedIso,
          );
        }
        break;
      }

      // Successful renewal payment — refresh state from the subscription
      // (this is what moves past_due back to active after a retry works).
      case "invoice.paid": {
        const invoice = event.data.object;
        const customerId = idOf(invoice.customer as string | { id: string });
        const subscriptionId = idOf(
          invoice.parent?.subscription_details?.subscription,
        );
        if (customerId && subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          await applyToCustomer(customerId, subscriptionFields(sub), eventCreatedIso);
        }
        break;
      }

      // Grace period: the plan mapping keeps Pro on past_due while Stripe
      // retries; a final failure arrives as a subscription update/deletion.
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = idOf(invoice.customer as string | { id: string });
        if (customerId) {
          await applyToCustomer(
            customerId,
            {
              plan: planFromSubscriptionStatus("past_due"),
              subscription_status: "past_due",
            },
            eventCreatedIso,
          );
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    // Log the event id/type for support; never the payload or secrets.
    console.error(`Stripe webhook failed for ${event.type} (${event.id}):`, err);
    // Release the idempotency claim so the retry actually reprocesses,
    // then answer non-2xx to make Stripe retry.
    await releaseEvent(event);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
