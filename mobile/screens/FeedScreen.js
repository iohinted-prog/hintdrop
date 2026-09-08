import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

// Simplified starting point, not the full feed: the web version
// (app/feed/FeedClient.js) merges the user's own feed_items with
// their contacts' shared items, dedupes, and renders many distinct
// item_type variants (reminders, dropped hints, circle activity,
// invites) each with custom layouts, reactions, and comment threads.
// Porting all of that is real, separate work - this gets a genuinely
// real, working screen (actual data, not placeholder content) up
// first: the signed-in user's own feed_items, rendered generically.
// Next real step here: bring in the contacts-merge query and the
// per-item-type rendering from FeedClient.js.
function formatDate(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function describeItem(item) {
  const metadata = item.metadata || {};
  switch (item.item_type) {
    case "hint_dropped":
      return metadata.title ? `Dropped a hint: ${metadata.title}` : "Dropped a hint";
    case "reminder":
      return metadata.title || "Reminder";
    default:
      return item.item_type?.replace(/_/g, " ") || "Activity";
  }
}

function FeedItemCard({ item }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{describeItem(item)}</Text>
      <Text style={styles.cardTime}>{formatDate(item.occurred_at)}</Text>
    </View>
  );
}

export default function FeedScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadFeed = useCallback(async () => {
    if (!user?.id) return;
    setError("");
    const { data, error } = await supabase
      .from("feed_items")
      .select("*")
      .eq("owner_user_id", user.id)
      .order("occurred_at", { ascending: false })
      .limit(50);

    if (error) {
      setError(error.message);
    } else {
      setItems(data || []);
    }
  }, [user?.id]);

  useEffect(() => {
    setLoading(true);
    loadFeed().finally(() => setLoading(false));
  }, [loadFeed]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#ff875d" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Your people, moments, and nudges.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <FeedItemCard item={item} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#ff875d" />
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>Nothing here yet.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fffaf7",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  header: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  error: {
    color: "#c9633f",
    fontSize: 13,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#f0dfd6",
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 4,
  },
  cardTime: {
    fontSize: 12,
    color: "#94a3b8",
  },
  emptyText: {
    fontSize: 14,
    color: "#94a3b8",
  },
});
