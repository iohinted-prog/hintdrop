import { useEffect, useState } from "react";
import { Modal, View, StyleSheet, Pressable, Image, ScrollView, ActivityIndicator, TextInput } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Text from "./Text";
import { supabase } from "../lib/supabase";
import { resolveAvatarColor } from "../lib/avatarColor";
import { colors, radii, shadow } from "../lib/theme";

// Mirrors app/components/GroupHintModal.jsx exactly - same find-or-
// create-group-conversation matching (by exact participant set, so
// the same group of people always lands in the same thread
// regardless of who organises), same group_hints/group_hint_members
// insert shape, same conversation_hints pin, same system-message
// announcement in the thread itself (web's own code comment confirms
// this - not a feed notification - is the real notification surface
// for this feature), same /api/group-hint-notify call for the email
// nudge (confirmed needs no auth fix, service-role client, same as
// several other routes already checked this session).

function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function GHAvatar({ name, avatarUrl, userId, size = 36 }) {
  const c = resolveAvatarColor({ id: userId });
  if (avatarUrl) return <Image source={{ uri: avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center", backgroundColor: c.to }}>
      <Text style={{ color: "#fff", fontSize: size * 0.32, fontWeight: "700" }}>{getInitials(name)}</Text>
    </View>
  );
}

async function findOrCreateGroupConversation(currentUserId, participantIds) {
  const target = [...new Set(participantIds)].sort();
  const { data: myMemberships } = await supabase.from("conversation_members").select("conversation_id").eq("user_id", currentUserId);
  const candidateIds = (myMemberships || []).map((m) => m.conversation_id);

  if (candidateIds.length) {
    const { data: allMembers } = await supabase.from("conversation_members").select("conversation_id, user_id").in("conversation_id", candidateIds);
    const byConv = {};
    (allMembers || []).forEach((m) => { (byConv[m.conversation_id] ||= []).push(m.user_id); });
    for (const [convId, memberIds] of Object.entries(byConv)) {
      const sorted = [...new Set(memberIds)].sort();
      if (sorted.length === target.length && sorted.every((v, i) => v === target[i])) {
        return { id: convId, isNew: false };
      }
    }
  }

  const { data: newConv, error: convErr } = await supabase.from("conversations").insert({ type: target.length > 2 ? "group" : "direct" }).select("id").single();
  if (convErr || !newConv) throw convErr || new Error("Failed to create conversation");
  const { error: memErr } = await supabase.from("conversation_members").insert(target.map((uid) => ({ conversation_id: newConv.id, user_id: uid })));
  if (memErr) throw memErr;
  return { id: newConv.id, isNew: true };
}

export default function GroupHintModal({ hint, recipientUserId, recipientName, currentUserId, onClose, onSent }) {
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [groupHint, setGroupHint] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  // Only asked when the hint has no price - matches web's
  // GroupHintModal.jsx exactly, same reasoning: the pot's target
  // otherwise comes straight from the hint itself, no extra step.
  const [manualTargetAmount, setManualTargetAmount] = useState("");
  // Organiser has to explicitly decide pot vs. plain conversation before
  // anything else - not something that happens silently just by opening
  // this modal. Matches web's GroupHintModal.jsx exactly.
  const [potConfirmed, setPotConfirmed] = useState(false);
  const [chatOnly, setChatOnly] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState("");
  const [recipientEvents, setRecipientEvents] = useState([]);
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [wantsClaim, setWantsClaim] = useState(true);

  const hintHasPrice = hint.numeric_price > 0;

  useEffect(() => {
    if (!hint?.id) return;
    async function load() {
      const { data: contactsData } = await supabase.from("contact_public_state").select("*").eq("owner_user_id", currentUserId);
      setContacts((contactsData || []).filter((c) => c.profile_id && c.profile_id !== recipientUserId));

      const { data: existing } = await supabase
        .from("group_hints")
        .select("*, group_hint_members(id, user_id, status, profiles(full_name, avatar_url))")
        .eq("hint_id", hint.id)
        .eq("organiser_id", currentUserId)
        .maybeSingle();
      if (existing) {
        setGroupHint(existing);
        setMembers(existing.group_hint_members || []);
        setDeadlineDate(existing.deadline_date || "");
      }

      // Only the recipient's own SHARED events are readable here (RLS
      // gates on is_shared=true) - matches web exactly, an organiser
      // never sees anything private.
      const today = new Date().toISOString().slice(0, 10);
      const { data: events } = await supabase
        .from("calendar_events")
        .select("id, title, event_date")
        .eq("user_id", recipientUserId)
        .eq("is_shared", true)
        .gte("event_date", today)
        .order("event_date", { ascending: true })
        .limit(3);
      setRecipientEvents(events || []);

      const { data: claims } = await supabase.from("hint_claims").select("id").eq("hint_id", hint.id).eq("claimed_by", currentUserId);
      setAlreadyClaimed((claims || []).length > 0);

      setLoading(false);
    }
    load();
  }, [hint?.id, currentUserId, recipientUserId]);

  function toggleContact(profileId) {
    setSelected((prev) => (prev.includes(profileId) ? prev.filter((id) => id !== profileId) : [...prev, profileId]));
  }

  async function handleSend() {
    if (!selected.length || sending) return;
    if (!chatOnly && !groupHint && !hintHasPrice && !(Number(manualTargetAmount) > 0)) {
      setSendError("Enter a target amount for the pot first - this hint has no price to split automatically.");
      return;
    }
    setSending(true);
    setSendError("");
    try {
      let gh = groupHint;
      if (!gh) {
        const { data: newGh, error: ghErr } = await supabase
          .from("group_hints")
          .insert({
            hint_id: hint.id,
            organiser_id: currentUserId,
            recipient_user_id: recipientUserId,
            // A plain conversation carries no money tracking at all - no
            // target, no deadline, regardless of whether the hint itself
            // has a price. Matches web exactly.
            target_amount: chatOnly ? null : (hintHasPrice ? hint.numeric_price : Number(manualTargetAmount)),
            deadline_date: chatOnly ? null : (deadlineDate || null),
          })
          .select()
          .maybeSingle();
        if (ghErr || !newGh) {
          setSendError("Failed to create group: " + (ghErr?.message || "unknown error"));
          setSending(false);
          return;
        }
        gh = newGh;
      }

      const { error: memErr } = await supabase.from("group_hint_members").insert(selected.map((uid) => ({ group_hint_id: gh.id, user_id: uid, status: "invited" })));
      if (memErr) console.error("members error:", memErr?.message);

      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", currentUserId).maybeSingle();
      const organiserName = profile?.full_name || "Someone";

      const { data: newMembers } = await supabase.from("group_hint_members").select("id, user_id, status, profiles(full_name, avatar_url)").eq("group_hint_id", gh.id);

      const participantIds = [currentUserId, ...(newMembers || []).map((m) => m.user_id)];
      const { id: convId, isNew: isNewConv } = await findOrCreateGroupConversation(currentUserId, participantIds);

      await supabase.from("conversation_hints").upsert({ conversation_id: convId, group_hint_id: gh.id }, { onConflict: "conversation_id,group_hint_id" });

      const newlyInvitedNames = selected.map((uid) => contacts.find((c) => c.profile_id === uid)?.name).filter(Boolean);
      const inviteBody = chatOnly
        ? `${organiserName} started a conversation about ${hint.title || "a hint"} 🎁`
        : isNewConv
          ? `${organiserName} started a group gift for ${hint.title || "a hint"} 🎁`
          : newlyInvitedNames.length
            ? `${organiserName} invited ${newlyInvitedNames.join(", ")} to chip in on ${hint.title || "a hint"} 🎁`
            : `${organiserName} wants to chip in on ${hint.title || "a hint"} 🎁`;
      await supabase.from("messages").insert({ conversation_id: convId, sender_id: currentUserId, body: inviteBody, type: "system" });

      // Marking "I'm getting this" is a request, not silent - the
      // checkbox defaults on, but nothing happens here if the organiser
      // unchecked it or had already claimed it some other way. Matches
      // web exactly.
      if (wantsClaim && !alreadyClaimed) {
        await supabase.from("hint_claims").insert({ hint_id: hint.id, claimed_by: currentUserId, claim_type: "group" });
      }

      setGroupHint(gh);
      setMembers(newMembers || []);
      const invitedCount = selected.length;
      setSelected([]);

      fetch("https://hintdrop.app/api/group-hint-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "invite", groupHintId: gh?.id }),
      }).catch(() => {});

      onSent?.(invitedCount);
      onClose();
    } catch (e) {
      console.error("handleSend error:", e);
      setSendError("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const existingMemberIds = members.map((m) => m.user_id);
  const availableContacts = contacts.filter((c) => !existingMemberIds.includes(c.profile_id));

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.55)"]} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Get a group together</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>For {recipientName}</Text>
              {members.length > 0 ? <Text style={styles.headerCount}>{members.length} person{members.length > 1 ? "s" : ""} invited</Text> : null}
            </View>
            <Pressable style={styles.closeButton} onPress={onClose}><Text style={styles.closeButtonText}>✕</Text></Pressable>
          </View>

          <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ padding: 16 }}>
            {loading ? (
              <ActivityIndicator color={colors.coral} style={{ marginTop: 16 }} />
            ) : !groupHint && !potConfirmed && !chatOnly ? (
              <View style={{ paddingVertical: 16, alignItems: "center" }}>
                <Text style={styles.confirmTitle}>Get a group together for this gift?</Text>
                <Text style={styles.confirmBody}>
                  Start a pot to track contributions toward {hint.title || "this hint"} for {recipientName}, or just start a conversation about it with no money tracking at all.
                </Text>
                <Pressable style={styles.confirmPrimaryButton} onPress={() => setPotConfirmed(true)}>
                  <Text style={styles.confirmPrimaryButtonText}>Start a pot</Text>
                </Pressable>
                <Pressable style={styles.confirmSecondaryButton} onPress={() => setChatOnly(true)}>
                  <Text style={styles.confirmSecondaryButtonText}>Just start a conversation</Text>
                </Pressable>
                <Pressable onPress={onClose} style={{ marginTop: 8 }}>
                  <Text style={styles.confirmCancelText}>Cancel</Text>
                </Pressable>
              </View>
            ) : (
              <>
                {!groupHint && !chatOnly ? (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={styles.sectionLabel}>DEADLINE (OPTIONAL)</Text>
                    {recipientEvents.length > 0 ? (
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                        {recipientEvents.map((ev) => (
                          <Pressable key={ev.id} onPress={() => setDeadlineDate(ev.event_date)}
                            style={[styles.eventChip, deadlineDate === ev.event_date && styles.eventChipActive]}>
                            <Text style={[styles.eventChipText, deadlineDate === ev.event_date && styles.eventChipTextActive]}>
                              {ev.title} · {new Date(ev.event_date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                    <TextInput
                      style={styles.deadlineInput}
                      value={deadlineDate}
                      onChangeText={setDeadlineDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textMuted}
                    />
                    <Text style={styles.targetHelpText}>Leave blank if there's no deadline - reminder emails only go out when there's a date to count down to.</Text>
                  </View>
                ) : null}
                {!alreadyClaimed ? (
                  <Pressable style={{ flexDirection: "row", gap: 10, marginBottom: 16 }} onPress={() => setWantsClaim(!wantsClaim)}>
                    <View style={[styles.checkbox, wantsClaim && styles.checkboxChecked]}>
                      {wantsClaim ? <Text style={styles.checkboxMark}>✓</Text> : null}
                    </View>
                    <Text style={styles.claimText}>
                      Mark <Text style={{ fontWeight: "700", color: colors.textSecondary }}>"I'm getting this"</Text> so it's clear to anyone else browsing {recipientName}'s hints that this one's already covered.
                    </Text>
                  </Pressable>
                ) : null}
                {!groupHint && !chatOnly && !hintHasPrice ? (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={styles.sectionLabel}>POT TARGET</Text>
                    <Text style={styles.targetHelpText}>This hint has no price, so set what you're aiming to raise together.</Text>
                    <View style={styles.targetInputWrap}>
                      <Text style={styles.targetInputPrefix}>£</Text>
                      <TextInput
                        style={styles.targetInput}
                        value={manualTargetAmount}
                        onChangeText={setManualTargetAmount}
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                ) : null}
                {!chatOnly && (hintHasPrice || groupHint) && selected.length > 0 ? (() => {
                  const target = groupHint?.target_amount || hint.numeric_price;
                  const totalPeople = 1 + members.length + selected.length;
                  const share = target / totalPeople;
                  return (
                    <Text style={styles.shareText}>
                      An even split across {totalPeople} people works out to about{" "}
                      <Text style={{ fontWeight: "700", color: colors.textSecondary }}>
                        {new Intl.NumberFormat("en-GB", { style: "currency", currency: hint.currency || "GBP" }).format(share)}
                      </Text>{" "}
                      each.
                    </Text>
                  );
                })() : null}
                {members.length > 0 ? (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={styles.sectionLabel}>ALREADY INVITED</Text>
                    {members.map((m) => (
                      <View key={m.id} style={styles.memberRow}>
                        <GHAvatar name={m.profiles?.full_name} avatarUrl={m.profiles?.avatar_url} userId={m.user_id} />
                        <Text style={styles.memberName} numberOfLines={1}>{m.profiles?.full_name}</Text>
                        <View style={[styles.statusBadge, m.status === "in" ? styles.statusBadgeIn : styles.statusBadgeInvited]}>
                          <Text style={[styles.statusBadgeText, m.status === "in" ? styles.statusTextIn : styles.statusTextInvited]}>{m.status === "in" ? "✓ In" : "Invited"}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}

                {availableContacts.length > 0 ? (
                  <View>
                    <Text style={styles.sectionLabel}>{chatOnly ? "INVITE TO CHAT" : "INVITE TO CHIP IN"}</Text>
                    {availableContacts.map((c) => (
                      <Pressable key={c.profile_id} style={styles.memberRow} onPress={() => toggleContact(c.profile_id)}>
                        <GHAvatar name={c.name} avatarUrl={c.avatar_url} userId={c.profile_id} />
                        <Text style={styles.memberName} numberOfLines={1}>{c.name}</Text>
                        <View style={[styles.checkCircle, selected.includes(c.profile_id) && styles.checkCircleActive]}>
                          {selected.includes(c.profile_id) ? <Text style={{ color: "#fff", fontSize: 10 }}>✓</Text> : null}
                        </View>
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                {availableContacts.length === 0 && members.length === 0 ? (
                  <Text style={styles.emptyText}>No contacts to invite yet.</Text>
                ) : null}

                {sendError ? <View style={styles.errorBox}><Text style={styles.errorText}>{sendError}</Text></View> : null}
              </>
            )}
          </ScrollView>

          {selected.length > 0 ? (
            <View style={styles.footer}>
              <Pressable style={[styles.sendButton, sending && { opacity: 0.7 }]} onPress={handleSend} disabled={sending}>
                <Text style={styles.sendButtonText}>{sending ? "Sending..." : `Invite ${selected.length} contact${selected.length > 1 ? "s" : ""} to ${chatOnly ? "chat" : "chip in"}`}</Text>
              </Pressable>
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  card: { backgroundColor: colors.bg, borderTopLeftRadius: radii.xxl, borderTopRightRadius: radii.xxl, maxHeight: "88%" },
  header: { flexDirection: "row", alignItems: "flex-start", padding: 18, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  headerSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  headerCount: { fontSize: 11, color: colors.coralDeep, marginTop: 2 },
  closeButton: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  closeButtonText: { fontSize: 13, color: colors.textMuted },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, letterSpacing: 0.4, marginBottom: 10 },
  confirmTitle: { fontSize: 15, fontWeight: "700", color: colors.textPrimary, marginBottom: 6, textAlign: "center" },
  confirmBody: { fontSize: 13, color: colors.textMuted, textAlign: "center", marginBottom: 20, paddingHorizontal: 8 },
  confirmPrimaryButton: { height: 44, width: "100%", borderRadius: radii.pill, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  confirmPrimaryButtonText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  confirmSecondaryButton: { height: 44, width: "100%", borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  confirmSecondaryButtonText: { fontSize: 13, fontWeight: "700", color: colors.textSecondary },
  confirmCancelText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  eventChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border },
  eventChipActive: { borderColor: colors.coral, backgroundColor: "#fff1ea" },
  eventChipText: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  eventChipTextActive: { color: colors.coral },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center", marginTop: 1 },
  checkboxChecked: { backgroundColor: colors.coral, borderColor: colors.coral },
  checkboxMark: { color: "#fff", fontSize: 12, fontWeight: "700" },
  claimText: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  targetHelpText: { fontSize: 12, color: colors.textMuted, marginBottom: 8 },
  targetInputWrap: { position: "relative", justifyContent: "center" },
  targetInputPrefix: { position: "absolute", left: 16, fontSize: 13, color: colors.textMuted, zIndex: 1 },
  targetInput: { height: 44, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, paddingLeft: 32, paddingRight: 16, fontSize: 14, color: colors.textPrimary },
  deadlineInput: { height: 44, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, paddingHorizontal: 16, fontSize: 14, color: colors.textPrimary },
  shareText: { fontSize: 12, color: colors.textMuted, marginBottom: 12 },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 },
  memberName: { flex: 1, fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  statusBadge: { borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 3 },
  statusBadgeIn: { backgroundColor: "#edf6eb" },
  statusBadgeInvited: { backgroundColor: "#fff4ee" },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  statusTextIn: { color: "#4a7a3a" },
  statusTextInvited: { color: colors.coralDeep },
  checkCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#cbd5e1", alignItems: "center", justifyContent: "center" },
  checkCircleActive: { backgroundColor: colors.coral, borderColor: colors.coral },
  emptyText: { textAlign: "center", color: colors.textMuted, fontSize: 13, paddingVertical: 24 },
  errorBox: { backgroundColor: "#fde8e8", borderRadius: radii.md, padding: 12, marginTop: 12 },
  errorText: { fontSize: 12, fontWeight: "600", color: "#b14f43" },
  footer: { padding: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  sendButton: { height: 46, borderRadius: radii.pill, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center", ...shadow },
  sendButtonText: { fontSize: 13, fontWeight: "700", color: "#fff" },
});
