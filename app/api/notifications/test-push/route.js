import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendPushToUser } from "../../../../lib/pushSend";

// Lets a signed-in user send themselves a real push, so push can be
// verified end-to-end with a single account - the only other path
// that triggers a push (someone else commenting/reacting on your
// feed item) genuinely requires two accounts to test at all.
export async function POST(req) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const { count } = await supabase
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userData.user.id);

    if (!count) {
      return NextResponse.json({ error: "No push subscription found for this device yet." }, { status: 400 });
    }

    const result = await sendPushToUser(supabase, userData.user.id, {
      title: "Test notification",
      body: "If you can see this, push notifications are working.",
      url: "/settings",
    });

    if (result.sent === 0) {
      return NextResponse.json({ error: `Send attempted but failed (${result.failed} failure${result.failed === 1 ? "" : "s"}). Check server logs.` }, { status: 500 });
    }

    return NextResponse.json({ ok: true, sent: result.sent });
  } catch (error) {
    console.error("Test push error:", error);
    return NextResponse.json({ error: error?.message || "Could not send test notification." }, { status: 500 });
  }
}
