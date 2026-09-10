import { useCallback, useEffect, useState } from "react";
import { View, Modal, Pressable, ScrollView, ActivityIndicator, Image, StyleSheet } from "react-native";
import Text from "./Text";
import { supabase } from "../lib/supabase";
import { resolveAvatarColor } from "../lib/avatarColor";
import { colors, radii, spacing, shadow } from "../lib/theme";

// Mirrors the notification dropdown in app/components/AppShell.jsx.
// Built against the real web markup for each notification type
// (collab_request, collab_accepted, birthday_reminder, generic
// reaction/comment) plus pending circle/contact invites, which share
// the same dropdown on web.
//
// Explicitly deferred, not silently dropped:
// - group_hint_response notifications and circle_notifications
//   ("Keep going" / "Cancel circle") - both belong to the group-
//   gifting system (GroupHintModal), which was already deferred when
//   building the Profile screen. Rather than half-wire actions into
//   a feature that doesn't exist here yet, these notification types
//   are simply not fetched - if they exist in the database from web-
//   side activity, they won't show up here until group gifting
//   itself is ported.
// - Group message/conversation unread counts - mobile has no
//   messaging system at all yet.
// - collab_accepted's "Start adding hints" button doesn't deep-link
//   into the Hints tab's specific board (no shared cross-tab
//   navigation context exists yet) - marks read and closes the panel
//   with a note instead of a broken or half-working navigation.

function NotifAvatar({ name, avatarUrl, avatarColor, userId, size = 36 }) {
  const c = resolveAvatarColor({ avatarColor, id: userId });
  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center", backgroundColor: c.to }}>
      <Text style={{ color: "#fff", fontSize: size * 0.32, fontWeight: "700" }}>{(name || "?")[0]?.toUpperCase()}</Text>
    </View>
  );
}

export default function NotificationsPanel({ visible, onClose, currentUserId, onCountChange }) {
  const [invites, setInvites] = useState([]);
  const [activityNotifs, setActivityNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteActionId, setInviteActionId] = useState(null);
  const [collabActionId, setCollabActionId] = useState(null);

  const load = useCallback(async () => {
    if (!currentUserId) return;
    const userEmail = (await supabase.auth.getUser()).data.user?.email?.toLowerCase() || "";
    const [{ data: circleInvites }, { data: contactInvites }, { data: notifData }] = await Promise.all([
      supabase.from("circle_invites").select("id, invite_token, invite_name, user_id, created_at").or(`invited_user_id.eq.${currentUserId},invite_email_normalized.eq.${userEmail}`).eq("status", "pending"),
      supabase.from("contact_invites").select("id, invite_name, inviter_user_id, created_at").or(`invited_user_id.eq.${currentUserId},invite_email.eq.${userEmail}`).eq("status", "pending"),
      supabase.from("notifications").select("*").eq("user_id", currentUserId).is("read_at", null).order("created_at", { ascending: false }).limit(20),
    ]);
    const all = [
      ...(circleInvites || []).map((i) => ({ ...i, source: "circle" })),
      ...(contactInvites || []).map((i) => ({ ...i, source: "contact" })),
    ];
    const ids = [...new Set(all.map((i) => (i.source === "circle" ? i.user_id : i.inviter_user_id)).filter(Boolean))];
    let profileMap = {};
    if (ids.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids);
      profileMap = (profiles || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
    }
    const merged = all.map((i) => ({ ...i, inviter: profileMap[i.source === "circle" ? i.user_id : i.inviter_user_id] || null }));
    setInvites(merged);
    // Only the notification types this screen actually knows how to
    // render/act on - see the deferred-features note at the top.
    const knownTypes = ["collab_request", "collab_accepted", "birthday_reminder"];
    const relevant = (notifData || []).filter((n) => knownTypes.includes(n.type) || n.type === "reaction" || n.type === "comment");
    setActivityNotifs(relevant);
    onCountChange?.(merged.length + relevant.length);
    setLoading(false);
  }, [currentUserId, onCountChange]);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      load();
    }
  }, [visible, load]);

  async function handleAcceptInvite(invite) {
    setInviteActionId(invite.id);
    try {
      if (invite.source === "contact") {
        await supabase.functions.invoke("accept-contact-invite", { body: { invite_id: invite.id } });
      } else {
        await supabase.functions.invoke("accept-circle-invite", { body: { token: invite.invite_token } });
      }
      await load();
    } finally {
      setInviteActionId(null);
    }
  }

  async function handleDeclineInvite(invite) {
    setInviteActionId(invite.id);
    try {
      if (invite.source === "contact") {
        await supabase.from("contact_invites").update({ status: "revoked" }).eq("id", invite.id);
      } else {
        await supabase.from("circle_invites").update({ status: "declined" }).eq("id", invite.id);
        supabase.functions.invoke("notify-circle-decline", { body: { invite_id: invite.id } }).catch(() => {});
      }
      await load();
    } finally {
      setInviteActionId(null);
    }
  }

  async function handleCollabAction(notif, decision) {
    setCollabActionId(notif.id);
    try {
      const boardId = notif.data?.board_id || notif.entity_id;
      const requesterId = notif.actor_user_id;
      if (decision === "accept") {
        await supabase.from("board_collaborators").update({ status: "accepted" }).eq("board_id", boardId).eq("user_id", requesterId);
        fetch("https://hintdrop.app/api/collab-notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "accepted", boardId, requesterId }),
        }).catch(() => {});
      } else {
        await supabase.from("board_collaborators").delete().eq("board_id", boardId).eq("user_id", requesterId);
      }
      await dismissNotif(notif);
    } finally {
      setCollabActionId(null);
    }
  }

  async function dismissNotif(notif) {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", notif.id);
    setActivityNotifs((prev) => prev.filter((n) => n.id !== notif.id));
    onCountChange?.((invites.length) + activityNotifs.length - 1);
  }

  const collabRequests = activityNotifs.filter((n) => n.type === "collab_request");
  const collabAccepted = activityNotifs.filter((n) => n.type === "collab_accepted");
  const birthdayReminders = activityNotifs.filter((n) => n.type === "birthday_reminder");
  const generic = activityNotifs.filter((n) => n.type === "reaction" || n.type === "comment");

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.panel} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>NOTIFICATIONS</Text>
            <Text style={styles.title}>Pending invites</Text>
          </View>

          <ScrollView style={styles.scroll}>
            {loading ? (
              <ActivityIndicator color={colors.coral} style={{ marginTop: 24 }} />
            ) : (
              <>
                {collabRequests.map((notif) => {
                  return (
                    <View key={notif.id} style={styles.collabRequestCard}>
                      <View style={styles.notifRow}>
                        <NotifAvatar name={notif.data?.actor_name} avatarUrl={notif.data?.actor_avatar_url} avatarColor={notif.data?.actor_avatar_color} userId={notif.actor_user_id} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.notifTitle} numberOfLines={1}>{notif.title}</Text>
                          {notif.body ? <Text style={styles.notifBody} numberOfLines={1}>{notif.body}</Text> : null}
                        </View>
                        <View style={styles.badgeOrange}><Text style={styles.badgeOrangeText}>Request</Text></View>
                      </View>
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                        <Pressable style={styles.approveButton} disabled={collabActionId === notif.id} onPress={() => handleCollabAction(notif, "accept")}>
                          <Text style={styles.approveButtonText}>{collabActionId === notif.id ? "..." : "Approve"}</Text>
                        </Pressable>
                        <Pressable style={styles.declineButton} disabled={collabActionId === notif.id} onPress={() => handleCollabAction(notif, "decline")}>
                          <Text style={styles.declineButtonText}>Decline</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}

                {collabAccepted.map((notif) => (
                  <View key={notif.id} style={styles.collabAcceptedCard}>
                    <View style={styles.notifRow}>
                      <NotifAvatar name={notif.data?.actor_name} avatarUrl={notif.data?.actor_avatar_url} avatarColor={notif.data?.actor_avatar_color} userId={notif.actor_user_id} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.notifTitle} numberOfLines={1}>{notif.title}</Text>
                        {notif.body ? <Text style={styles.notifBody} numberOfLines={1}>{notif.body}</Text> : null}
                      </View>
                      <View style={styles.badgeGreen}><Text style={styles.badgeGreenText}>Accepted</Text></View>
                    </View>
                    <Pressable style={styles.startAddingButton} onPress={() => dismissNotif(notif)}>
                      <Text style={styles.approveButtonText}>Go to the Hints tab to add hints</Text>
                    </Pressable>
                  </View>
                ))}

                {birthdayReminders.map((notif) => (
                  <View key={notif.id} style={styles.plainCard}>
                    <View style={styles.notifRow}>
                      <NotifAvatar name={notif.data?.actor_name} avatarUrl={notif.data?.actor_avatar_url} avatarColor={notif.data?.actor_avatar_color} userId={notif.actor_user_id} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.notifTitle} numberOfLines={1}>{notif.title}</Text>
                        {notif.body ? <Text style={styles.notifBody}>{notif.body}</Text> : null}
                      </View>
                      <Text style={{ fontSize: 14 }}>🎂</Text>
                    </View>
                    <Pressable onPress={() => dismissNotif(notif)}><Text style={styles.dismissText}>Dismiss</Text></Pressable>
                  </View>
                ))}

                {generic.map((notif) => (
                  <View key={notif.id} style={styles.plainCard}>
                    <View style={styles.notifRow}>
                      <NotifAvatar name={notif.data?.actor_name} avatarUrl={notif.data?.actor_avatar_url} avatarColor={notif.data?.actor_avatar_color} userId={notif.actor_user_id} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.notifTitle} numberOfLines={1}>{notif.title}</Text>
                        {notif.body ? <Text style={styles.notifBody} numberOfLines={1}>{notif.body}</Text> : null}
                      </View>
                      <View style={notif.type === "reaction" ? styles.badgeOrange : styles.badgeBlue}>
                        <Text style={notif.type === "reaction" ? styles.badgeOrangeText : styles.badgeBlueText}>{notif.type === "reaction" ? "React" : "Comment"}</Text>
                      </View>
                    </View>
                    <Pressable onPress={() => dismissNotif(notif)}><Text style={styles.dismissText}>Mark as read</Text></Pressable>
                  </View>
                ))}

                {invites.map((invite) => (
                  <View key={invite.id} style={invite.source === "contact" ? styles.plainCard : styles.circleInviteCard}>
                    <View style={styles.notifRow}>
                      <NotifAvatar name={invite.inviter?.full_name || invite.invite_name} avatarUrl={invite.inviter?.avatar_url} userId={invite.user_id || invite.inviter_user_id} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.notifTitle} numberOfLines={1}>{invite.inviter?.full_name || invite.invite_name || "Someone"}</Text>
                        <Text style={styles.notifBody}>{invite.source === "contact" ? "wants to connect" : "invited you to a circle"}</Text>
                      </View>
                      <View style={invite.source === "contact" ? styles.badgeSage : styles.badgeDark}>
                        <Text style={invite.source === "contact" ? styles.badgeSageText : styles.badgeDarkText}>{invite.source === "contact" ? "Contact" : "Circle"}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                      <Pressable style={styles.approveButton} disabled={inviteActionId === invite.id} onPress={() => handleAcceptInvite(invite)}>
                        <Text style={styles.approveButtonText}>{inviteActionId === invite.id ? "..." : "Accept"}</Text>
                      </Pressable>
                      <Pressable style={styles.declineButton} disabled={inviteActionId === invite.id} onPress={() => handleDeclineInvite(invite)}>
                        <Text style={styles.declineButtonText}>Decline</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}

                {invites.length === 0 && activityNotifs.length === 0 ? (
                  <Text style={styles.emptyText}>No pending invites</Text>
                ) : null}
              </>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.15)" },
  panel: {
    position: "absolute",
    top: 90,
    right: 16,
    width: 320,
    maxWidth: "92%",
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: "#efdcd2",
    backgroundColor: colors.bg,
    overflow: "hidden",
    ...shadow,
    shadowOpacity: 0.15,
  },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#f0e4dd" },
  eyebrow: { fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.6 },
  title: { fontSize: 17, fontWeight: "600", color: colors.textPrimary, marginTop: 2 },
  scroll: { maxHeight: 420, padding: 16 },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: "center", paddingVertical: 16 },
  notifRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  notifTitle: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  notifBody: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  plainCard: { borderRadius: radii.lg, borderWidth: 1, borderColor: "#e6ddd7", backgroundColor: colors.card, padding: 14, marginBottom: 10 },
  collabRequestCard: { borderRadius: radii.lg, borderWidth: 1, borderColor: "#ffd8c9", backgroundColor: "#fff4ee", padding: 14, marginBottom: 10 },
  collabAcceptedCard: { borderRadius: radii.lg, borderWidth: 1, borderColor: colors.successBorder, backgroundColor: colors.successBg, padding: 14, marginBottom: 10 },
  circleInviteCard: { borderRadius: radii.lg, borderWidth: 1, borderColor: "#dce8d8", backgroundColor: "#f7fbf5", padding: 14, marginBottom: 10 },
  approveButton: { flex: 1, height: 34, borderRadius: radii.pill, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center" },
  approveButtonText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  declineButton: { flex: 1, height: 34, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  declineButtonText: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
  startAddingButton: { marginTop: 10, height: 34, borderRadius: radii.pill, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  dismissText: { fontSize: 11, fontWeight: "600", color: colors.textMuted, marginTop: 8 },
  badgeOrange: { backgroundColor: "#ffe2d3", borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 3 },
  badgeOrangeText: { fontSize: 10, fontWeight: "700", color: "#c9633f" },
  badgeGreen: { backgroundColor: colors.successBorder, borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 3 },
  badgeGreenText: { fontSize: 10, fontWeight: "700", color: colors.successText },
  badgeBlue: { backgroundColor: "#eef4ff", borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 3 },
  badgeBlueText: { fontSize: 10, fontWeight: "700", color: "#5676b3" },
  badgeSage: { backgroundColor: "#f0f7ee", borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 3 },
  badgeSageText: { fontSize: 10, fontWeight: "700", color: "#4e684d" },
  badgeDark: { backgroundColor: "#2f3b2d", borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 3 },
  badgeDarkText: { fontSize: 10, fontWeight: "700", color: "#fff" },
});
