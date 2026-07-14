import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "../../../../lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let stripeInstance = null;

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function parseAmount(value) {
  const parsed = Number(String(value ?? "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(parsed)) return 0;
  return Math.round((parsed + Number.EPSILON) * 100) / 100;
}

function getStripe() {
  if (stripeInstance) return stripeInstance;

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey || !String(secretKey).trim()) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  stripeInstance = new Stripe(String(secretKey).trim(), {
    apiVersion: "2024-09-30.acacia",
  });

  return stripeInstance;
}

async function getAuthedUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message || "Failed to load user.");
  }

  return { supabase, user: user || null };
}

async function getStripeCustomerId(supabase, stripe, user) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message || "Failed to load profile.");
  }

  if (profile?.stripe_customer_id) {
    return { customerId: profile.stripe_customer_id, profile };
  }

  const customer = await stripe.customers.create({
    email: user.email || undefined,
    name: profile?.full_name || undefined,
    metadata: {
      supabase_user_id: user.id,
    },
  });

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", user.id);

  if (updateError) {
    throw new Error(updateError.message || "Failed to save Stripe customer.");
  }

  return { customerId: customer.id, profile };
}

async function canAccessCircle(supabase, circleId, userId, userEmail) {
  const { data: circle, error: circleError } = await supabase
    .from("circles")
    .select("id, user_id, title, currency, total_target_amount")
    .eq("id", circleId)
    .maybeSingle();

  if (circleError) {
    throw new Error(circleError.message || "Failed to load circle.");
  }

  if (!circle) {
    return { allowed: false, reason: "Circle not found." };
  }

  if (circle.user_id === userId) {
    return { allowed: true, circle, invite: null, accessType: "owner" };
  }

  const normalizedUserEmail = normalizeEmail(userEmail);

  let inviteQuery = supabase
    .from("circle_invites")
    .select("id, invited_user_id, user_id, circle_id, invite_email, status")
    .eq("circle_id", circleId);

  if (normalizedUserEmail) {
    inviteQuery = inviteQuery.or(
      `invited_user_id.eq.${userId},invite_email.eq.${normalizedUserEmail}`
    );
  } else {
    inviteQuery = inviteQuery.eq("invited_user_id", userId);
  }

  const { data: invite, error: inviteError } = await inviteQuery.maybeSingle();

  if (inviteError) {
    throw new Error(inviteError.message || "Failed to load invite.");
  }

  if (!invite) {
    return { allowed: false, reason: "You are not invited to this circle." };
  }

  const invitedUserMatch = invite.invited_user_id === userId;
  const invitedEmailMatch =
    normalizeEmail(invite.invite_email) === normalizedUserEmail;

  if (!invitedUserMatch && !invitedEmailMatch) {
    return {
      allowed: false,
      reason: "You are not allowed to contribute to this circle.",
    };
  }

  return {
    allowed: true,
    circle,
    invite,
    accessType: "invitee",
  };
}

export async function GET() {
  return json({
    ok: true,
    route: "payment-intent",
    message: "Route is live. Send a POST request to create a payment intent.",
  });
}

export async function POST(request) {
  try {
    const stripe = getStripe();
    const { supabase, user } = await getAuthedUser();

    if (!user) {
      return json({ error: "Unauthorized", where: "auth" }, 401);
    }

    const body = await request.json().catch(() => ({}));
    const circleId = String(body.circleId || body.circle_id || "").trim();
    const amount = parseAmount(body.amount);
    // Add Stripe processing fee on top so contributor covers it
    // Stripe fee: 1.5% + 20p (UK cards)
    const stripeFeeAmount = Math.ceil((amount * 0.015 + 0.20) * 100) / 100;
    const amountWithStripeFee = Math.round((amount + stripeFeeAmount) * 100) / 100;
    const currency = String(body.currency || "GBP").trim().toUpperCase();

    if (!circleId) {
      return json({ error: "Missing circleId.", where: "validation-circleId" }, 400);
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return json({ error: "Amount must be greater than 0.", where: "validation-amount" }, 400);
    }

    const access = await canAccessCircle(
      supabase,
      circleId,
      user.id,
      user.email || ""
    );

    if (!access.allowed) {
      return json(
        { error: access.reason || "Not allowed.", where: "circle-access" },
        403
      );
    }

    const { customerId } = await getStripeCustomerId(supabase, stripe, user);

    const contributionPayload = {
      circle_id: circleId,
      invite_id: access.invite?.id || null,
      user_id: user.id,
      contributor_name:
        body.contributorName ||
        user.user_metadata?.full_name ||
        user.email ||
        null,
      contributor_email: body.contributorEmail || user.email || null,
      amount, // original contribution amount before Stripe fee
      currency,
      payment_status: "pending",
    };

    const { data: contribution, error: contributionError } = await supabase
      .from("circle_contributions")
      .insert(contributionPayload)
      .select("id, circle_id, amount, currency")
      .single();

    if (contributionError) {
      return json(
        {
          error: contributionError.message || "Failed to create contribution.",
          where: "insert-contribution",
        },
        500
      );
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amountWithStripeFee * 100),
      currency: currency.toLowerCase(),
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        supabase_user_id: user.id,
        circle_id: circleId,
        contribution_id: contribution.id,
        invite_id: access.invite?.id || "",
        access_type: access.accessType || "",
      },
      receipt_email: body.contributorEmail || user.email || undefined,
      description: body.description || `Contribution to circle ${circleId}`,
    });

    const { error: updateError } = await supabase
      .from("circle_contributions")
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", contribution.id);

    if (updateError) {
      return json(
        {
          error: updateError.message || "Failed to save payment intent.",
          where: "update-contribution",
        },
        500
      );
    }

    return json({
      clientSecret: paymentIntent.client_secret,
      contributionId: contribution.id,
      paymentIntentId: paymentIntent.id,
      where: "success",
    });
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create payment intent.",
        where: "catch",
      },
      500
    );
  }
}
