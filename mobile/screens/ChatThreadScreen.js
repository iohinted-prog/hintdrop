import { useEffect, useRef, useState } from "react";
import { View, StyleSheet, FlatList, Pressable, Image, TextInput, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Text from "../components/Text";
import { supabase } from "../lib/supabase";
import { resolveAvatarColor } from "../lib/avatarColor";
import { colors, radii, shadow } from "../lib/theme";

// Mirrors app/components/GroupChatWindow.jsx, adapted from a floating
// desktop window into a full-screen thread (see MessagesScreen.js for
// why - the same reasoning applies here). Same messages/conversations
// data and realtime subscription, same send/delete-message behavior,
// same mark-as-read-on-open. Pinned group-gift cards are the one
// deliberate omission - see MessagesScreen.js's header comment.

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

export default function ChatThreadScreen({ conversation, currentUserId, onBack }) {
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [myProfile, setMyProfile] = useState(null);
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

    const channel = supabase
      .channel("conv-" + conversation.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: "conversation_id=eq." + conversation.id }, (payload) =>
        setMessages((prev) => [payload.new, ...prev])
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, (payload) =>
        setMessages((prev) => prev.filter((m) => m.id !== payload.old.id))
      )
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
