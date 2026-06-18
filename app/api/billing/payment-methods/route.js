import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "../../../../lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message || "Profile not found" },
        { status: 404 }
      );
    }

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ paymentMethods: [] });
    }

    const paymentMethods = await stripe.customers.listPaymentMethods(
      profile.stripe_customer_id,
      {
        type: "card",
        limit: 10,
      }
    );

    const cards = paymentMethods.data.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand ?? "card",
      last4: pm.card?.last4 ?? "0000",
      exp_month: pm.card?.exp_month ?? null,
      exp_year: pm.card?.exp_year ?? null,
    }));

    return NextResponse.json({
      paymentMethods: cards,
      stripeCustomerId: profile.stripe_customer_id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to load payment methods" },
      { status: 500 }
    );
  }
}
