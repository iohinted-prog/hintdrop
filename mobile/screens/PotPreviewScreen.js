import { useEffect, useState } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Text from "../components/Text";
import { supabase } from "../lib/supabase";
import { colors, radii, shadow } from "../lib/theme";
import GroupHintDetailScreen from "./GroupHintDetailScreen";

// Mobile mirror of web's PotPageClient.jsx - the landing screen for a
// pot's share link when the tapper doesn't already have full access.
// Real gap this closes: App.js's deep-link handler previously routed
// every /pot/{id} link straight to GroupHintDetailScreen, which
// assumes full member access via ordinary RLS - a non-member tapping
// a shared link got a blank/broken screen instead of any proper
// landing experience, unlike web which has always had this.
//
// One real architectural difference from web, not just a smaller
// port: App.js's handleIncomingUrl already bails out entirely if
// !user?.id before any link (including this one) is ever processed,
// so the "signed out visitor taps a pot link" case web's PotPageClient
// handles just doesn't reach this screen the same way on mobile - by
// the time anything here runs, there's already a signed-in user.
// This screen focuses on the states that are actually reachable here:
// signed in with no relationship yet -> Request to join; already
// requested -> waiting; declined; not found; already has full access
// -> hands off to GroupHintDetailScreen exactly like web does.
export default function PotPreviewScreen({ groupHintId, currentUserId, currentUserName, onClose }) {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [requesting, setRequesting] = useState(false);

  async function load() {
    const { data, error } = await supabase.rpc("get_pot_public_info", { pot_id: groupHintId });
    if (error || !data?.length) {
      setNotFound(true);
    } else {
      setInfo(data[0]);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [groupHintId]);

  async function requestToJoin() {
    if (!currentUserId || requesting) return;
    setRequesting(true);
    const { data: newMember } = await supabase
      .from("group_hint_members")
      .insert({ group_hint_id: groupHintId, user_id: currentUserId, status: "requested" })
      .select("id")
      .maybeSingle();
    // Same notification as web's requestToJoin - surfaces to the
    // organiser as a real, actionable notification (approve/decline
    // right there) rather than only being visible if they happen to
    // open the pot's own detail view. Deliberately generic wording,
    // same non-spoiler reasoning as everywhere else for this feature.
    if (info?.organiser_id && newMember?.id) {
      const { data: requesterProfile } = await supabase.from("profiles").select("full_name, avatar_url, avatar_color").eq("id", currentUserId).maybeSingle();
      const requesterName = requesterProfile?.full_name || currentUserName || "Someone";
      await supabase.from("notifications").insert({
        user_id: info.organiser_id,
        actor_user_id: currentUserId,
        type: "group_hint_request",
        title: `${requesterName} wants to join your pot`,
        body: "Approve to let them see it and chip in.",
        data: {
          actor_name: requesterName,
          actor_avatar_url: requesterProfile?.avatar_url || null,
          actor_avatar_color: requesterProfile?.avatar_color || null,
          group_hint_id: groupHintId,
          member_id: newMember.id,
        },
      });
    }
    await load();
    setRequesting(false);
  }

  const hasFullAccess = info && (info.organiser_id === currentUserId || info.requester_status === "joined" || info.requester_status === "in");

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <ActivityIndicator color={colors.coral} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (hasFullAccess) {
    return <GroupHintDetailScreen groupHintId={groupHintId} currentUserId={currentUserId} onClose={onClose} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.headerBack} hitSlop={8}>
          <Text style={styles.headerBackText}>✕</Text>
        </Pressable>
      </View>
      <View style={styles.centerWrap}>
        <View style={styles.card}>
          {notFound ? (
            <Text style={styles.bodyText}>This pot doesn't exist, or has been removed.</Text>
          ) : info?.requester_status === "requested" ? (
            <>
              <Text style={styles.titleText}>Request sent</Text>
              <Text style={styles.bodyText}>Waiting for {info.organiser_name} to approve you. You'll be able to see the full details and pledge once they do.</Text>
            </>
          ) : info?.requester_status === "declined" ? (
            <Text style={styles.bodyText}>Your request to join this pot wasn't approved.</Text>
          ) : (
            <>
              <Text style={styles.titleText}>{info?.organiser_name} is organising a group gift</Text>
              <Text style={styles.bodyText}>
                {info?.in_count} of {info?.member_count} people have already pledged
                {info?.target_amount ? ` toward a target of ${new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(info.target_amount)}` : ""}.
                {info?.deadline_date ? ` The deadline is ${new Date(info.deadline_date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}.` : ""}
              </Text>
              <Pressable disabled={requesting} onPress={requestToJoin} style={styles.requestButton}>
                <Text style={styles.requestButtonText}>{requesting ? "Requesting..." : "Request to join"}</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8 },
  headerBack: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.card },
  headerBackText: { fontSize: 15, color: colors.textMuted },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  card: { width: "100%", maxWidth: 420, borderRadius: radii.card, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 24, alignItems: "center", ...shadow },
  titleText: { fontSize: 18, fontWeight: "700", color: colors.textPrimary, textAlign: "center", marginBottom: 8 },
  bodyText: { fontSize: 13, color: colors.textMuted, textAlign: "center", lineHeight: 19 },
  requestButton: { marginTop: 20, height: 44, width: "100%", borderRadius: radii.pill, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center" },
  requestButtonText: { fontSize: 13, fontWeight: "700", color: "#fff" },
});
