import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Deliberately no auth check here at all - that's the entire point of
// this route. It exists specifically so someone can manage their email
// preferences from a link in an email, without needing to be logged
// in, and without the "which of my multiple accounts is this" problem
// a login-gated page would create (each token is scoped to exactly one
// profile, so there's nothing to disambiguate).
//
// Security model: the unsubscribe_token itself is the only credential.
// It's never accepted as a way to identify *which* profile to act on
// beyond looking it up - every query below filters by token, never by
// an id or email supplied directly by the client, so there's no way to
// use this route to touch a profile you don't already hold the token
// for.

const ALLOWED_FIELDS = ["email_reminders", "circle_reminders", "weekly_digest"];

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, email_reminders, circle_reminders, weekly_digest")
    .eq("unsubscribe_token", token)
    .maybeSingle();

  if (error) {
    console.error("unsubscribe lookup error:", error.message);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "This link isn't valid. It may have expired." }, { status: 404 });
  }

  return NextResponse.json({
    name: data.full_name || null,
    preferences: {
      email_reminders: data.email_reminders !== false,
      circle_reminders: data.circle_reminders !== false,
      weekly_digest: data.weekly_digest !== false,
    },
  });
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const token = body?.token;
  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  // Only ever accept the three known preference fields, and only ever
  // as real booleans - never pass through arbitrary client-supplied
  // keys/values into the update.
  const updates = {};
  for (const field of ALLOWED_FIELDS) {
    if (typeof body?.preferences?.[field] === "boolean") {
      updates[field] = body.preferences[field];
    }
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("unsubscribe_token", token)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("unsubscribe update error:", error.message);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "This link isn't valid. It may have expired." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
