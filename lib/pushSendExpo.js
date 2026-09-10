// Server-only, parallel to pushSend.js's web-push implementation -
// deliberately a separate module rather than extending pushSend.js,
// since these are genuinely different delivery mechanisms (VAPID/
// Web Push API vs. Expo's push service, which then relays to APNs/
// FCM) with different token formats and no shared row shape. Kept
// symmetrical with pushSend.js's own structure (same function
// signature, same signed-supabase-admin-client parameter, same
// prune-dead-subscriptions behavior) so a caller sending to both
// (see app/api/notifications/create/route.js) doesn't need two
// different calling conventions.
//
// No SDK dependency (expo-server-sdk) - Expo's push API is a plain
// HTTPS POST with a JSON body, and pulling in a whole SDK for a
// single fetch call isn't worth it here.

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export async function sendExpoPushToUser(supabaseAdmin, userId, { title, body, url }) {
  const { data: tokens, error } = await supabaseAdmin
    .from("expo_push_tokens")
    .select("id, token")
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to load expo push tokens:", error);
    return { sent: 0, failed: 0 };
  }
  if (!tokens || tokens.length === 0) return { sent: 0, failed: 0 };

  const messages = tokens.map((t) => ({
    to: t.token,
    title,
    body,
    data: { url: url || "/feed" },
    sound: "default",
  }));

  let sent = 0;
  let failed = 0;
  const deadTokens = [];

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
    const result = await response.json();
    const tickets = Array.isArray(result?.data) ? result.data : [];

    tickets.forEach((ticket, i) => {
      if (ticket.status === "ok") {
        sent += 1;
      } else {
        failed += 1;
        // DeviceNotRegistered is Expo's equivalent of web-push's
        // 410/404 - the app was uninstalled or the token is stale.
        if (ticket.details?.error === "DeviceNotRegistered") {
          deadTokens.push(tokens[i].id);
        }
      }
    });
  } catch (err) {
    console.error("Expo push send error:", err);
    return { sent, failed: messages.length };
  }

  if (deadTokens.length) {
    await supabaseAdmin.from("expo_push_tokens").delete().in("id", deadTokens);
  }

  return { sent, failed };
}
