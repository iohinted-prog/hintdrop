import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Replaces the old custom email_verification_tokens system. That system
// sent its own separate email with a link to /verify-email?token=..., which
// is unrelated to (and much less reliable than) Supabase's native
// confirmation flow — leading to real confusion when someone clicked an old
// custom-system link and hit its "invalid or already used" error while
// Supabase's own, already-fixed confirmation flow was working fine.
//
// This uses Supabase's built-in resend(), which sends the same "Confirm
// signup" email template configured in the dashboard (the one that now
// links to /auth/confirm with token_hash verification) — so there's exactly
// one confirmation mechanism in the app, not two.
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(req) {
  try {
    const supabase = getSupabase();
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    const { data: userRes, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError) throw userError;

    const email = userRes?.user?.email;
    if (!email) return NextResponse.json({ error: "No email found for this user" }, { status: 404 });

    if (userRes.user.email_confirmed_at) {
      return NextResponse.json({ success: true, alreadyConfirmed: true });
    }

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: "https://hintdrop.app/auth/confirm" },
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("resend-confirmation error:", error);
    return NextResponse.json({ error: "Could not resend the confirmation email" }, { status: 500 });
  }
}
