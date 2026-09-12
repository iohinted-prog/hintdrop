import { useCallback, useEffect, useState, useRef } from "react";
import { View, FlatList, StyleSheet, RefreshControl, ActivityIndicator, TextInput, Pressable, Image, Modal, ScrollView, Share, Alert, Animated } from "react-native";
import Text from "../components/Text";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import Icon from "../components/Icon";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { resolveAvatarColor, NON_USER_AVATAR_COLOR } from "../lib/avatarColor";
import { colors, radii, spacing, shadow } from "../lib/theme";
import ProfileScreen from "./ProfileScreen";
import ChatThreadScreen from "./ChatThreadScreen";
import HintImage from "../components/HintImage";
import GroupHintDetailScreen from "./GroupHintDetailScreen";

// Mirrors app/circle/PeopleClient.jsx + ContactCard.jsx +
// AddContactModal.jsx + UserProfileModal.jsx. Built against the real
// web markup (colors, radii, copy, layout), not from memory.
//
// Deliberately not ported: AddContactModal's Google Contacts search
// (relies on the web Google OAuth flow's provider_token, which isn't
// available the same way here) - share-link + manual name/email/
// relationship form covers the actual add-a-contact flow.
// UserProfileModal's "See full profile" link (the full /profile/
// [userId] page doesn't exist on mobile yet) is replaced with a note
// rather than a dead link.

function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getStarSign(birthday) {
  if (!birthday) return null;
  const d = new Date(birthday + "T00:00:00");
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if ((m === 3 && day >= 21) || (m === 4 && day <= 19)) return "♈ Aries";
  if ((m === 4 && day >= 20) || (m === 5 && day <= 20)) return "♉ Taurus";
  if ((m === 5 && day >= 21) || (m === 6 && day <= 20)) return "♊ Gemini";
  if ((m === 6 && day >= 21) || (m === 7 && day <= 22)) return "♋ Cancer";
  if ((m === 7 && day >= 23) || (m === 8 && day <= 22)) return "♌ Leo";
  if ((m === 8 && day >= 23) || (m === 9 && day <= 22)) return "♍ Virgo";
  if ((m === 9 && day >= 23) || (m === 10 && day <= 22)) return "♎ Libra";
  if ((m === 10 && day >= 23) || (m === 11 && day <= 21)) return "♏ Scorpio";
  if ((m === 11 && day >= 22) || (m === 12 && day <= 21)) return "♐ Sagittarius";
  if ((m === 12 && day >= 22) || (m === 1 && day <= 19)) return "♑ Capricorn";
  if ((m === 1 && day >= 20) || (m === 2 && day <= 18)) return "♒ Aquarius";
  return "♓ Pisces";
}

function daysUntilBirthday(birthday) {
  if (!birthday) return null;
  const bday = new Date(birthday + "T00:00:00");
  if (isNaN(bday.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let next = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
  if (next < today) next = new Date(today.getFullYear() + 1, bday.getMonth(), bday.getDate());
  return Math.round((next - today) / (1000 * 60 * 60 * 24));
}

const ROLE_COLORS = {
  partner: { bg: "#ffb3b3", text: "#a15252" },
  spouse: { bg: "#ffb3b3", text: "#a15252" },
  family: { bg: "#ffd6a5", text: "#9a6a2e" },
  friend: { bg: "#a0c4ff", text: "#3c5a8a" },
  colleague: { bg: "#caffbf", text: "#3f7a3a" },
};
function roleColor(role) {
  return ROLE_COLORS[String(role || "").toLowerCase()] || { bg: "#bdb2ff", text: "#5c4f8a" };
}

function buildContact(row) {
  const role = row?.role || "Friend";
  const matchedProfileId = row.profile_id || row.matched_profile_id || null;
  const c = matchedProfileId ? resolveAvatarColor({ avatarColor: row.avatar_color, id: matchedProfileId }) : NON_USER_AVATAR_COLOR;
  return {
    id: row.contact_id || row.id,
    name: row.name || row.email || "Unnamed",
    role,
    initials: getInitials(row.name || row.email || ""),
    avatarColorFrom: c.from,
    avatarColorTo: c.to,
    email: row.email || "",
    birthday: row.birthday || "",
    avatarUrl: row.avatar_url || null,
    profileId: matchedProfileId,
    note: Array.isArray(row.interests) && row.interests.length ? row.interests.slice(0, 3).join(" · ") : role,
    status: row.public_state || "contact",
  };
}

// Simple opacity pulse, matching web's animate-pulse loading rows
// (avatar circle + two text-line placeholders, 3 rows) rather than a
// plain spinner.
function Pulse({ style }) {
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[style, { opacity }]} />;
}

function ContactSkeletonRow() {
  return (
    <View style={styles.skeletonRow}>
      <Pulse style={styles.skeletonAvatar} />
      <View style={{ flex: 1, gap: 8 }}>
        <Pulse style={styles.skeletonLineWide} />
        <Pulse style={styles.skeletonLineNarrow} />
      </View>
    </View>
  );
}

function ContactAvatar({ contact, size = 44 }) {
  if (contact.avatarUrl) {
    return <Image source={{ uri: contact.avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center", backgroundColor: contact.avatarColorTo }}>
      <Text style={{ color: "#fff", fontSize: size * 0.32, fontWeight: "700" }}>{contact.initials}</Text>
    </View>
  );
}

const POT_MEMBER_COLORS = ["#ff8060", "#4e9e6e", "#5b8dd9", "#c97ad4", "#e8a23a", "#e05c7a", "#4db8b0", "#9b7fd4"];

// Same multi-segment SVG donut as web's PeopleClient.jsx
// GroupGiftPotCard, itself reused from the old circles-legacy page's
// ContributionChart design - built with react-native-svg (already
// pulled in for the icon rework above) rather than inventing a
// different mobile-only visual. Even-split model, same as web: one
// color per accepted member at an equal size (target/totalPeople),
// no per-person custom amounts, no real payment - a coordination
// number layered on the existing plain "I'm in" status.
function GroupGiftPotCard({ groupGift, currentUserId, onContributed }) {
  const [payingAmount, setPayingAmount] = useState("");
  const [paying, setPaying] = useState(false);
  const hint = groupGift.hints;
  const organiser = groupGift.profiles;
  const members = groupGift.group_hint_members || [];
  const myMember = members.find((m) => m.user_id === currentUserId);
  const inMembers = members.filter((m) => m.status === "in");
  const paidMembers = inMembers.filter((m) => m.paid_amount != null);
  const target = groupGift.target_amount;
  // The organiser is a real member row now - members already includes
  // them, no manual +1 needed.
  const totalPeople = members.length || 1;
  const share = target ? target / totalPeople : 0;
  // Only real, actually-marked contributions count toward the pot - no
  // fallback to the theoretical share for members who are merely "in"
  // but haven't contributed yet (and the organiser was never a real
  // contributor here at all), which used to make an empty pot look
  // already 30-50% full.
  const raised = paidMembers.reduce((sum, m) => sum + Number(m.paid_amount), 0);
  const pct = target ? Math.min(100, Math.round((raised / target) * 100)) : 0;
  const isOrganiser = groupGift.organiser_id === currentUserId;
  const isPastDeadline = groupGift.deadline_date && new Date(groupGift.deadline_date) < new Date(new Date().toDateString());

  async function markPaid() {
    if (!myMember || paying) return;
    setPaying(true);
    await supabase.from("group_hint_members").update({ paid_amount: parseFloat(payingAmount) || 0 }).eq("id", myMember.id);
    setPaying(false);
    setPayingAmount("");
    onContributed?.();
  }
  const fmt = (n) => new Intl.NumberFormat("en-GB", { style: "currency", currency: hint?.currency || "GBP" }).format(n);

  // Donut segments - one per actual contribution, sized to what was
  // really paid. No organiser segment (they never "contribute" in this
  // model) and no segment for an "in" member who hasn't paid yet.
  const segments = paidMembers.map((m) => ({ name: m.user_id === currentUserId ? "You" : m.profiles?.full_name?.split(" ")[0] || "Someone", amount: Number(m.paid_amount), paid: true }));
  const cx = 44, cy = 44, r = 36, stroke = 13;
  const circ = 2 * Math.PI * r;

  return (
    <View style={[styles.potCard, isPastDeadline && { opacity: 0.55 }]}>
      <View style={{ width: 88, height: 88 }}>
        <Svg width={88} height={88} viewBox="0 0 88 88" style={{ transform: [{ rotate: "-90deg" }] }}>
          <Circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1e3db" strokeWidth={stroke} />
          {segments.map((seg, i) => {
            const segPct = target ? (seg.amount / target) * 100 : 0;
            const dash = (segPct / 100) * circ;
            const segOffset = segments.slice(0, i).reduce((a, s) => a + ((target ? (s.amount / target) * 100 : 0) / 100) * circ, 0);
            return (
              <Circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={POT_MEMBER_COLORS[i % POT_MEMBER_COLORS.length]}
                strokeWidth={stroke} strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-segOffset} strokeLinecap="butt" />
            );
          })}
        </Svg>
        <View style={styles.potPctWrap}>
          <Text style={styles.potPctText}>{pct}%</Text>
        </View>
      </View>
      <View style={{ flex: 1, minWidth: 0, marginLeft: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 }}>
          {hint?.image_url ? <HintImage uri={hint.image_url} style={styles.potImage} /> : null}
          <Text style={styles.potTitle} numberOfLines={2}>{hint?.title || "Group gift"}</Text>
        </View>
        <Text style={styles.potSubtext}>
          {fmt(raised)} of {target ? fmt(target) : "—"} · {fmt(share)} each
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
          <View style={{ flexDirection: "row" }}>
            {segments.map((seg, i) => (
              <View key={i} style={[styles.potAvatarDot, { backgroundColor: POT_MEMBER_COLORS[i % POT_MEMBER_COLORS.length], marginLeft: i > 0 ? -6 : 0 }, seg.paid ? styles.potAvatarDotPaid : null]}>
                <Text style={styles.potAvatarDotText}>{seg.name[0]?.toUpperCase()}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.potPledgedText}>{inMembers.length} of {members.length} in{paidMembers.length > 0 ? `, ${paidMembers.length} contributed` : ""}{isPastDeadline ? " · Closed" : ""}</Text>
          {!isPastDeadline && myMember?.status === "in" && myMember.paid_amount == null && (
            <Pressable style={styles.potContributeRow} onPress={(e) => e.stopPropagation?.()}>
              <TextInput
                style={styles.potContributeInput}
                value={payingAmount}
                onChangeText={setPayingAmount}
                placeholder={share.toFixed(2)}
                keyboardType="decimal-pad"
              />
              <Pressable disabled={paying} onPress={markPaid} style={styles.potContributeButton}>
                <Text style={styles.potContributeButtonText}>I've contributed</Text>
              </Pressable>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

function ContactCard({ contact, onOpenProfile, onDelete, onMessage }) {
  const isClickable = Boolean(contact.profileId);
  const rc = roleColor(contact.role);
  const days = daysUntilBirthday(contact.birthday);

  return (
    <Pressable style={styles.contactCard} onPress={isClickable ? () => onOpenProfile(contact) : undefined}>
      <ContactAvatar contact={contact} />
      <View style={styles.contactInfo}>
        <View style={styles.contactNameRow}>
          <Text style={styles.contactName} numberOfLines={1}>{contact.name}</Text>
          <View style={[styles.roleBadge, { backgroundColor: rc.bg + "66" }]}>
            <Text style={[styles.roleBadgeText, { color: rc.text }]}>{contact.role || "Friend"}</Text>
          </View>
        </View>
        {contact.note && contact.note !== contact.role ? (
          <Text style={styles.contactNote} numberOfLines={1}>{contact.note}</Text>
        ) : null}
        {contact.birthday ? (
          <View style={styles.birthdayRow}>
            <Text style={styles.birthdayText}>
              🎂 {new Date(contact.birthday + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {getStarSign(contact.birthday)}
            </Text>
            {days != null && days <= 30 ? (
              <View style={styles.daysBadge}>
                <Text style={styles.daysBadgeText}>{days === 0 ? "Today!" : days === 1 ? "Tomorrow" : `in ${days} days`}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        {isClickable ? <Text style={styles.seeHintsText}>👁 See hints</Text> : null}
      </View>
      {isClickable && onMessage ? (
        <Pressable style={styles.messageButton} onPress={(e) => { e.stopPropagation?.(); onMessage(contact); }} hitSlop={8}>
          <Icon name="message-square" size={16} color="#475569" />
        </Pressable>
      ) : null}
      {onDelete ? (
        <Pressable style={styles.deleteButton} onPress={() => onDelete(contact)} hitSlop={8}>
          <Text style={styles.deleteButtonText}>✕</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function AddContactModal({ visible, onClose, onSave, currentUserId, currentUserName }) {
  const relationshipOptions = ["Partner", "Spouse", "Family", "Friend", "Parent", "Child", "Sibling", "Cousin", "Colleague", "Roommate", "Best friend", "Other"];
  const [selectedRole, setSelectedRole] = useState("Friend");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) {
      setName("");
      setEmail("");
      setSelectedRole("Friend");
      setError("");
    }
  }, [visible]);

  async function handleShareLink() {
    const url = `https://hintdrop.app/join/${currentUserId}`;
    try {
      await Share.share({
        message: `${currentUserName ? `Join ${currentUserName}'s Circle on HintDrop` : "Join my Circle on HintDrop"} ${url}`,
      });
    } catch {
      // dismissed
    }
  }

  async function handleSave() {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedName) { setError("Contact name is required."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) { setError("Enter a valid email address."); return; }
    setSaving(true);
    setError("");
    try {
      await onSave({ name: trimmedName, email: trimmedEmail, relationshipTypes: [selectedRole] });
      onClose();
    } catch (e) {
      setError(e?.message || "Failed to save contact.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.addOverlay}>
        <LinearGradient colors={["transparent", "rgba(42,26,20,0.5)"]} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
        <View style={styles.addCard}>
          <View style={styles.addHeaderRow}>
            <View>
              <Text style={styles.addEyebrow}>CONTACT</Text>
              <Text style={styles.addTitle}>Add a contact</Text>
            </View>
            <Pressable onPress={onClose} style={styles.addCloseButton} hitSlop={8}>
              <Text style={styles.addCloseText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.addShareBox}>
              <Text style={styles.addShareEyebrow}>FASTEST WAY</Text>
              <Text style={styles.addShareTitle}>Share your invite link</Text>
              <Text style={styles.addShareSubtitle}>Anyone with this link can add themselves to your Circle instantly - no email needed.</Text>
              <Pressable style={styles.addShareButton} onPress={handleShareLink}>
                <Text style={styles.addShareButtonText}>Share invite link</Text>
              </Pressable>
            </View>

            <View style={{ marginTop: spacing.xl }}>
              <Text style={styles.addFieldLabel}>Name</Text>
              <TextInput style={styles.addInput} value={name} onChangeText={setName} placeholder="Maya" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={{ marginTop: spacing.lg }}>
              <Text style={styles.addFieldLabel}>Email</Text>
              <TextInput style={styles.addInput} value={email} onChangeText={setEmail} placeholder="maya@example.com" placeholderTextColor={colors.textMuted} autoCapitalize="none" keyboardType="email-address" />
            </View>
            <View style={{ marginTop: spacing.lg }}>
              <Text style={styles.addFieldLabel}>Relationship</Text>
              <View style={styles.relationshipWrap}>
                {relationshipOptions.map((r) => (
                  <Pressable
                    key={r}
                    style={[styles.relationshipChip, selectedRole === r && styles.relationshipChipActive]}
                    onPress={() => setSelectedRole(r)}
                  >
                    <Text style={[styles.relationshipChipText, selectedRole === r && styles.relationshipChipTextActive]}>{r}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
          </ScrollView>

          <View style={styles.addFooterRow}>
            <Pressable style={styles.addCancelButton} onPress={onClose}>
              <Text style={styles.addCancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.addSaveButton, (!name.trim() || !email.trim() || saving) && styles.addSaveButtonDisabled]} onPress={handleSave} disabled={saving || !name.trim() || !email.trim()}>
              <Text style={styles.addSaveText}>{saving ? "Saving..." : "Save contact"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function CircleScreen() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [addVisible, setAddVisible] = useState(false);
  const [fullProfileUserId, setFullProfileUserId] = useState(null);
  const [openPotId, setOpenPotId] = useState(null);
  const [openChatConversation, setOpenChatConversation] = useState(null);

  // Mirrors handleMessageContact in app/circle/PeopleClient.jsx exactly
  // - find an existing direct conversation with this contact, or
  // create one, then open it. Same find-or-create logic, adapted to
  // open the full-screen ChatThreadScreen (see MessagesScreen.js's
  // header comment for why that's the mobile equivalent of web's
  // floating chat windows) instead of the shared desktop chat-windows
  // system.
  async function handleMessageContact(contact) {
    if (!user?.id || !contact.profileId) return;
    const { data: myMemberships } = await supabase.from("conversation_members").select("conversation_id").eq("user_id", user.id);
    const { data: theirMemberships } = await supabase.from("conversation_members").select("conversation_id").eq("user_id", contact.profileId);
    const myIds = new Set((myMemberships || []).map((m) => m.conversation_id));
    const sharedId = (theirMemberships || []).map((m) => m.conversation_id).find((id) => myIds.has(id));

    let convId = sharedId;
    if (!convId) {
      const { data: newConv, error } = await supabase.from("conversations").insert({ type: "direct" }).select("id").single();
      if (error || !newConv) return;
      convId = newConv.id;
      await supabase.from("conversation_members").insert([
        { conversation_id: convId, user_id: user.id },
        { conversation_id: convId, user_id: contact.profileId },
      ]);
    }

    const { data: convData } = await supabase.from("conversations").select("id, type").eq("id", convId).maybeSingle();
    const { data: members } = await supabase.from("conversation_members").select("conversation_id, user_id, profiles(full_name, avatar_url, avatar_color)").eq("conversation_id", convId);
    setOpenChatConversation({ ...convData, conversation_members: members || [] });
  }
  const [currentUserName, setCurrentUserName] = useState("");
  const [groupGifts, setGroupGifts] = useState([]);

  // Every group gift the user is either organising or has been
  // invited into - two queries since Supabase can't OR across the
  // join in one call, then merged. Matches web's PeopleClient.jsx
  // loadGroupGifts exactly.
  async function loadGroupGifts(userId) {
    const [{ data: organising }, { data: memberRows }] = await Promise.all([
      supabase.from("group_hints").select("id, hint_id, organiser_id, recipient_user_id, target_amount, created_at, hints(title, image_url, numeric_price, currency), profiles!group_hints_organiser_id_fkey(full_name), group_hint_members(id, user_id, status, pledged_amount, paid_amount, profiles(full_name, avatar_url, avatar_color))").eq("organiser_id", userId),
      supabase.from("group_hint_members").select("group_hint_id").eq("user_id", userId),
    ]);
    const memberGroupHintIds = (memberRows || []).map((r) => r.group_hint_id);
    const { data: invitedInto } = memberGroupHintIds.length
      ? await supabase.from("group_hints").select("id, hint_id, organiser_id, recipient_user_id, target_amount, created_at, hints(title, image_url, numeric_price, currency), profiles!group_hints_organiser_id_fkey(full_name), group_hint_members(id, user_id, status, pledged_amount, paid_amount, profiles(full_name, avatar_url, avatar_color))").in("id", memberGroupHintIds)
      : { data: [] };
    const merged = [...(organising || []), ...(invitedInto || [])].filter(
      (gh, i, self) => self.findIndex((g) => g.id === gh.id) === i
    ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setGroupGifts(merged);
  }

  const loadContacts = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase.from("contact_public_state").select("*").eq("owner_user_id", user.id).order("name", { ascending: true });
    setContacts((data || []).map(buildContact));
  }, [user?.id]);

  useEffect(() => {
    setLoading(true);
    loadContacts().finally(() => setLoading(false));
    if (user?.id) {
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle().then(({ data }) => setCurrentUserName(data?.full_name || ""));
      loadGroupGifts(user.id);
    }
  }, [loadContacts, user?.id]);

  // Live-update, matching web: a friend request being accepted (by
  // either side), a new contact being added, or an existing one
  // changing now refreshes the list immediately rather than needing
  // a manual pull-to-refresh to see any of it.
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`circle-live-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "contacts", filter: `user_id=eq.${user.id}` }, () => loadContacts())
      .on("postgres_changes", { event: "*", schema: "public", table: "circle_invites" }, () => loadContacts())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadContacts]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadContacts();
    setRefreshing(false);
  }

  async function handleSaveContact(payload) {
    if (!user?.id) throw new Error("You must be signed in.");
    const { error } = await supabase.functions.invoke("send-contact-invite", {
      body: {
        email: payload.email,
        name: payload.name,
        role: Array.isArray(payload.relationshipTypes) && payload.relationshipTypes.length ? payload.relationshipTypes[0] : "Friend",
      },
    });
    if (error) throw new Error("Failed to send contact invite.");
    await loadContacts();
  }

  function handleDelete(contact) {
    Alert.alert(`Remove ${contact.name}?`, "This removes them from your Circle.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await supabase.from("contacts").delete().eq("id", contact.id);
          loadContacts();
        },
      },
    ]);
  }

  const filtered = contacts.filter((c) => !search || c.name?.toLowerCase().includes(search.toLowerCase()));
  const withDays = filtered.map((c) => ({ ...c, daysUntilBirthday: daysUntilBirthday(c.birthday) }));
  const upcoming = withDays.filter((c) => c.daysUntilBirthday != null && c.daysUntilBirthday <= 30).sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);
  const upcomingIds = new Set(upcoming.map((c) => c.id));
  const everyoneElse = withDays.filter((c) => !upcomingIds.has(c.id));

  const sections = [];
  if (upcoming.length) sections.push({ title: "Upcoming birthdays", data: upcoming });
  if (everyoneElse.length) sections.push({ title: upcoming.length ? "Everyone else" : null, data: everyoneElse });

  if (fullProfileUserId) {
    return <ProfileScreen userId={fullProfileUserId} onBack={() => setFullProfileUserId(null)} />;
  }

  if (openPotId) {
    return <GroupHintDetailScreen groupHintId={openPotId} currentUserId={user?.id} onClose={() => { setOpenPotId(null); if (user?.id) loadGroupGifts(user.id); }} />;
  }

  if (openChatConversation) {
    return (
      <ChatThreadScreen
        conversation={openChatConversation}
        currentUserId={user?.id}
        onBack={() => setOpenChatConversation(null)}
        onViewProfile={(uid) => { setOpenChatConversation(null); setFullProfileUserId(uid); }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Your Circle</Text>
        <Pressable style={styles.addButton} onPress={() => setAddVisible(true)}>
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.searchInput}
        value={search}
        onChangeText={setSearch}
        placeholder="Search contacts..."
        placeholderTextColor={colors.textMuted}
      />

      {loading ? (
        <View>
          <ContactSkeletonRow />
          <ContactSkeletonRow />
          <ContactSkeletonRow />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Image source={{ uri: "https://hintdrop.app/illustrations/hero-character.png" }} style={styles.emptyIllustration} resizeMode="contain" />
          <Text style={styles.emptyTitle}>No contacts yet</Text>
          <Text style={styles.emptySubtitle}>Add the people you'd like to remember birthdays and gift ideas for.</Text>
          <Pressable style={styles.addButton} onPress={() => setAddVisible(true)}>
            <Text style={styles.addButtonText}>Add your first contact</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(s, i) => s.title || `section-${i}`}
          renderItem={({ item }) => (
            <View>
              {item.title ? (
                <View style={styles.sectionHeaderRow}>
                  {item.title === "Upcoming birthdays" ? <Text style={styles.sectionHeaderIcon}>🎂</Text> : null}
                  <Text style={styles.sectionHeader}>{item.title.toUpperCase()}</Text>
                </View>
              ) : null}
              {item.data.map((contact) => (
                <ContactCard key={contact.id} contact={contact} onOpenProfile={(c) => c.profileId && setFullProfileUserId(c.profileId)} onDelete={handleDelete} onMessage={handleMessageContact} />
              ))}
            </View>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.coral} />}
          ListFooterComponent={
            groupGifts.length > 0 ? (
              <View style={{ marginTop: 20 }}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeader}>GROUP GIFTS</Text>
                </View>
                <View style={{ gap: 10, marginTop: 8 }}>
                  {groupGifts.map((gg) => (
                    <Pressable key={gg.id} onPress={() => setOpenPotId(gg.id)}>
                      <GroupGiftPotCard groupGift={gg} currentUserId={user?.id} onContributed={() => user?.id && loadGroupGifts(user.id)} />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null
          }
        />
      )}

      <AddContactModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onSave={handleSaveContact}
        currentUserId={user?.id}
        currentUserName={currentUserName}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingTop: 16, paddingHorizontal: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: "700", letterSpacing: -1.1, color: colors.textPrimary },
  addButton: { height: 40, paddingHorizontal: 16, borderRadius: radii.pill, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center", ...shadow },
  addButtonText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  searchInput: {
    height: 44,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  listContent: { paddingBottom: 40 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 20, marginBottom: 10 },
  sectionHeaderIcon: { fontSize: 15 },
  sectionHeader: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, letterSpacing: 0.6 },
  potCard: { flexDirection: "row", alignItems: "center", borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 14 },
  potPctWrap: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  potPctText: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  potImage: { width: 52, height: 52, borderRadius: 12 },
  potTitle: { flex: 1, fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  potSubtext: { fontSize: 12, color: colors.textSecondary },
  potAvatarDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.card, alignItems: "center", justifyContent: "center" },
  potAvatarDotPaid: { borderColor: colors.successText },
  potAvatarDotText: { fontSize: 7, fontWeight: "700", color: "#fff" },
  potPledgedText: { fontSize: 10, color: colors.textMuted },
  potContributeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  potContributeInput: { width: 64, height: 32, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, fontSize: 11, color: colors.textPrimary, backgroundColor: colors.card },
  potContributeButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill, backgroundColor: colors.successText },
  potContributeButtonText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  emptyState: { alignItems: "center", paddingTop: 40, gap: 6 },
  emptyIllustration: { width: 160, height: 160, marginBottom: 8, opacity: 0.9 },
  emptyTitle: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  emptySubtitle: { fontSize: 13, color: colors.textMuted, textAlign: "center", paddingHorizontal: 32, marginBottom: 8 },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: 16,
    marginBottom: 10,
  },
  skeletonAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#f0e4dd" },
  skeletonLineWide: { height: 14, width: 130, borderRadius: 999, backgroundColor: "#f0e4dd" },
  skeletonLineNarrow: { height: 12, width: 80, borderRadius: 999, backgroundColor: "#f5ede8" },
  contactCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: 14,
    marginBottom: 10,
    ...shadow,
    shadowOpacity: 0.04,
  },
  contactInfo: { flex: 1, minWidth: 0 },
  contactNameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  contactName: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  roleBadge: { borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 2 },
  roleBadgeText: { fontSize: 11, fontWeight: "700" },
  contactNote: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  birthdayRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" },
  birthdayText: { fontSize: 11, color: colors.coralDeep },
  daysBadge: { backgroundColor: "#fdece0", borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 2 },
  daysBadgeText: { fontSize: 10, fontWeight: "700", color: "#c9633f" },
  seeHintsText: { fontSize: 11, color: colors.coralDeep, marginTop: 2 },
  messageButton: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", marginRight: 6 },
  messageButtonText: { fontSize: 14 },
  deleteButton: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  deleteButtonText: { fontSize: 12, color: colors.textMuted },
  addOverlay: { flex: 1, justifyContent: "flex-end" },
  addCard: { backgroundColor: colors.bg, borderTopLeftRadius: radii.xxl, borderTopRightRadius: radii.xxl, maxHeight: "90%", padding: 20, overflow: "hidden" },
  addHeaderRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  addEyebrow: { fontSize: 11, fontWeight: "700", color: colors.coralDeep, letterSpacing: 0.6 },
  addTitle: { fontSize: 22, fontWeight: "600", color: colors.textPrimary, marginTop: 4 },
  addCloseButton: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  addCloseText: { fontSize: 15, color: colors.textSecondary },
  addShareBox: { marginTop: 16, backgroundColor: "#fff7f2", borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, padding: 16 },
  addShareEyebrow: { fontSize: 11, fontWeight: "700", color: colors.coralDeep, letterSpacing: 0.6 },
  addShareTitle: { fontSize: 15, fontWeight: "600", color: colors.textPrimary, marginTop: 6 },
  addShareSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 17 },
  addShareButton: { marginTop: 12, height: 42, borderRadius: radii.pill, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center", alignSelf: "flex-start", paddingHorizontal: 18 },
  addShareButtonText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  addFieldLabel: { fontSize: 13, fontWeight: "600", color: colors.textPrimary, marginBottom: 6 },
  addInput: { height: 46, borderRadius: radii.md, borderWidth: 1, borderColor: "#d9dce3", backgroundColor: colors.card, paddingHorizontal: 14, fontSize: 14, color: colors.textPrimary },
  relationshipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  relationshipChip: { borderRadius: radii.pill, borderWidth: 1, borderColor: "#d9dce3", backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 8 },
  relationshipChipActive: { borderColor: colors.successBorder, backgroundColor: colors.successBg },
  relationshipChipText: { fontSize: 13, fontWeight: "500", color: colors.textSecondary },
  relationshipChipTextActive: { color: colors.successText },
  addFooterRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  addCancelButton: { flex: 1, height: 44, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  addCancelText: { fontSize: 14, fontWeight: "500", color: colors.textSecondary },
  addSaveButton: { flex: 1, height: 44, borderRadius: radii.pill, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center" },
  addSaveButtonDisabled: { backgroundColor: "#e9a48d" },
  addSaveText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  errorBanner: {
    marginTop: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    backgroundColor: colors.errorBg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.errorText,
  },
});
