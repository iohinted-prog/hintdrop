import { useCallback, useEffect, useState, useRef } from "react";
import { View, FlatList, StyleSheet, RefreshControl, ActivityIndicator, TextInput, Pressable, Image, Modal, ScrollView, Share, Alert, Animated } from "react-native";
import Text from "../components/Text";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { resolveAvatarColor, NON_USER_AVATAR_COLOR } from "../lib/avatarColor";
import { colors, radii, spacing, shadow } from "../lib/theme";
import ProfileScreen from "./ProfileScreen";
import ChatThreadScreen from "./ChatThreadScreen";

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
          <Text style={styles.messageButtonText}>💬</Text>
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

          <ScrollView style={{ flex: 1 }}>
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
  addCard: { backgroundColor: colors.bg, borderTopLeftRadius: radii.xxl, borderTopRightRadius: radii.xxl, maxHeight: "90%", padding: 20 },
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
