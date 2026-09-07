import webpush from "web-push";

// Server-only - imports web-push, which needs the VAPID private key.
// Never import this from a client component or route that ships to
// the browser.

let configured = false;
function ensureConfigured() {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    console.error("VAPID keys not configured - push notifications disabled");
    return false;
  }
  webpush.setVapidDetails("mailto:hello@hintdrop.app", publicKey, privateKey);
  configured = true;
  return true;
}

// Sends a push to every device the user has subscribed. Prunes any
// subscription the push service reports as gone (410/404 - the user
// uninstalled, cleared data, or the subscription expired) rather than
// leaving dead rows to keep failing on every future send. Uses the
// service role client (passed in, so this stays testable and doesn't
// import a specific client setup) since sending happens server-side
// for any user, not just the currently authenticated one.
export async function sendPushToUser(supabaseAdmin, userId, { title, body, url }) {
  if (!ensureConfigured()) return { sent: 0, failed: 0 };

  const { data: subscriptions, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to load push subscriptions:", error);
    return { sent: 0, failed: 0 };
  }
  if (!subscriptions || subscriptions.length === 0) return { sent: 0, failed: 0 };

  const payload = JSON.stringify({ title, body, url });
  let sent = 0;
  let failed = 0;
  const deadIds = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );
        sent += 1;
      } catch (err) {
        failed += 1;
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          deadIds.push(sub.id);
        } else {
          console.error("Push send failed for subscription", sub.id, err?.message);
        }
      }
    })
  );

  if (deadIds.length > 0) {
    await supabaseAdmin.from("push_subscriptions").delete().in("id", deadIds);
  }

  return { sent, failed };
}
