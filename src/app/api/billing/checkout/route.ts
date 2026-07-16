import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  assertBillingConfig,
  billingAvailable,
  BillingConfigError,
  getProPriceId,
  getStripe,
  missingBillingConfig,
} from "@/lib/billing/stripe";
import { normalizePlan } from "@/lib/billing/plans";
import { getMessages } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const t = getMessages(await getLocale());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: t.errors.notAuthenticated }, { status: 401 });
  }

  // Env var names go to server logs only; the response stays neutral.
  if (!billingAvailable()) {
    console.error(
      `Checkout refused — billing not configured: set ${missingBillingConfig().join(", ")}`,
    );
    return NextResponse.json(
      { error: t.billing.proUnavailable },
      { status: 503 },
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

  try {
    assertBillingConfig(["STRIPE_SECRET_KEY", "STRIPE_PRO_PRICE_ID"]);
    const stripe = getStripe();

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (normalizePlan(profile?.plan) === "pro") {
      return NextResponse.json(
        { error: t.errors.billing.alreadyPro },
        { status: 400 },
      );
    }

    let customerId = profile?.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      // Billing columns are writable only by the service role.
      const admin = createAdminClient();
      const { error } = await admin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
      if (error) {
        console.error("Failed to save Stripe customer id:", error);
        return NextResponse.json(
          { error: t.errors.billing.checkoutFailed },
          { status: 500 },
        );
      }
    }

    // Price is always the server-configured one; the browser sends nothing.
    // client_reference_id + metadata tie the session (and the resulting
    // subscription) to the Supabase user for webhook reconciliation —
    // account ownership is never inferred from email.
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      metadata: { user_id: user.id },
      subscription_data: { metadata: { user_id: user.id } },
      line_items: [{ price: getProPriceId(), quantity: 1 }],
      success_url: `${appUrl}/dashboard/billing?checkout=success`,
      cancel_url: `${appUrl}/dashboard/billing?checkout=canceled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    if (err instanceof BillingConfigError) {
      console.error(err.message);
      return NextResponse.json(
        { error: t.billing.proUnavailable },
        { status: 503 },
      );
    }
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: t.errors.billing.checkoutFailed },
      { status: 502 },
    );
  }
}
