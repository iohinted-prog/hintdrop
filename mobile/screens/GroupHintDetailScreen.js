import { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, Image, TextInput, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Text from "../components/Text";
import { supabase } from "../lib/supabase";
import { colors, radii, spacing, shadow } from "../lib/theme";

const POT_MEMBER_COLORS = ["#ff8060", "#4e9e6e", "#5b8dd9", "#c97ad4", "#e8a23a", "#e05c7a", "#4db8b0", "#9b7fd4"];

function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Mobile mirror of app/components/GroupHintDetailModal.jsx - same
// states, same actions, same reasoning throughout (see that file's
// comments for the why). Opened from CircleScreen's pot tile and from
// App.js's deep-link handler for hintdrop.app/pot/{id} links (Universal
// Links / App Links already route those to the app when it's installed,
// same as /b/, /h/, /join/, /invite/ - this just adds the handling once
// routed here).
export default function GroupHintDetailScreen({ groupHintId, currentUserId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [gh, setGh] = useState(null);
  const [members, setMembers] = useState([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [recipientHints, setRecipientHints] = useState([]);
  const [editHintId, setEditHintId] = useState("");
  const [payingAmount, setPayingAmount] = useState("");
  const [paying, setPaying] = useState(false);
  const [pledgeAmount, setPledgeAmount] = useState("");
  const [pledging, setPledging] = useState(false);

  async function load() {
    const { data: ghData } = await supabase
      .from("group_hints")
      .select("*, hints(title, image_url, numeric_price, currency), profiles!group_hints_organiser_id_fkey(full_name)")
      .eq("id", groupHintId)
      .maybeSingle();
    if (!ghData) { setError("This pot couldn't be found."); setLoading(false); return; }
    setGh(ghData);
    const { data: memberData } = await supabase
      .from("group_hint_members")
      .select("id, user_id, status, pledged_amount, paid_amount, profiles(full_name, avatar_url)")
      .eq("group_hint_id", groupHintId);
    setMembers(memberData || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [groupHintId]);

  const isOrganiser = gh?.organiser_id === currentUserId;
  const myMember = members.find((m) => m.user_id === currentUserId);
  const requested = members.filter((m) => m.status === "requested");
  const activeMembers = members.filter((m) => m.status !== "requested" && m.status !== "declined");
  const inMembers = members.filter((m) => m.status === "in");
  const target = gh?.target_amount;
  const share = target ? target / (1 + activeMembers.length) : 0;
  const raised = inMembers.reduce((sum, m) => sum + (m.pledged_amount != null ? Number(m.pledged_amount) : share), 0);
  const pct = target ? Math.min(100, Math.round((raised / target) * 100)) : 0;
  const fmt = (n) => new Intl.NumberFormat("en-GB", { style: "currency", currency: gh?.hints?.currency || "GBP" }).format(n);
  const isPastDeadline = gh?.deadline_date && new Date(gh.deadline_date) < new Date(new Date().toDateString());

  async function respond(action, amount) {
    if (!myMember) return;
    const status = action === "accept" ? "in" : "declined";
    await supabase.from("group_hint_members").update(action === "accept" ? { status, pledged_amount: amount } : { status }).eq("id", myMember.id);
    await load();
  }

  async function joinCommit(amount) {
    if (!myMember) return;
    await supabase.from("group_hint_members").update({ status: "in", pledged_amount: amount }).eq("id", myMember.id);
    await load();
  }

  function leavePot() {
    if (!myMember) return;
    Alert.alert("Leave this pot?", "You can be invited or request to join again later.", [
      { text: "Cancel", style: "cancel" },
      { text: "Leave", style: "destructive", onPress: async () => { await supabase.from("group_hint_members").delete().eq("id", myMember.id); onClose(); } },
    ]);
  }

  async function markPaid() {
    if (!myMember || paying) return;
    setPaying(true);
    await supabase.from("group_hint_members").update({ paid_amount: parseFloat(payingAmount) || 0 }).eq("id", myMember.id);
    await load();
    setPaying(false);
  }

  async function approveRequest(memberId) {
    await supabase.from("group_hint_members").update({ status: "joined" }).eq("id", memberId);
    await load();
  }

  async function declineRequest(memberId) {
    await supabase.from("group_hint_members").update({ status: "declined" }).eq("id", memberId);
    await load();
  }

  async function startEdit() {
    setEditTitle(gh.title || gh.hints?.title || "");
    setEditTarget(String(gh.target_amount || ""));
    setEditDeadline(gh.deadline_date || "");
    setEditHintId(gh.hint_id);
    const { data } = await supabase.from("hints").select("id, title, image_url").eq("user_id", gh.recipient_user_id);
    setRecipientHints(data || []);
    setEditing(true);
  }

  async function saveEdit() {
    await supabase.from("group_hints").update({
      hint_id: editHintId,
      target_amount: Number(editTarget) || gh.target_amount,
      title: editTitle || null,
      deadline_date: editDeadline || null,
    }).eq("id", gh.id);
    setEditing(false);
    await load();
  }

  function deletePot() {
    Alert.alert("Delete this pot?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          await supabase.from("group_hint_members").delete().eq("group_hint_id", gh.id);
          await supabase.from("group_hints").delete().eq("id", gh.id);
          onClose();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Group gift pot</Text>
        <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
          <Text style={styles.closeButtonText}>✕</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.coral} style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={styles.emptyText}>{error}</Text>
      ) : editing ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionLabel}>Which item</Text>
          {recipientHints.map((h) => (
            <Pressable key={h.id} onPress={() => setEditHintId(h.id)} style={[styles.hintPickRow, editHintId === h.id && styles.hintPickRowActive]}>
              {h.image_url ? <Image source={{ uri: h.image_url }} style={styles.hintPickImage} /> : <View style={styles.hintPickImagePlaceholder} />}
              <Text style={styles.hintPickTitle} numberOfLines={1}>{h.title}</Text>
            </Pressable>
          ))}
          <Text style={styles.sectionLabel}>Title</Text>
          <TextInput value={editTitle} onChangeText={setEditTitle} placeholder={gh.hints?.title} style={styles.input} />
          <Text style={styles.sectionLabel}>Target amount</Text>
          <TextInput value={editTarget} onChangeText={setEditTarget} keyboardType="decimal-pad" style={styles.input} />
          <Text style={styles.sectionLabel}>Deadline (YYYY-MM-DD)</Text>
          <TextInput value={editDeadline} onChangeText={setEditDeadline} placeholder="No deadline" style={styles.input} />
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <Pressable onPress={() => setEditing(false)} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={saveEdit} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Save changes</Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {isPastDeadline && (
            <View style={styles.pastDeadlineBanner}>
              <Text style={styles.pastDeadlineText}>This pot's deadline has passed - no further pledges or payments.</Text>
            </View>
          )}

          <View style={styles.headRow}>
            {gh.hints?.image_url ? <Image source={{ uri: gh.hints.image_url }} style={styles.mainImage} /> : null}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.mainTitle} numberOfLines={2}>{gh.title || gh.hints?.title}</Text>
              <Text style={styles.organiserText}>Organised by {gh.profiles?.full_name}</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {fmt(raised)} of {target ? fmt(target) : "—"} · {fmt(share)} each
            {gh.deadline_date ? ` · by ${new Date(gh.deadline_date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""}
          </Text>

          <Text style={styles.sectionLabel}>Who's in</Text>
          {activeMembers.map((m, i) => (
            <View key={m.id} style={styles.memberRow}>
              {m.profiles?.avatar_url ? (
                <Image source={{ uri: m.profiles.avatar_url }} style={[styles.memberAvatar, m.paid_amount != null && styles.memberAvatarPaid]} />
              ) : (
                <View style={[styles.memberAvatarFallback, { backgroundColor: POT_MEMBER_COLORS[i % POT_MEMBER_COLORS.length] }]}>
                  <Text style={styles.memberAvatarFallbackText}>{getInitials(m.profiles?.full_name)}</Text>
                </View>
              )}
              <Text style={styles.memberName} numberOfLines={1}>{m.profiles?.full_name}</Text>
              <Text style={styles.memberStatus}>
                {m.paid_amount != null ? "✓ Paid" : m.status === "in" ? "Pledged" : m.status === "joined" ? "Joined" : "Invited"}
              </Text>
            </View>
          ))}

          {isOrganiser && requested.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Requests to join</Text>
              {requested.map((m) => (
                <View key={m.id} style={styles.memberRow}>
                  <Text style={styles.memberName} numberOfLines={1}>{m.profiles?.full_name}</Text>
                  <Pressable onPress={() => approveRequest(m.id)} style={styles.approveButton}>
                    <Text style={styles.approveButtonText}>Approve</Text>
                  </Pressable>
                  <Pressable onPress={() => declineRequest(m.id)} style={styles.declineButton}>
                    <Text style={styles.declineButtonText}>Decline</Text>
                  </Pressable>
                </View>
              ))}
            </>
          )}

          {!isPastDeadline && myMember?.status === "invited" && (
            <View style={styles.actionRow}>
              <TextInput value={pledgeAmount} onChangeText={setPledgeAmount} placeholder={share.toFixed(2)} keyboardType="decimal-pad" style={styles.amountInput} />
              <Pressable disabled={pledging} onPress={async () => { setPledging(true); await respond("accept", parseFloat(pledgeAmount) || share); setPledging(false); }} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Pledge</Text>
              </Pressable>
              <Pressable onPress={() => respond("decline")} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Decline</Text>
              </Pressable>
            </View>
          )}

          {!isPastDeadline && myMember?.status === "joined" && (
            <View style={styles.actionRow}>
              <TextInput value={pledgeAmount} onChangeText={setPledgeAmount} placeholder={share.toFixed(2)} keyboardType="decimal-pad" style={styles.amountInput} />
              <Pressable disabled={pledging} onPress={async () => { setPledging(true); await joinCommit(parseFloat(pledgeAmount) || share); setPledging(false); }} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Commit {fmt(share)}</Text>
              </Pressable>
              <Pressable onPress={leavePot} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Leave</Text>
              </Pressable>
            </View>
          )}

          {!isPastDeadline && myMember?.status === "in" && myMember.paid_amount == null && (
            <View style={styles.actionRow}>
              <TextInput value={payingAmount} onChangeText={setPayingAmount} placeholder={String(myMember.pledged_amount ?? share)} keyboardType="decimal-pad" style={styles.amountInput} />
              <Pressable disabled={paying} onPress={markPaid} style={styles.payButton}>
                <Text style={styles.primaryButtonText}>Mark as paid</Text>
              </Pressable>
            </View>
          )}
          {myMember?.status === "in" && myMember.paid_amount != null && (
            <View style={styles.paidBadge}>
              <Text style={styles.paidBadgeText}>✓ You've paid {fmt(myMember.paid_amount)}</Text>
            </View>
          )}

          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            {isOrganiser && !isPastDeadline && (
              <Pressable onPress={startEdit} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Edit</Text>
              </Pressable>
            )}
            {isOrganiser && isPastDeadline && (
              <Pressable onPress={deletePot} style={styles.deleteButton}>
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card },
  headerTitle: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  closeButton: { height: 34, width: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  closeButtonText: { fontSize: 14, color: colors.textMuted },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 12 },
  emptyText: { textAlign: "center", color: colors.textMuted, marginTop: 40 },
  pastDeadlineBanner: { backgroundColor: "#f1ece7", borderRadius: 14, padding: 12 },
  pastDeadlineText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, textAlign: "center" },
  headRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  mainImage: { width: 56, height: 56, borderRadius: 14 },
  mainTitle: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  organiserText: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: "#f1e3db", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4, backgroundColor: colors.coral },
  progressText: { fontSize: 12, color: colors.textSecondary, marginTop: -4 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  memberAvatar: { width: 32, height: 32, borderRadius: 16 },
  memberAvatarPaid: { borderWidth: 2, borderColor: colors.successText },
  memberAvatarFallback: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  memberAvatarFallbackText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  memberName: { flex: 1, fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  memberStatus: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
  approveButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill, backgroundColor: colors.coral },
  approveButtonText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  declineButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border },
  declineButtonText: { fontSize: 11, fontWeight: "700", color: colors.textMuted },
  actionRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  amountInput: { width: 84, height: 44, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, fontSize: 13, color: colors.textPrimary, backgroundColor: colors.card },
  primaryButton: { flex: 1, height: 44, borderRadius: radii.pill, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  payButton: { flex: 1, height: 44, borderRadius: radii.pill, backgroundColor: colors.successText, alignItems: "center", justifyContent: "center" },
  secondaryButton: { flex: 1, height: 44, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  secondaryButtonText: { fontSize: 13, fontWeight: "700", color: colors.textSecondary },
  deleteButton: { flex: 1, height: 44, borderRadius: radii.pill, borderWidth: 1, borderColor: "#f0c7bf", alignItems: "center", justifyContent: "center" },
  deleteButtonText: { fontSize: 13, fontWeight: "700", color: colors.errorText },
  paidBadge: { backgroundColor: colors.successBg, borderRadius: radii.pill, paddingVertical: 10, alignItems: "center" },
  paidBadgeText: { fontSize: 12, fontWeight: "700", color: colors.successText },
  input: { height: 44, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, fontSize: 13, color: colors.textPrimary, backgroundColor: colors.card },
  hintPickRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 8, borderRadius: 14, borderWidth: 1, borderColor: "transparent" },
  hintPickRowActive: { borderColor: colors.coral, backgroundColor: "#fff1ea" },
  hintPickImage: { width: 40, height: 40, borderRadius: 10 },
  hintPickImagePlaceholder: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#f1e3db" },
  hintPickTitle: { flex: 1, fontSize: 13, fontWeight: "600", color: colors.textPrimary },
});
