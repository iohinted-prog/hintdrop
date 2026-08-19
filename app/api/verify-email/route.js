import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(req) {
  try {
    const supabase = getSupabase();
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

    const { data: record } = await supabase
      .from("email_verification_tokens")
      .select("user_id, created_at")
      .eq("token", token)
      .maybeSingle();

    if (!record) {
      return NextResponse.json({ error: "This link is invalid or has already been used." }, { status: 400 });
    }

    // Tokens expire after 7 days
    const ageMs = Date.now() - new Date(record.created_at).getTime();
    if (ageMs > 7 * 24 * 60 * 60 * 1000) {
      await supabase.from("email_verification_tokens").delete().eq("token", token);
      return NextResponse.json({ error: "This link has expired. Request a new one from your account settings." }, { status: 400 });
    }

    await supabase.from("profiles").update({ email_verified_at: new Date().toISOString() }).eq("id", record.user_id);
    await supabase.from("email_verification_tokens").delete().eq("token", token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("verify-email error:", error);
    return NextResponse.json({ error: "Something went wrong verifying your email." }, { status: 500 });
  }
}
