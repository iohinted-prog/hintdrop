import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Creates the pending contact_invites row immediately when a new account is
// created via a shared "join their Circle" link — while still guaranteed to
// be in the original browser (this runs synchronously right after
// signUp() resolves, before any redirect or email round-trip). This is
// deliberately NOT threaded through the email confirmation flow: that
// would require the recipient to open the confirmation link in the same
// browser/app context as where they signed up, which breaks constantly in
// practice (WhatsApp's in-app browser to sign up, the Mail app to actually
// click confirm, opening a different browser entirely). Creating the row
// here instead means the pending request already exists in the database
// before that gap can ever matter — the owner will simply see it appear
// as a normal pending invite once the new account confirms and can be
// accepted through the exact same in-app flow as any other invite.
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(req) {
  try {
    const { newUserId, ownerUserId } = await req.json();

    if (!newUserId || !ownerUserId) {
      return NextResponse.json({ error: "newUserId and ownerUserId are required" }, { status: 400 });
    }
    if (newUserId === ownerUserId) {
      // Someone signing up via their own share link somehow — not a real
      // case, but guard against a self-referencing invite regardless
      return NextResponse.json({ ok: true, skipped: "self" });
    }

    const supabase = getSupabase();

    // Idempotent — if a pending or already-accepted relationship exists in
    // either direction, don't create a duplicate. Covers retries, and the
    // rare case where the same-browser onboarding-time fallback also fires.
    const { data: existingInvite } = await supabase
      .from("contact_invites")
      .select("id")
      .or(
        `and(inviter_user_id.eq.${newUserId},invited_user_id.eq.${ownerUserId}),and(inviter_user_id.eq.${ownerUserId},invited_user_id.eq.${newUserId})`
      )
      .in("status", ["pending", "accepted"])
      .maybeSingle();

    if (existingInvite) {
      return NextResponse.json({ ok: true, skipped: "already_exists" });
    }

    const { data: existingContact } = await supabase
      .from("contacts")
      .select("id")
      .eq("user_id", ownerUserId)
      .eq("profile_id", newUserId)
      .maybeSingle();

    if (existingContact) {
      return NextResponse.json({ ok: true, skipped: "already_contact" });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { error: insertError } = await supabase.from("contact_invites").insert({
      inviter_user_id: newUserId,
      invited_user_id: ownerUserId,
      status: "pending",
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) throw insertError;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("invite-from-signup error:", error);
    // Best-effort — a failure here shouldn't surface as a signup error,
    // the account itself was already created successfully by this point
    return NextResponse.json({ ok: false, error: "Could not create the pending invite" }, { status: 500 });
  }
}
