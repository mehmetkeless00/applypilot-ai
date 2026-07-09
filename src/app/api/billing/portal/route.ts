import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BillingConfigError, getStripe } from "@/lib/billing/stripe";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No billing account yet — upgrade to Pro first." },
      { status: 400 },
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/dashboard/billing`,
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
    console.error("Billing portal error:", err);
    return NextResponse.json(
      { error: "Could not open the billing portal. Try again." },
      { status: 502 },
    );
  }
}
