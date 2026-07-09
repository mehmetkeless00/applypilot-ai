import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BillingConfigError, getProPriceId, getStripe } from "@/lib/billing/stripe";
import { normalizePlan } from "@/lib/billing/plans";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

  try {
    const stripe = getStripe();

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (normalizePlan(profile?.plan) === "pro") {
      return NextResponse.json(
        { error: "You are already on the Pro plan." },
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
          { error: "Could not start checkout. Try again." },
          { status: 500 },
        );
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: getProPriceId(), quantity: 1 }],
      success_url: `${appUrl}/dashboard/billing?checkout=success`,
      cancel_url: `${appUrl}/dashboard/billing?checkout=canceled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    if (err instanceof BillingConfigError) {
      console.error(err.message);
      return NextResponse.json(
        { error: "Billing is not configured on the server." },
        { status: 500 },
      );
    }
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: "Could not start checkout. Try again." },
      { status: 502 },
    );
  }
}
