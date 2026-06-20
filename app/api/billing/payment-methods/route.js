import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  return new Stripe(secretKey);
}

export async function GET() {
  try {
    const stripe = getStripe();
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ paymentMethods: [], defaultPaymentMethodId: null });
    }

    const [paymentMethods, customer] = await Promise.all([
      stripe.paymentMethods.list({
        customer: profile.stripe_customer_id,
        type: "card",
      }),
      stripe.customers.retrieve(profile.stripe_customer_id),
    ]);

    const defaultPaymentMethodId =
      customer && !("deleted" in customer)
        ? customer.invoice_settings?.default_payment_method || null
        : null;

    const formatted = paymentMethods.data.map((method) => ({
      id: method.id,
      brand: method.card?.brand || "",
      last4: method.card?.last4 || "",
      expMonth: method.card?.exp_month || null,
      expYear: method.card?.exp_year || null,
      funding: method.card?.funding || "",
    }));

    return NextResponse.json({
      paymentMethods: formatted,
      defaultPaymentMethodId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to load payment methods." },
      { status: 500 }
    );
  }
}
