import { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, FlatList, Pressable, Image, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import Text from "../components/Text";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { resolveAvatarColor } from "../lib/avatarColor";
import { colors, radii, shadow } from "../lib/theme";
import ChatThreadScreen from "./ChatThreadScreen";

// Mirrors the data web loads for its Messages dropdown (app/
// components/AppShell.jsx's loadGroupMessages effect), but as a real,
// fully scrollable list screen rather than a dropdown capped at 8
// conversations with no way to reach anything beyond that - web
// itself has no dedicated messages page at all, just that capped
// dropdown opening into floating chat windows. Floating windows don't
// translate to a phone screen the way they do a desktop browser tab,
// so this follows the pattern every native messaging app uses
// instead: a real conversation list you can actually scroll through,
// tapping into a full-screen thread - the natural mobile equivalent,
// not a literal copy of a web layout that wouldn't work here.

function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function ConvAvatarStack({ members }) {
  const shown = members.slice(0, 2);
  return (
    <View style={styles.avatarStack}>
      {shown.map((m, i) => {
        const c = resolveAvatarColor({ avatarColor: m.profiles?.avatar_color, id: m.user_id });
        return (
          <View key={m.user_id} style={[styles.avatarStackItem, { marginLeft: i > 0 ? -14 : 0, zIndex: shown.length - i }]}>
            {m.profiles?.avatar_url ? (
              <Image source={{ uri: m.profiles.avatar_url }} style={styles.avatarStackImage} />
            ) : (
              <View style={[styles.avatarStackImage, { alignItems: "center", justifyContent: "center", backgroundColor: c.to }]}>
                <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>{getInitials(m.profiles?.full_name)}</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

export default function MessagesScreen({ onBack, onViewProfile }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openConversation, setOpenConversation] = useState(null);

  const loadConversations = useCallback(async () => {
    if (!user?.id) return;
    const { data: myMemberships } = await supabase.from("conversation_members").select("conversation_id, last_read_at").eq("user_id", user.id);
    const convIds = (myMemberships || []).map((m) => m.conversation_id);
    if (!convIds.length) {
      setConversations([]);
      setLoading(false);
      return;
    }
    const [{ data: convsData }, { data: allMembers }] = await Promise.all([
      supabase.from("conversations").select("id, type, group_hint_id").in("id", convIds),
      supabase.from("conversation_members").select("conversation_id, user_id, profiles(full_name, avatar_url, avatar_color)").in("conversation_id", convIds),
    ]);
    const { data: lastMsgs } = await supabase
      .from("messages")
      .select("conversation_id, body, type, created_at, sender_id, profiles(full_name)")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false });
    const lastMsgMap = {};
    (lastMsgs || []).forEach((m) => { if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = m; });

    const myMembershipMap = {};
    (myMemberships || []).forEach((m) => { myMembershipMap[m.conversation_id] = m.last_read_at; });
    const unreadCountMap = {};
    (lastMsgs || []).forEach((m) => {
      if (m.sender_id === user.id) return;
      const lastRead = myMembershipMap[m.conversation_id];
      const isUnread = !lastRead || new Date(m.created_at) > new Date(lastRead);
      if (isUnread) unreadCountMap[m.conversation_id] = (unreadCountMap[m.conversation_id] || 0) + 1;
    });

    const convsWithData = (convsData || []).map((c) => ({
      ...c,
      conversation_members: (allMembers || []).filter((m) => m.conversation_id === c.id),
      last_message: lastMsgMap[c.id] || null,
      unread: unreadCountMap[c.id] || 0,
    }));
    const sorted = [...convsWithData].sort((a, b) => {
      const aTime = a.last_message?.created_at ? new Date(a.last_message.created_at).getTime() : 0;
      const bTime = b.last_message?.created_at ? new Date(b.last_message.created_at).getTime() : 0;
      return bTime - aTime;
    });
    setConversations(sorted);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Refresh whenever this screen regains focus - e.g. coming back from
  // a thread should clear that conversation's unread state here too.
  useFocusEffect(useCallback(() => { loadConversations(); }, [loadConversations]));

  function handleDelete(conv) {
    Alert.alert("Delete this conversation?", "This removes it from your list only - it stays for anyone else in it, same as WhatsApp or iMessage.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setConversations((prev) => prev.filter((c) => c.id !== conv.id));
          await supabase.from("conversation_members").delete().eq("conversation_id", conv.id).eq("user_id", user.id);
        },
      },
    ]);
  }

  if (openConversation) {
    return (
      <ChatThreadScreen
        conversation={openConversation}
        currentUserId={user?.id}
        onBack={() => { setOpenConversation(null); loadConversations(); }}
        onViewProfile={onViewProfile}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.headerBack} hitSlop={8}>
          <Text style={styles.headerBackText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.coral} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No messages yet</Text>}
          renderItem={({ item }) => {
            const others = (item.conversation_members || []).filter((m) => m.user_id !== user?.id);
            const title = others.length === 0 ? "Just you" : others.length === 1 ? others[0].profiles?.full_name || "Someone" : others.map((m) => m.profiles?.full_name?.split(" ")[0] || "?").join(", ");
            const preview = item.last_message
              ? item.last_message.type === "system"
                ? item.last_message.body
                : `${item.last_message.sender_id === user?.id ? "You" : item.last_message.profiles?.full_name?.split(" ")[0] || "?"}: ${item.last_message.body}`
              : null;
            return (
              <Pressable
                style={styles.convRow}
                onPress={() => setOpenConversation(item)}
                onLongPress={() => handleDelete(item)}
              >
                <ConvAvatarStack members={others.length ? others : item.conversation_members || []} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.convTitle, item.unread > 0 && styles.convTitleUnread]} numberOfLines={1}>{title}</Text>
                  {preview ? (
                    <Text style={[styles.convPreview, item.unread > 0 && styles.convPreviewUnread]} numberOfLines={1}>{preview}</Text>
                  ) : null}
                </View>
                {item.unread > 0 ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{item.unread > 9 ? "9+" : item.unread}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card },
  headerBack: { paddingVertical: 4 },
  headerBackText: { fontSize: 14, fontWeight: "600", color: colors.coral },
  headerTitle: { fontSize: 17, fontWeight: "700", color: colors.textPrimary },
  listContent: { paddingVertical: 8 },
  emptyText: { textAlign: "center", color: colors.textMuted, marginTop: 60, fontSize: 14 },
  convRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f5ece6" },
  avatarStack: { flexDirection: "row", width: 44 },
  avatarStackItem: { borderRadius: 20, borderWidth: 2, borderColor: colors.bg },
  avatarStackImage: { width: 36, height: 36, borderRadius: 18 },
  convTitle: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  convTitleUnread: { fontWeight: "700" },
  convPreview: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  convPreviewUnread: { color: colors.textSecondary, fontWeight: "600" },
  unreadBadge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 5, backgroundColor: "#f36f64", alignItems: "center", justifyContent: "center" },
  unreadBadgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },
});
