import { useEffect, useRef, useState } from "react";
import { View, StyleSheet, FlatList, Pressable, Image, TextInput, KeyboardAvoidingView, Platform, Alert, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import Text from "../components/Text";
import { supabase } from "../lib/supabase";
import { resolveAvatarColor } from "../lib/avatarColor";
import { colors, radii, shadow } from "../lib/theme";

// Mirrors app/components/GroupChatWindow.jsx, adapted from a floating
// desktop window into a full-screen thread (see MessagesScreen.js for
// why - the same reasoning applies here). Same messages/conversations
// data and realtime subscription, same send/delete-message behavior,
// same mark-as-read-on-open, and now also the pinned group-gift cards
// (conversation_hints/group_hints/group_hint_members) with the same
// accept/decline flow - group gifting is built out as its own feature
// now (see components/GroupHintModal.js for the invite side).

function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Avatar({ profile, userId, size = 28 }) {
  const c = resolveAvatarColor({ avatarColor: profile?.avatar_color, id: userId });
  if (profile?.avatar_url) {
    return <Image source={{ uri: profile.avatar_url }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center", backgroundColor: c.to }}>
      <Text style={{ color: "#fff", fontSize: size * 0.36, fontWeight: "700" }}>{getInitials(profile?.full_name)}</Text>
    </View>
  );
}

export default function ChatThreadScreen({ conversation, currentUserId, onBack, onViewProfile }) {
  const [messages, setMessages] = useState([]);
  const [pinnedHints, setPinnedHints] = useState([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [myProfile, setMyProfile] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const listRef = useRef(null);

  const members = conversation?.conversation_members || [];
  const otherMembers = members.filter((m) => m.user_id !== currentUserId);
  const firstName = (n) => n?.split(" ")[0] || "?";
  const title =
    otherMembers.length === 0
      ? "Just you"
      : otherMembers.length <= 2
        ? otherMembers.map((m) => firstName(m.profiles?.full_name)).join(", ")
        : otherMembers.slice(0, 2).map((m) => firstName(m.profiles?.full_name)).join(", ") + ` + ${otherMembers.length - 2} others`;

  useEffect(() => {
    if (!conversation?.id) return;

    supabase.from("profiles").select("full_name, avatar_url, avatar_color").eq("id", currentUserId).maybeSingle().then(({ data }) => setMyProfile(data));

    supabase
      .from("messages")
      .select("id, body, type, created_at, sender_id, profiles(full_name, avatar_url, avatar_color)")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setMessages(data || []));

    const loadPinnedHints = () => {
      supabase
        .from("conversation_hints")
        .select("id, group_hint_id, dismissed, group_hints(id, hint_id, organiser_id, recipient_user_id, target_amount, hints(title, image_url, numeric_price, currency, retailer), profiles!group_hints_organiser_id_fkey(full_name), group_hint_members(id, user_id, status, pledged_amount, paid_amount, profiles(full_name, avatar_url, avatar_color)))")
        .eq("conversation_id", conversation.id)
        .eq("dismissed", false)
        .then(({ data }) => setPinnedHints(data || []));
    };
    loadPinnedHints();

    const channel = supabase
      .channel("conv-" + conversation.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: "conversation_id=eq." + conversation.id }, (payload) =>
        setMessages((prev) => [payload.new, ...prev])
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, (payload) =>
        setMessages((prev) => prev.filter((m) => m.id !== payload.old.id))
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversation_hints", filter: "conversation_id=eq." + conversation.id }, loadPinnedHints)
      .subscribe();

    supabase.from("conversation_members").update({ last_read_at: new Date().toISOString() }).eq("conversation_id", conversation.id).eq("user_id", currentUserId).then(() => {});

    return () => supabase.removeChannel(channel);
  }, [conversation?.id, currentUserId]);

  async function handleSend() {
    if (!body.trim() || sending) return;
    setSending(true);
    const trimmed = body.trim();
    setBody("");
    const { data } = await supabase
      .from("messages")
      .insert({ conversation_id: conversation.id, sender_id: currentUserId, body: trimmed, type: "text" })
      .select("id, body, type, created_at, sender_id, profiles(full_name, avatar_url, avatar_color)")
      .maybeSingle();
    if (data) setMessages((prev) => [data, ...prev]);
    setSending(false);
  }

  function handleDeleteMessage(messageId) {
    Alert.alert("Delete this message?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setMessages((prev) => prev.filter((m) => m.id !== messageId));
          const { error } = await supabase.from("messages").delete().eq("id", messageId);
          if (error) {
            const { data } = await supabase
              .from("messages")
              .select("id, body, type, created_at, sender_id, profiles(full_name, avatar_url, avatar_color)")
              .eq("conversation_id", conversation.id)
              .order("created_at", { ascending: false });
            setMessages(data || []);
          }
        },
      },
    ]);
  }

  async function dismissHint(pinnedHintId) {
    await supabase.from("conversation_hints").update({ dismissed: true }).eq("id", pinnedHintId);
    setPinnedHints((prev) => prev.filter((h) => h.id !== pinnedHintId));
  }

  async function respondToGroupHint(ph, action) {
    const gh = ph.group_hints;
    const myMember = (gh?.group_hint_members || []).find((m) => m.user_id === currentUserId);
    if (!myMember) return;

    const status = action === "accept" ? "in" : "declined";
    await supabase.from("group_hint_members").update({ status }).eq("id", myMember.id);

    const myName = myProfile?.full_name || "Someone";
    const announceBody = action === "accept" ? `${myName} is in! 🎉` : `${myName} declined`;

    if (action === "decline") {
      // Post the decline notice first, while still a member (RLS
      // requires the sender to be a member), then remove them from
      // the chat - same order as web, same reason.
      await supabase.from("messages").insert({ conversation_id: conversation.id, sender_id: currentUserId, body: announceBody, type: "system" });
      await supabase.from("conversation_members").delete().eq("conversation_id", conversation.id).eq("user_id", currentUserId);
      onBack();
      return;
    }

    await supabase.from("messages").insert({ conversation_id: conversation.id, sender_id: currentUserId, body: announceBody, type: "system" });
    setPinnedHints((prev) =>
      prev.map((p) =>
        p.id !== ph.id
          ? p
          : { ...p, group_hints: { ...p.group_hints, group_hint_members: (p.group_hints.group_hint_members || []).map((m) => (m.id === myMember.id ? { ...m, status: "in" } : m)) } }
      )
    );

    // Email nudge to the organiser, same as web.
    fetch("https://hintdrop.app/api/group-hint-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "response", memberId: myMember.id, responderId: currentUserId, response: status }),
    }).catch(() => {});
  }

  // Second, separate step from accepting - accepting ("I'm in") is just
  // saying you're in; marking a contribution confirms the money has
  // actually changed hands (outside the app). Only the member themselves
  // can mark their own contribution.
  async function markAsPaid(ph, amount) {
    const gh = ph.group_hints;
    const myMember = (gh?.group_hint_members || []).find((m) => m.user_id === currentUserId);
    if (!myMember) return;

    await supabase.from("group_hint_members").update({ paid_amount: amount }).eq("id", myMember.id);

    const myName = myProfile?.full_name || "Someone";
    const currency = gh?.hints?.currency || "GBP";
    const announceBody = `${myName} contributed ${new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount)} 🎉`;
    await supabase.from("messages").insert({ conversation_id: conversation.id, sender_id: currentUserId, body: announceBody, type: "system" });

    setPinnedHints((prev) =>
      prev.map((p) =>
        p.id !== ph.id
          ? p
          : { ...p, group_hints: { ...p.group_hints, group_hint_members: (p.group_hints.group_hint_members || []).map((m) => (m.id === myMember.id ? { ...m, paid_amount: amount } : m)) } }
      )
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.headerBack} hitSlop={8}>
            <Text style={styles.headerBackText}>← Back</Text>
          </Pressable>
          <View style={styles.headerAvatars}>
            {otherMembers.slice(0, 3).map((m, i) => (
              <View key={m.user_id} style={{ marginLeft: i > 0 ? -12 : 0, zIndex: 3 - i }}>
                <Avatar profile={m.profiles} userId={m.user_id} size={32} />
              </View>
            ))}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
            <Text style={styles.headerSubtitle}>{members.length} {members.length === 1 ? "person" : "people"}</Text>
          </View>
        </View>

        {pinnedHints.length > 0 ? (
          <View style={styles.pinnedWrap}>
            <Text style={styles.pinnedLabel}>📌 GROUP GIFTS</Text>
            {pinnedHints.map((ph) => {
              const hint = ph.group_hints?.hints;
              const organiser = ph.group_hints?.profiles;
              const myMember = (ph.group_hints?.group_hint_members || []).find((m) => m.user_id === currentUserId);
              const isPending = myMember?.status === "invited";
              const price = hint?.numeric_price > 0 ? new Intl.NumberFormat("en-GB", { style: "currency", currency: hint.currency || "GBP" }).format(hint.numeric_price) : null;
              const allMembers = ph.group_hints?.group_hint_members || [];
              const inMembers = allMembers.filter((m) => m.status === "in");
              const pendingMembers = allMembers.filter((m) => m.status === "invited");
              const target = ph.group_hints?.target_amount;
              const totalPeople = 1 + allMembers.length; // organiser + everyone invited
              const share = target ? target / totalPeople : null;
              const paidMembers = inMembers.filter((m) => m.paid_amount != null);
              // Only real, actually-marked contributions count toward the
              // pot - no fallback to the theoretical share for members
              // who are merely "in" but haven't contributed yet.
              const raised = paidMembers.reduce((sum, m) => sum + Number(m.paid_amount), 0);
              const pct = target ? Math.min(100, Math.round((raised / target) * 100)) : 0;
              const fmt = (n) => new Intl.NumberFormat("en-GB", { style: "currency", currency: hint?.currency || "GBP" }).format(n);
              return (
                <View key={ph.id} style={styles.pinnedCard}>
                  {target != null ? (
                    // Mini version of the donut used on the Circle tile - a
                    // single overall-progress ring (not per-member segments,
                    // no room at this size) wrapping the hint thumbnail
                    // instead of sitting beside it.
                    <Pressable
                      onPress={() => {
                        const dest = ph.group_hints?.recipient_user_id || ph.group_hints?.organiser_id;
                        if (dest && onViewProfile) onViewProfile(dest);
                      }}
                      style={{ width: 44, height: 44 }}
                    >
                      <Svg width={44} height={44} viewBox="0 0 44 44" style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
                        <Circle cx={22} cy={22} r={18} fill="none" stroke="#f1e3db" strokeWidth={4} />
                        <Circle
                          cx={22} cy={22} r={18} fill="none" stroke="#ff875d" strokeWidth={4}
                          strokeDasharray={`${(pct / 100) * (2 * Math.PI * 18)} ${2 * Math.PI * 18}`}
                          strokeLinecap="round"
                        />
                      </Svg>
                      <View style={styles.pinnedDonutImageWrap}>
                        {hint?.image_url ? <Image source={{ uri: hint.image_url }} style={styles.pinnedDonutImage} /> : null}
                      </View>
                    </Pressable>
                  ) : hint?.image_url ? (
                    <Pressable
                      onPress={() => {
                        const dest = ph.group_hints?.recipient_user_id || ph.group_hints?.organiser_id;
                        if (dest && onViewProfile) onViewProfile(dest);
                      }}
                    >
                      <Image source={{ uri: hint.image_url }} style={styles.pinnedImage} />
                    </Pressable>
                  ) : null}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.pinnedTitle} numberOfLines={1}>{hint?.title || "Group gift"}</Text>
                    {price ? <Text style={styles.pinnedPrice}>{price}</Text> : null}
                    {organiser ? <Text style={styles.pinnedOrganiser}>by {organiser.full_name?.split(" ")[0]}</Text> : null}
                    {allMembers.length > 0 ? (
                      <View style={styles.pinnedMembersRow}>
                        <View style={{ flexDirection: "row" }}>
                          {allMembers.slice(0, 4).map((m, i) => (
                            <View key={m.id} style={[styles.pinnedMemberAvatarWrap, { marginLeft: i > 0 ? -8 : 0 }, m.paid_amount != null ? styles.pinnedRingPaid : m.status === "in" ? styles.pinnedRingIn : m.status === "declined" ? styles.pinnedRingDeclined : styles.pinnedRingInvited]}>
                              <Avatar profile={m.profiles} userId={m.user_id} size={16} />
                            </View>
                          ))}
                        </View>
                        <Text style={styles.pinnedMembersText}>{inMembers.length} in{pendingMembers.length > 0 ? `, ${pendingMembers.length} pending` : ""}{allMembers.filter((m) => m.paid_amount != null).length > 0 ? `, ${allMembers.filter((m) => m.paid_amount != null).length} contributed` : ""}</Text>
                      </View>
                    ) : null}
                    {pct != null ? (
                      <View style={{ marginTop: 6 }}>
                        <View style={styles.pinnedProgressTrack}>
                          <View style={[styles.pinnedProgressFill, { width: `${pct}%` }]} />
                        </View>
                        <Text style={styles.pinnedProgressText}>{fmt(raised)} of {fmt(target)} pledged</Text>
                      </View>
                    ) : null}
                  </View>
                  {isPending ? (
                    <View style={{ gap: 4 }}>
                      <Pressable
                        style={styles.pinnedAcceptButton}
                        onPress={() => respondToGroupHint(ph, "accept")}
                      >
                        <Text style={styles.pinnedAcceptText}>I'm in</Text>
                      </Pressable>
                      <Pressable style={styles.pinnedDeclineButton} onPress={() => respondToGroupHint(ph, "decline")}>
                        <Text style={styles.pinnedDeclineText}>Decline</Text>
                      </Pressable>
                    </View>
                  ) : payingId === ph.id ? (
                    <View style={{ gap: 4, alignItems: "flex-end" }}>
                      <TextInput
                        style={styles.pledgeInput}
                        value={payAmount}
                        onChangeText={setPayAmount}
                        keyboardType="decimal-pad"
                        autoFocus
                      />
                      <View style={{ flexDirection: "row", gap: 4 }}>
                        <Pressable
                          style={styles.pinnedPayButton}
                          onPress={() => {
                            markAsPaid(ph, parseFloat(payAmount) || 0);
                            setPayingId(null);
                          }}
                        >
                          <Text style={styles.pinnedAcceptText}>Confirm</Text>
                        </Pressable>
                        <Pressable style={styles.pinnedDeclineButton} onPress={() => setPayingId(null)}>
                          <Text style={styles.pinnedDeclineText}>✕</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : myMember?.status === "in" && target != null && myMember.paid_amount == null ? (
                    <View style={{ gap: 4 }}>
                      <Pressable
                        style={styles.pinnedPayButton}
                        onPress={() => {
                          setPayAmount("");
                          setPayingId(ph.id);
                        }}
                      >
                        <Text style={styles.pinnedAcceptText}>I've contributed</Text>
                      </Pressable>
                    </View>
                  ) : myMember?.status === "in" && target != null && myMember.paid_amount != null ? (
                    <View style={styles.pinnedPaidBadge}>
                      <Text style={styles.pinnedPaidBadgeText}>✓ Contributed</Text>
                    </View>
                  ) : myMember?.status === "in" ? (
                    <View style={styles.pinnedPaidBadge}>
                      <Text style={styles.pinnedPaidBadgeText}>✓ You're in</Text>
                    </View>
                  ) : (
                    <View style={{ gap: 4 }}>
                      <Pressable
                        style={styles.pinnedDismissButton}
                        onPress={() => {
                          const dest = ph.group_hints?.recipient_user_id || ph.group_hints?.organiser_id;
                          if (dest && onViewProfile) onViewProfile(dest);
                        }}
                      >
                        <Text style={styles.pinnedSeeHintsText}>See hints</Text>
                      </Pressable>
                      <Pressable style={styles.pinnedDismissButton} onPress={() => dismissHint(ph.id)}>
                        <Text style={styles.pinnedDeclineText}>Dismiss</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : null}

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={styles.messagesContent}
          ListEmptyComponent={<View style={styles.emptyWrap}><Text style={styles.emptyText}>No messages yet</Text></View>}
          renderItem={({ item: msg }) => {
            if (msg.type === "system") {
              return (
                <View style={styles.systemRow}>
                  <View style={styles.systemBubble}><Text style={styles.systemText}>{msg.body}</Text></View>
                </View>
              );
            }
            const isOwn = msg.sender_id === currentUserId;
            const sp = isOwn ? myProfile : msg.profiles;
            return (
              <View style={[styles.msgRow, isOwn && styles.msgRowOwn]}>
                <Avatar profile={sp} userId={msg.sender_id} size={26} />
                <View style={[styles.msgBubbleWrap, isOwn && { alignItems: "flex-end" }]}>
                  {!isOwn ? <Text style={styles.msgSender}>{sp?.full_name?.split(" ")[0]}</Text> : null}
                  <Pressable onLongPress={() => isOwn && handleDeleteMessage(msg.id)} style={[styles.msgBubble, isOwn ? styles.msgBubbleOwn : styles.msgBubbleOther]}>
                    <Text style={[styles.msgText, isOwn && { color: "#fff" }]}>{msg.body}</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={body}
            onChangeText={setBody}
            placeholder="Message..."
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={handleSend}
          />
          <Pressable style={[styles.sendButton, (!body.trim() || sending) && { opacity: 0.5 }]} onPress={handleSend} disabled={!body.trim() || sending}>
            <Text style={styles.sendButtonText}>➤</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card },
  headerBack: { paddingVertical: 4 },
  headerBackText: { fontSize: 14, fontWeight: "600", color: colors.coral },
  headerAvatars: { flexDirection: "row" },
  headerTitle: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  headerSubtitle: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  pinnedWrap: { borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: "#fff8f5", paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  pinnedLabel: { fontSize: 10, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.6 },
  pinnedCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: 8 },
  pinnedImage: { width: 40, height: 40, borderRadius: 10 },
  pinnedDonutImageWrap: { position: "absolute", top: 5, left: 5, width: 34, height: 34, borderRadius: 17, overflow: "hidden", backgroundColor: colors.border },
  pinnedDonutImage: { width: "100%", height: "100%" },
  pinnedTitle: { fontSize: 12, fontWeight: "700", color: colors.textPrimary },
  pinnedPrice: { fontSize: 11, fontWeight: "700", color: colors.coralDeep, marginTop: 1 },
  pinnedOrganiser: { fontSize: 10, color: colors.textMuted, marginTop: 1 },
  pinnedMembersRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  pinnedMemberAvatarWrap: { borderRadius: 10, borderWidth: 2, borderColor: "#fff" },
  pinnedRingIn: { borderColor: "#8fc98f" },
  pinnedRingPaid: { borderColor: colors.successText },
  pinnedRingDeclined: { borderColor: "#e2e8f0", opacity: 0.5 },
  pinnedRingInvited: { borderColor: "#ffcaa8" },
  pinnedMembersText: { fontSize: 10, color: colors.textMuted },
  pinnedProgressTrack: { height: 5, borderRadius: 3, backgroundColor: "#f1e3db", overflow: "hidden" },
  pinnedProgressFill: { height: "100%", borderRadius: 3, backgroundColor: colors.coral },
  pinnedProgressText: { fontSize: 10, color: colors.textMuted, marginTop: 3 },
  pinnedAcceptButton: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.pill, backgroundColor: colors.coral },
  pinnedPayButton: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.pill, backgroundColor: colors.successText },
  pinnedPaidBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.pill, backgroundColor: colors.successBg },
  pinnedPaidBadgeText: { fontSize: 10, fontWeight: "700", color: colors.successText },
  pledgeInput: { width: 64, height: 28, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: "#fff", paddingHorizontal: 10, fontSize: 12, color: colors.textPrimary },
  pinnedAcceptText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  pinnedDeclineButton: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border },
  pinnedDeclineText: { fontSize: 10, fontWeight: "700", color: colors.textMuted },
  pinnedDismissButton: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border },
  pinnedSeeHintsText: { fontSize: 10, fontWeight: "700", color: colors.coralDeep },
  messagesContent: { padding: 16, gap: 10, flexGrow: 1 },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },
  emptyText: { color: colors.textMuted, fontSize: 14 },
  systemRow: { alignItems: "center", marginVertical: 4 },
  systemBubble: { backgroundColor: "#f5f0ee", borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 5 },
  systemText: { fontSize: 11, color: colors.textMuted },
  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 8 },
  msgRowOwn: { flexDirection: "row-reverse" },
  msgBubbleWrap: { maxWidth: "72%" },
  msgSender: { fontSize: 10, color: colors.textMuted, marginBottom: 2, marginLeft: 4 },
  msgBubble: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18 },
  msgBubbleOwn: { backgroundColor: colors.coral, borderBottomRightRadius: 4 },
  msgBubbleOther: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  msgText: { fontSize: 14, color: colors.textPrimary, lineHeight: 19 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card },
  input: { flex: 1, height: 42, borderRadius: 21, borderWidth: 1, borderColor: "#ead8ce", backgroundColor: colors.bg, paddingHorizontal: 16, fontSize: 14, color: colors.textPrimary },
  sendButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center" },
  sendButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
