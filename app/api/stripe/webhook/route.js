import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "../../../../lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let stripeInstance = null;

function getStripe() {
  if (stripeInstance) return stripeInstance;

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey || typeof secretKey !== "string" || !secretKey.trim()) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  stripeInstance = new Stripe(secretKey.trim(), {
    apiVersion: "2024-09-30.acacia",
  });

  return stripeInstance;
}

async function getRawBody(request) {
  const arrayBuffer = await request.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function POST(request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret || typeof webhookSecret !== "string" || !webhookSecret.trim()) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  try {
    const sig = request.headers.get("stripe-signature");

    if (!sig) {
      return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
    }

    const rawBody = await getRawBody(request);
    const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret.trim());
    const supabase = await createClient();

    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object;
      const contributionId = intent?.metadata?.contribution_id;

      if (contributionId) {
        await supabase
          .from("circle_contributions")
          .update({
            payment_status: "paid",
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", contributionId)
          .eq("stripe_payment_intent_id", intent.id);
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object;
      const contributionId = intent?.metadata?.contribution_id;

      if (contributionId) {
        await supabase
          .from("circle_contributions")
          .update({
            payment_status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", contributionId)
          .eq("stripe_payment_intent_id", intent.id);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook error." },
      { status: 400 }
    );
  }
}
