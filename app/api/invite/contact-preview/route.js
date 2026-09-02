import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function hashToken(token) {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Public, unauthenticated lookup — deliberately so. The person clicking a
// contact-invite link may not be signed in yet, or may be signed in as
// the wrong account, and either way needs to see who's inviting them and
// which email the invite was actually sent to BEFORE deciding whether to
// accept. Previously /invite/contact only checked whether a session
// existed at all, not whose — so a signed-in-as-the-wrong-person visit
// would silently show "Accept invite" and only fail afterward, with a
// raw "Invite email does not match signed-in user" error from
// accept-contact-invite. This endpoint is what lets the page catch that
// mismatch upfront instead.
//
// Safe to leave unauthenticated: possession of the raw token is itself
// the credential (a random UUID, same trust model as a password-reset
// link) — this only ever returns the inviter's name and the invite's
// target email, nothing else about either account. contact_invites has
// RLS restricting SELECT to "inviter_user_id = auth.uid()", so a plain
// anon-key client couldn't read an arbitrary invite by token at all —
// service role bypasses that here, same reasoning as
// accept-contact-invite's own edge function already documents.
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });
  }

  const supabase = getSupabase();
  const tokenHash = await hashToken(token);

  const { data: invite, error } = await supabase
    .from("contact_invites")
    .select("inviter_user_id, invite_email, status, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (!invite) {
    return NextResponse.json(
      { ok: false, error: "Invite not found or already used" },
      { status: 404 }
    );
  }

  if (invite.status !== "pending") {
    return NextResponse.json(
      { ok: false, error: "This invite has already been used" },
      { status: 410 }
    );
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ ok: false, error: "Invite has expired" }, { status: 410 });
  }

  const { data: inviterProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", invite.inviter_user_id)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    inviterName: inviterProfile?.full_name || "Someone",
    inviteEmail: invite.invite_email || null,
  });
}
