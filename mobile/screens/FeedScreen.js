import { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Pressable, Image, ScrollView, TextInput, Linking, Modal } from "react-native";
import Text from "../components/Text";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { resolveAvatarColor } from "../lib/avatarColor";
import { colors, radii, spacing, shadow } from "../lib/theme";
import ProfileScreen from "./ProfileScreen";

// Mirrors app/feed/FeedClient.js's actual mobile-web behavior, not
// its full desktop layout - confirmed by reading the file directly:
// the filter sidebar ("<aside className="hidden xl:block...") and
// the calendar widget sidebar are BOTH hidden on mobile web too, and
// "mobileTab" state (which looked like it might toggle between
// views) is set once and never actually changed anywhere - dead code,
// not a real mobile tab switcher. So mobile web's real feed is just
// the plain chronological card list with no filter UI, which is
// exactly what this matches, rather than inventing filter tabs web
// itself doesn't show at this size.
//
// Explicitly deferred, not silently dropped:
// - Calendar-derived reminder items being injected into the feed
//   (shortReminderFeedItems on web) - depends on the Calendar system,
//   which doesn't exist on mobile yet. Own/contact feed_items and the
//   two-item demo fallback are ported; calendar-sourced reminders
//   will start appearing here once Calendar itself is built, the
//   same query web uses.
// - The hint-preview tap-through only shows a simplified detail (image,
//   title, retailer, Open link) rather than the full claim/share
//   hint-detail modal ProfileScreen.js has - avoiding duplicating that
//   whole modal here for a secondary entry point into hint detail.

function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatRelativeFromDate(dateString) {
  if (!dateString) return "Recently";
  const now = new Date();
  const value = new Date(dateString);
  const diffMs = now.getTime() - value.getTime();
  if (Number.isNaN(diffMs)) return "Recently";
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 7) return `${days}d ago`;
  return value.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function diffInDaysFromToday(dateString) {
  if (!dateString) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateString + "T00:00:00");
  if (Number.isNaN(target.getTime())) return null;
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function formatReminderDistance(diffDays) {
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === 7) return "In 1 week";
  if (diffDays < 7) return `In ${diffDays} days`;
  const weeks = Math.round(diffDays / 7);
  if (diffDays < 31) return `In ${weeks} week${weeks === 1 ? "" : "s"}`;
  const months = Math.round(diffDays / 30);
  return `In ${months} month${months === 1 ? "" : "s"}`;
}

function eventTypeIcon(title, type) {
  const t = String(title || "").toLowerCase();
  const normalized = String(type || "").toLowerCase();
  if (t.includes("christmas")) return "santa.png";
  if (t.includes("halloween")) return "pumpkin.png";
  if (t.includes("easter")) return "bunny.png";
  if (t.includes("patrick")) return "shamrock.png";
  if (t.includes("new year")) return "balloon.svg";
  if (t.includes("birthday") || normalized.includes("birthday")) return "birthday-cake.svg";
  if (t.includes("wedding") || normalized.includes("wedding")) return "wedding-church.svg";
  if (t.includes("anniversary") || normalized.includes("anniversary")) return "calendar.svg";
  if (normalized.includes("celebration")) return "balloon.svg";
  if (normalized.includes("holiday")) return "holiday-palm.svg";
  return "calendar.svg";
}

function reminderStyleForType(eventType, customColor) {
  const normalized = String(eventType || "").toLowerCase();
  const isWarmType = normalized.includes("birthday") || normalized.includes("anniversary") || normalized.includes("celebration") || normalized.includes("wedding");
  const prompt = normalized.includes("birthday")
    ? "Time to plan something amazing."
    : normalized.includes("anniversary")
      ? "A moment worth celebrating together."
      : normalized.includes("celebration")
        ? "Time to plan something worth celebrating."
        : normalized.includes("wedding")
          ? "Time to celebrate the happy couple."
          : "Time to sort out the details.";
  if (customColor) return { bg: `${customColor}4D`, prompt };
  return { bg: isWarmType ? "#fdece0" : "#e3f5ea", prompt };
}

function getFeedBucket(item) {
  const family = String(item.family || "").toLowerCase();
  const itemType = String(item.item_type || "").toLowerCase();
  if (family.includes("hint") || itemType.includes("hint")) return "hint";
  if (family.includes("circle") || itemType.includes("circle")) return "circle";
  if (family.includes("reminder") || itemType.includes("reminder")) return "reminder";
  if (family.includes("contact") || itemType.includes("contact")) return "contact";
  return "all";
}

function isSocialFeedItem(item) {
  if (item.isDemo) return true;
  const metadata = item.metadata || {};
  if (typeof metadata.social_enabled === "boolean") return metadata.social_enabled;
  return getFeedBucket(item) !== "reminder";
}

const BUCKET_STYLES = {
  hint: { bg: "#f5f3ff", text: "#7c5cbf", label: "Hint" },
  circle: { bg: "#eef6ea", text: "#5b7a3c", label: "Circle" },
  reminder: { bg: "#fff3ee", text: "#e07c54", label: "Reminder" },
  contact: { bg: "#fff7e8", text: "#af7b14", label: "Contact" },
  all: { bg: "#fff7e8", text: "#af7b14", label: "Contact" },
};

const REACTION_EMOJIS = ["❤️", "👏", "🎁"];

const demoHintPost = {
  id: "demo-hint-post",
  family: "hint",
  item_type: "hint_save_session",
  headline: "James added a hint",
  body: "",
  occurred_at: new Date(Date.now() - 60000).toISOString(),
  created_at: new Date(Date.now() - 60000).toISOString(),
  metadata: {
    social_enabled: true,
    actor_name: "James",
    actor_avatar_initials: "J",
    preview_hints: [
      { id: "demo-hint-1", title: "Nothing Headphones", retailer: "amazon.co.uk", image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80" },
    ],
    demo_reactions: [
      { id: "r1", emoji: "❤️", count: 1 },
      { id: "r2", emoji: "🎁", count: 2 },
      { id: "r3", emoji: "👏", count: 1 },
    ],
    demo_comments: [{ id: "c1", author_name: "Maya", body: "Love this!" }],
  },
  isDemo: true,
};

const demoReminderPost = {
  id: "demo-reminder-post",
  family: "reminder",
  item_type: "reminder",
  headline: "Maya's birthday is in 6 days",
  body: "",
  cta_label: "See hints",
  cta_href: "/hints",
  occurred_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  metadata: {
    social_enabled: true,
    actor_name: "Maya",
    actor_avatar_initials: "M",
    event_type: "birthday",
    event_title: "Maya's Birthday",
    event_date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  },
  isDemo: true,
};

function FeedAvatar({ name, avatarUrl, avatarColor, userId, onPress, size = 44 }) {
  const c = resolveAvatarColor({ avatarColor, id: userId });
  const content = avatarUrl ? (
    <Image source={{ uri: avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center", backgroundColor: c.to }}>
      <Text style={{ color: "#fff", fontSize: size * 0.32, fontWeight: "700" }}>{getInitials(name)}</Text>
    </View>
  );
  if (onPress) return <Pressable onPress={onPress}>{content}</Pressable>;
  return content;
}

function FeedItemCard({ item, comments, activeComposerId, setActiveComposerId, draftComment, setDraftComment, onSubmitComment, demoReactionsState, onToggleDemoReaction, onOpenProfile, onOpenHintDetail, sessionUser, reactions, onToggleReaction, onDeleteComment }) {
  const metadata = item.metadata || {};
  const socialEnabled = isSocialFeedItem(item);
  const bucket = getFeedBucket(item);
  const reminderDaysAway = bucket === "reminder" ? diffInDaysFromToday(metadata.event_date) : null;
  const reminderStyle = bucket === "reminder" ? reminderStyleForType(metadata.event_type, metadata.event_color) : null;
  const bucketStyle = BUCKET_STYLES[bucket];
  const actorUserId = item.actor_user_id && item.actor_user_id !== "hinted-demo" ? item.actor_user_id : null;
  const demoReactions = item.isDemo ? demoReactionsState || [] : Array.isArray(metadata.demo_reactions) ? metadata.demo_reactions : [];
  const canInteract = item.isDemo || socialEnabled;
  const openProfile = () => actorUserId && onOpenProfile?.(actorUserId);

  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        {bucket === "reminder" && !metadata.actor_name ? (
          <View style={styles.eventIconWrap}>
            <Image source={{ uri: `https://hintdrop.app/illustrations/${eventTypeIcon(metadata.event_title, metadata.event_type)}` }} style={{ width: 28, height: 28 }} resizeMode="contain" />
          </View>
        ) : (
          <FeedAvatar name={metadata.actor_name} avatarUrl={metadata.actor_avatar_url} userId={actorUserId} onPress={actorUserId ? openProfile : undefined} />
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.cardBadgeRow}>
                {metadata.actor_name ? (
                  <Pressable onPress={actorUserId ? openProfile : undefined} disabled={!actorUserId}>
                    <Text style={styles.actorName}>{metadata.actor_name}</Text>
                  </Pressable>
                ) : null}
                <View style={[styles.bucketBadge, { backgroundColor: bucketStyle.bg }]}>
                  <Text style={[styles.bucketBadgeText, { color: bucketStyle.text }]}>{bucketStyle.label}</Text>
                </View>
                {item.isDemo ? (
                  <View style={styles.demoBadge}><Text style={styles.demoBadgeText}>Demo</Text></View>
                ) : null}
              </View>
              <Text style={styles.headline}>{item.headline}</Text>
              {item.body && bucket !== "reminder" ? <Text style={styles.body}>{item.body}</Text> : null}
            </View>
            <Text style={styles.timestamp}>{formatRelativeFromDate(item.occurred_at || item.created_at)}</Text>
          </View>

          {bucket === "hint" && metadata.preview_hints?.filter((h) => h.image_url).length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14 }}>
              {metadata.preview_hints.filter((h) => h.image_url).map((hint, i) => (
                <Pressable key={hint.id || i} style={styles.hintPreviewTile} onPress={() => onOpenHintDetail?.(hint)}>
                  <Image source={{ uri: hint.image_url }} style={styles.hintPreviewImage} />
                  <View style={styles.hintPreviewOverlay} />
                  <View style={styles.hintPreviewTextWrap}>
                    <Text style={styles.hintPreviewTitle} numberOfLines={1}>{hint.title}</Text>
                    {hint.retailer ? <Text style={styles.hintPreviewRetailer} numberOfLines={1}>{hint.retailer}</Text> : null}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          {bucket === "reminder" && item.cta_label && item.cta_href ? (
            <View style={[styles.reminderBlock, { backgroundColor: reminderStyle.bg }]}>
              <Image source={{ uri: `https://hintdrop.app/illustrations/${eventTypeIcon(metadata.event_title, metadata.event_type)}` }} style={{ width: 48, height: 48 }} resizeMode="contain" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.reminderDistance}>{reminderDaysAway != null ? formatReminderDistance(reminderDaysAway) : "Coming up"}</Text>
                <Text style={styles.reminderPrompt}>{reminderStyle.prompt}</Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                  <View style={styles.reminderButtonPrimary}><Text style={styles.reminderButtonPrimaryText}>See hints</Text></View>
                  <View style={styles.reminderButtonSecondary}><Text style={styles.reminderButtonSecondaryText}>Shop</Text></View>
                </View>
              </View>
            </View>
          ) : null}

          {canInteract ? (
            <>
              <View style={styles.reactionsRow}>
                {item.isDemo
                  ? demoReactions.map((reaction) => (
                      <Pressable key={reaction.id} style={[styles.reactionChip, reaction.active && styles.reactionChipActive]} onPress={() => onToggleDemoReaction(item.id, reaction.id)}>
                        <Text style={styles.reactionChipText}>{reaction.emoji} {reaction.count || ""}</Text>
                      </Pressable>
                    ))
                  : REACTION_EMOJIS.map((emoji) => {
                      const count = reactions.filter((r) => r.emoji === emoji).length;
                      const active = reactions.some((r) => r.emoji === emoji && r.user_id === sessionUser?.id);
                      return (
                        <Pressable key={emoji} style={[styles.reactionChip, active && styles.reactionChipActive]} onPress={() => onToggleReaction(item, emoji)}>
                          <Text style={styles.reactionChipText}>{emoji} {count > 0 ? count : ""}</Text>
                        </Pressable>
                      );
                    })}
                <Pressable style={styles.commentButton} onPress={() => setActiveComposerId((c) => (c === item.id ? null : item.id))}>
                  <Text style={styles.commentButtonText}>Comment</Text>
                </Pressable>
              </View>

              {comments.length > 0 ? (
                <View style={styles.commentsWrap}>
                  {comments.map((comment) => (
                    <View key={comment.id} style={styles.commentRow}>
                      <FeedAvatar name={comment.author_name} avatarUrl={comment.author_avatar} userId={comment.user_id} size={28} onPress={comment.user_id && comment.user_id !== sessionUser?.id ? () => onOpenProfile?.(comment.user_id) : undefined} />
                      <Text style={styles.commentText}>
                        <Text style={styles.commentAuthor}>{comment.author_name || "Someone"}</Text> {comment.body}
                      </Text>
                      {comment.user_id === sessionUser?.id ? (
                        <Pressable onPress={() => onDeleteComment?.(comment)}><Text style={styles.commentDelete}>✕</Text></Pressable>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : null}

              {activeComposerId === item.id ? (
                <View style={styles.composerRow}>
                  <TextInput
                    style={styles.composerInput}
                    value={draftComment}
                    onChangeText={setDraftComment}
                    placeholder="Write a comment..."
                    placeholderTextColor={colors.textMuted}
                  />
                  <Pressable style={styles.composerSend} onPress={() => onSubmitComment(item)}>
                    <Text style={styles.composerSendText}>Send</Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function HintPeekModal({ hint, onClose }) {
  return (
    <Modal visible={Boolean(hint)} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.hintPeekOverlay} onPress={onClose}>
        {hint ? (
          <Pressable style={styles.hintPeekCard} onPress={() => {}}>
            {hint.image_url ? <Image source={{ uri: hint.image_url }} style={styles.hintPeekImage} resizeMode="cover" /> : null}
            <View style={{ padding: 18 }}>
              <Text style={styles.hintPeekTitle}>{hint.title || "Hint"}</Text>
              {hint.retailer ? <Text style={styles.hintPeekRetailer}>{hint.retailer}</Text> : null}
              {hint.url ? (
                <Pressable style={styles.hintPeekOpenButton} onPress={() => Linking.openURL(hint.url)}>
                  <Text style={styles.hintPeekOpenText}>Open →</Text>
                </Pressable>
              ) : null}
            </View>
          </Pressable>
        ) : null}
      </Pressable>
    </Modal>
  );
}

export default function FeedScreen() {
  const { user } = useAuth();
  const [feedItems, setFeedItems] = useState([]);
  const [reactionsByFeedId, setReactionsByFeedId] = useState({});
  const [commentsByFeedId, setCommentsByFeedId] = useState({});
  const [demoReactionsByFeedId, setDemoReactionsByFeedId] = useState({ "demo-hint-post": demoHintPost.metadata.demo_reactions.map((r) => ({ ...r, active: false })) });
  const [demoCommentsByFeedId, setDemoCommentsByFeedId] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeComposerId, setActiveComposerId] = useState(null);
  const [draftComment, setDraftComment] = useState("");
  const [fullProfileUserId, setFullProfileUserId] = useState(null);
  const [hintPeek, setHintPeek] = useState(null);

  const loadFeed = useCallback(async () => {
    if (!user?.id) return;
    setError("");
    const { data: contactRows } = await supabase.from("contacts").select("profile_id").eq("user_id", user.id).not("profile_id", "is", null);
    const contactUserIds = (contactRows || []).map((c) => c.profile_id).filter(Boolean);

    const [ownResult, contactResult] = await Promise.all([
      supabase.from("feed_items").select("*").eq("owner_user_id", user.id).order("occurred_at", { ascending: false }).limit(50),
      contactUserIds.length
        ? supabase.from("feed_items").select("*").in("actor_user_id", contactUserIds).eq("visibility", "contacts").order("occurred_at", { ascending: false }).limit(50)
        : Promise.resolve({ data: [] }),
    ]);
    const combined = [...(ownResult.data || []), ...(contactResult.data || [])].filter((item) => {
      const hideFrom = item.metadata?.hide_from_user_id;
      return !hideFrom || hideFrom !== user.id;
    });
    const seen = new Set();
    const rows = combined.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true))).sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at)).slice(0, 50);

    const actorIds = [...new Set(rows.map((r) => r.actor_user_id).filter((id) => id && id !== "hinted-demo"))];
    let avatarByUserId = {};
    if (actorIds.length) {
      const { data: profiles } = await supabase.from("profiles").select("id, avatar_url").in("id", actorIds);
      (profiles || []).forEach((p) => { if (p.avatar_url) avatarByUserId[p.id] = p.avatar_url; });
    }
    const enriched = rows.map((row) => {
      if (!row.actor_user_id || !avatarByUserId[row.actor_user_id]) return row;
      return { ...row, metadata: { ...(row.metadata || {}), actor_avatar_url: row.metadata?.actor_avatar_url || avatarByUserId[row.actor_user_id] } };
    });
    setFeedItems(enriched);

    const ids = enriched.filter(isSocialFeedItem).map((i) => i.id);
    if (ids.length) {
      const [{ data: reactionRows }, { data: commentRows }] = await Promise.all([
        supabase.from("feed_reactions").select("id, feed_item_id, user_id, emoji").in("feed_item_id", ids),
        supabase.from("feed_comments").select("id, feed_item_id, user_id, body, created_at").in("feed_item_id", ids).order("created_at", { ascending: true }),
      ]);
      setReactionsByFeedId((reactionRows || []).reduce((acc, r) => { (acc[r.feed_item_id] ||= []).push(r); return acc; }, {}));

      const commentUserIds = [...new Set((commentRows || []).map((c) => c.user_id).filter(Boolean))];
      let nameByUserId = {}, avatarByCommentUserId = {};
      if (commentUserIds.length) {
        const { data: commentProfiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", commentUserIds);
        (commentProfiles || []).forEach((p) => { nameByUserId[p.id] = p.full_name; avatarByCommentUserId[p.id] = p.avatar_url; });
      }
      setCommentsByFeedId((commentRows || []).reduce((acc, c) => {
        (acc[c.feed_item_id] ||= []).push({ ...c, author_name: nameByUserId[c.user_id] || "Someone", author_avatar: avatarByCommentUserId[c.user_id] || null });
        return acc;
      }, {}));
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  }

  function handleToggleDemoReaction(feedId, reactionId) {
    setDemoReactionsByFeedId((prev) => {
      const current = prev[feedId] || [];
      return { ...prev, [feedId]: current.map((r) => (r.id !== reactionId ? r : { ...r, active: !r.active, count: !r.active ? r.count + 1 : r.count - 1 })) };
    });
  }

  async function handleToggleReaction(item, emoji) {
    if (!user?.id || item.isDemo) return;
    const existing = (reactionsByFeedId[item.id] || []).find((r) => r.user_id === user.id && r.emoji === emoji);
    if (existing) {
      setReactionsByFeedId((prev) => ({ ...prev, [item.id]: (prev[item.id] || []).filter((r) => r.id !== existing.id) }));
      await supabase.from("feed_reactions").delete().eq("id", existing.id);
    } else {
      const { data } = await supabase.from("feed_reactions").insert({ feed_item_id: item.id, user_id: user.id, emoji }).select().single();
      if (data) {
        setReactionsByFeedId((prev) => ({ ...prev, [item.id]: [...(prev[item.id] || []), data] }));
        if (item.owner_user_id && item.owner_user_id !== user.id) {
          fetch("https://hintdrop.app/api/notifications/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: item.owner_user_id, actor_user_id: user.id, type: "reaction", entity_id: item.id, title: `${user.user_metadata?.full_name || "Someone"} reacted to your hint`, notifBody: emoji }),
          }).catch(() => {});
        }
      }
    }
  }

  async function handleSubmitComment(item) {
    if (!draftComment.trim()) return;
    if (item.isDemo) {
      setDemoCommentsByFeedId((prev) => ({ ...prev, [item.id]: [...(prev[item.id] || []), { id: `demo-${Date.now()}`, author_name: "You", body: draftComment.trim() }] }));
      setDraftComment("");
      setActiveComposerId(null);
      return;
    }
    if (!user?.id) return;
    const trimmed = draftComment.trim();
    const { error: insertError } = await supabase.from("feed_comments").insert({ feed_item_id: item.id, user_id: user.id, body: trimmed });
    if (insertError) {
      setError("Could not save comment.");
      return;
    }
    if (item.owner_user_id && item.owner_user_id !== user.id) {
      fetch("https://hintdrop.app/api/notifications/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: item.owner_user_id, actor_user_id: user.id, type: "comment", entity_id: item.id, title: `${user.user_metadata?.full_name || "Someone"} commented on your hint`, notifBody: trimmed.slice(0, 80) }),
      }).catch(() => {});
    }
    setDraftComment("");
    setActiveComposerId(null);
    loadFeed();
  }

  async function handleDeleteComment(comment) {
    if (!user?.id || comment.user_id !== user.id) return;
    await supabase.from("feed_comments").delete().eq("id", comment.id);
    setCommentsByFeedId((prev) => ({ ...prev, [comment.feed_item_id]: (prev[comment.feed_item_id] || []).filter((c) => c.id !== comment.id) }));
  }

  if (fullProfileUserId) {
    return <ProfileScreen userId={fullProfileUserId} onBack={() => setFullProfileUserId(null)} />;
  }

  const visibleFeedItems = feedItems.length > 0 ? feedItems : [demoReminderPost, demoHintPost];

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.screenTitle}>Feed</Text>
        <Text style={styles.header}>Your people, moments, and nudges.</Text>
        <ActivityIndicator color={colors.coral} style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={visibleFeedItems}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            <Text style={styles.screenTitle}>Feed</Text>
            <Text style={styles.header}>Your people, moments, and nudges.</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </>
        }
        renderItem={({ item }) => {
          const realComments = commentsByFeedId[item.id] || [];
          const mergedComments = item.isDemo ? [...(item.metadata?.demo_comments || []), ...(demoCommentsByFeedId[item.id] || [])] : realComments;
          return (
            <FeedItemCard
              item={item}
              comments={mergedComments}
              activeComposerId={activeComposerId}
              setActiveComposerId={setActiveComposerId}
              draftComment={draftComment}
              setDraftComment={setDraftComment}
              onSubmitComment={handleSubmitComment}
              demoReactionsState={demoReactionsByFeedId[item.id]}
              onToggleDemoReaction={handleToggleDemoReaction}
              onOpenProfile={setFullProfileUserId}
              onOpenHintDetail={setHintPeek}
              sessionUser={user}
              reactions={reactionsByFeedId[item.id] || []}
              onToggleReaction={handleToggleReaction}
              onDeleteComment={handleDeleteComment}
            />
          );
        }}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.coral} />}
      />
      <HintPeekModal hint={hintPeek} onClose={() => setHintPeek(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  screenTitle: { fontSize: 28, fontWeight: "700", letterSpacing: -1.1, color: colors.textPrimary, paddingHorizontal: 16, paddingTop: 16 },
  header: { fontSize: 14, fontWeight: "500", color: colors.textSecondary, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 },
  error: { color: "#c9633f", paddingHorizontal: 16, marginBottom: 8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 40, gap: 14 },
  card: { borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 16, ...shadow, shadowOpacity: 0.05 },
  cardTopRow: { flexDirection: "row", gap: 14 },
  eventIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff1e7", alignItems: "center", justifyContent: "center" },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  cardBadgeRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  actorName: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  bucketBadge: { borderRadius: radii.pill, paddingHorizontal: 9, paddingVertical: 3 },
  bucketBadgeText: { fontSize: 11, fontWeight: "700" },
  demoBadge: { borderWidth: 1, borderColor: colors.borderAlt, backgroundColor: colors.bg, borderRadius: radii.pill, paddingHorizontal: 9, paddingVertical: 3 },
  demoBadgeText: { fontSize: 11, fontWeight: "500", color: colors.textMuted },
  headline: { fontSize: 15, lineHeight: 21, color: colors.textSecondary, marginTop: 6 },
  body: { fontSize: 13, lineHeight: 19, color: colors.textMuted, marginTop: 2 },
  timestamp: { fontSize: 12, color: colors.textMuted },
  hintPreviewTile: { width: 112, height: 112, borderRadius: radii.md, overflow: "hidden", marginRight: 8, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  hintPreviewImage: { width: "100%", height: "100%", position: "absolute" },
  hintPreviewOverlay: { position: "absolute", left: 0, right: 0, bottom: 0, height: "55%", backgroundColor: "rgba(0,0,0,0.35)" },
  hintPreviewTextWrap: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 8 },
  hintPreviewTitle: { fontSize: 11, fontWeight: "700", color: "#fff" },
  hintPreviewRetailer: { fontSize: 10, color: "rgba(255,255,255,0.7)" },
  reminderBlock: { flexDirection: "row", gap: 14, borderRadius: radii.xl, padding: 14, marginTop: 14, alignItems: "center" },
  reminderDistance: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  reminderPrompt: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  reminderButtonPrimary: { height: 34, paddingHorizontal: 14, borderRadius: radii.pill, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center" },
  reminderButtonPrimaryText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  reminderButtonSecondary: { height: 34, paddingHorizontal: 14, borderRadius: radii.pill, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", ...shadow, shadowOpacity: 0.06 },
  reminderButtonSecondaryText: { fontSize: 12, fontWeight: "700", color: colors.textPrimary },
  reactionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  reactionChip: { height: 32, paddingHorizontal: 12, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.borderAlt, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  reactionChipActive: { borderColor: "#f1a58a", backgroundColor: "#fff1ea" },
  reactionChipText: { fontSize: 13, fontWeight: "500", color: colors.textSecondary },
  commentButton: { height: 32, paddingHorizontal: 12, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.borderAlt, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  commentButtonText: { fontSize: 13, fontWeight: "500", color: colors.textSecondary },
  commentsWrap: { marginTop: 14, borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingTop: 14, gap: 10 },
  commentRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderWidth: 1, borderColor: "#f0e8e3", borderRadius: radii.lg, backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 10 },
  commentText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.textSecondary },
  commentAuthor: { fontWeight: "700", color: colors.textPrimary },
  commentDelete: { fontSize: 11, color: colors.textMuted },
  composerRow: { flexDirection: "row", gap: 10, marginTop: 14, alignItems: "center" },
  composerInput: { flex: 1, height: 40, borderRadius: radii.pill, borderWidth: 1, borderColor: "#e9ddd6", backgroundColor: colors.card, paddingHorizontal: 14, fontSize: 14, color: colors.textPrimary },
  composerSend: { height: 40, paddingHorizontal: 16, borderRadius: radii.pill, backgroundColor: "#2f3b2d", alignItems: "center", justifyContent: "center" },
  composerSendText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  hintPeekOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  hintPeekCard: { backgroundColor: colors.bg, borderTopLeftRadius: radii.xxl, borderTopRightRadius: radii.xxl },
  hintPeekImage: { width: "100%", height: 220 },
  hintPeekTitle: { fontSize: 17, fontWeight: "600", color: colors.textPrimary },
  hintPeekRetailer: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  hintPeekOpenButton: { marginTop: 14, height: 44, borderRadius: radii.pill, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center" },
  hintPeekOpenText: { fontSize: 13, fontWeight: "700", color: "#fff" },
});
