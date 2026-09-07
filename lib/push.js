"use client";

// Client-side helpers for subscribing/unsubscribing a device to web
// push. Kept separate from the service worker itself (public/sw-push.js)
// and from the actual sending logic (lib/pushSend.js, server-only -
// that one needs the VAPID private key, which must never reach the
// client bundle).

export function isPushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Registers the push service worker and subscribes this device,
// storing the subscription server-side against the current user.
// Returns { ok: true } on success, or { ok: false, reason } - reason
// is "unsupported" (browser can't do push), "denied" (user said no
// to the permission prompt), or "error" (something else went wrong,
// check console).
export async function subscribeToPush(supabase, userId) {
  if (!isPushSupported()) return { ok: false, reason: "unsupported" };

  try {
    const registration = await navigator.serviceWorker.register("/sw-push.js");
    await navigator.serviceWorker.ready;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, reason: "denied" };

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      console.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set");
      return { ok: false, reason: "error" };
    }

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    const json = subscription.toJSON();
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        user_agent: navigator.userAgent,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    );

    if (error) {
      console.error("Failed to store push subscription:", error);
      return { ok: false, reason: "error" };
    }

    return { ok: true };
  } catch (err) {
    console.error("Push subscription failed:", err);
    return { ok: false, reason: "error" };
  }
}

// Unsubscribes this device and removes the stored row. Safe to call
// even if the device was never subscribed.
export async function unsubscribeFromPush(supabase) {
  if (!isPushSupported()) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration("/sw-push.js");
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  } catch (err) {
    console.error("Push unsubscribe failed:", err);
  }
}

// Checks whether this device currently has an active push
// subscription, for reflecting the correct toggle state in settings.
export async function getPushSubscriptionStatus() {
  if (!isPushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";

  try {
    const registration = await navigator.serviceWorker.getRegistration("/sw-push.js");
    const subscription = await registration?.pushManager.getSubscription();
    return subscription ? "subscribed" : "not-subscribed";
  } catch {
    return "not-subscribed";
  }
}
