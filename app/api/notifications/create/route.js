import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendPushToUser } from "../../../../lib/pushSend";
import { sendExpoPushToUser } from "../../../../lib/pushSendExpo";

// Single place to create a notification, so the bell (real-time),
// push, and eventual email (batched, see app/api/cron/notification-digest)
// all come from one insert path rather than being created ad-hoc from
// multiple callers.

export async function POST(req) {
  try {
    const body = await req.json();
    const { user_id, actor_user_id, type, entity_id, title, notifBody, data } = body;

    if (!user_id || !type || !title) {
      return NextResponse.json({ error: "user_id, type, and title are required" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error: insertError } = await supabase.from("notifications").insert({
      user_id,
      actor_user_id: actor_user_id || null,
      type,
      entity_id: entity_id || null,
      title,
      body: notifBody || null,
      data: data || {},
    });

    if (insertError) throw insertError;

    // Push runs after the bell insert and is deliberately non-blocking
    // for the response - a push failure (dead subscription, network
    // issue) shouldn't turn into a 500 for what is otherwise a
    // successful notification creation. Whether this actually reaches
    // a device depends entirely on push_subscriptions having a row for
    // this user - that table only gets a row once someone explicitly
    // grants browser notification permission and subscribes, so it's
    // the opt-in gate; no separate preference column needed.
    sendPushToUser(supabase, user_id, {
      title,
      body: notifBody || "",
      url: data?.url || "/feed",
    }).catch((err) => {
      console.error("Push send error:", err);
    });

    // Mobile's own push channel, alongside web's above - see
    // lib/pushSendExpo.js for why this is a separate function rather
    // than a shared one (different delivery service, different token
    // format, different row shape entirely - expo_push_tokens, not
    // push_subscriptions). Same non-blocking, best-effort behavior.
    sendExpoPushToUser(supabase, user_id, {
      title,
      body: notifBody || "",
      url: data?.url || "/feed",
    }).catch((err) => {
      console.error("Expo push send error:", err);
    });

    // Email sending removed from here (Aug 2026) — was firing an email
    // instantly for every single notification, which would double up
    // with the new daily "anything still unseen?" digest cron
    // (app/api/cron/notification-digest) if both ran. The bell insert
    // above still happens immediately (so the in-app badge/dropdown
    // stays real-time); the email side moved entirely to that daily
    // cron instead, gated by the same email_reminders preference.

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("notification create error:", error);
    return NextResponse.json({ error: "Could not create notification" }, { status: 500 });
  }
}
