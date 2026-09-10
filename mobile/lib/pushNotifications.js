import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { supabase } from "./supabase";

// Mobile's registration half of the push system - see lib/
// pushSendExpo.js (web repo) for the sending half. Genuinely
// necessary, not a nice-to-have: web already has a working push
// pipeline (VAPID/push_subscriptions), but nothing on mobile ever
// requested permission or saved a token anywhere, so every push web
// already sends (reactions, comments, collab requests/accepted) was
// silently going nowhere for a mobile user no matter how the backend
// was wired - the backend side alone doesn't help without a device
// token to send to.

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(userId) {
  if (!userId) return;

  // Push tokens are meaningless on a simulator/emulator - there's no
  // real APNs/FCM registration to get. Skip quietly rather than
  // surfacing a permission prompt or error for a case that can never
  // succeed.
  if (!Device.isDevice) return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return;

    await supabase.from("expo_push_tokens").upsert(
      {
        user_id: userId,
        token,
        device_name: Device.deviceName || null,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "token" }
    );
  } catch (err) {
    console.error("Push token registration error:", err);
  }
}
