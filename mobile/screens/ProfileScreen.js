import { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, Pressable, Image, ScrollView, Modal, ActivityIndicator, Alert, Linking, Animated, Share } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "../components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import GroupHintModal from "../components/GroupHintModal";
import HintImage from "../components/HintImage";
import Text from "../components/Text";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { resolveAvatarColor } from "../lib/avatarColor";
import { colors, radii, spacing, shadow } from "../lib/theme";

// Mirrors app/profile/[userId]/ProfileClient.jsx. Built against the
// real web markup - every color, radius, and piece of copy pulled
// from the actual file, not approximated.
//
// Explicitly deferred, not silently dropped:
// - The signed-out "Sign up to join {name}'s Circle" prompt - doesn't
//   apply to mobile's navigation model the same way, since the app
//   requires being signed in to reach any screen at all (unlike web,
//   where a public profile URL is reachable by anyone). A logged-out
//   visitor literally can't get to this screen on mobile.
// - Board delete-on-hover (a X button that fades in on card hover) -
//   there's no hover state on mobile; ported as a persistent small
//   delete affordance instead, shown only for the owner's own boards.

// Mirrors web's loadRatio - measures each hint's real image aspect
// ratio via Image.getSize, wrapped in a Promise the same way web
// wraps its <img> onload. Real ratios per-tile, not a fixed 3/4 for
// every card, is what actually makes the grid read as masonry rather
// than a uniform grid - measuring the images is the whole mechanism,
// not the aspectRatio style alone.
function loadImageRatio(uri) {
  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (width, height) => resolve(width > 0 && height > 0 ? width / height : null),
      () => resolve(null)
    );
  });
}

function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function daysUntilBirthday(birthday) {
  if (!birthday) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bday = new Date(birthday);
  const next = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return Math.round((next - today) / (1000 * 60 * 60 * 24));
}

const GRADIENT_PAIRS = [
  ["#d9dfcf", "#90a27e"],
  ["#ead8ca", "#c4a17f"],
  ["#efe5de", "#d1b2a4"],
  ["#d5dbee", "#8f9fc9"],
  ["#eadce8", "#bb9ab6"],
];

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

function BoardPreviewGrid({ previewHints = [] }) {
  const items = previewHints.slice(0, 4);
  function Tile({ hint, style }) {
    return (
      <View style={[{ overflow: "hidden", backgroundColor: "#ead8ca" }, style]}>
        {hint?.image_url ? <HintImage uri={hint.image_url} style={{ width: "100%", height: "100%" }} /> : null}
      </View>
    );
  }
  if (items.length === 0) return <Tile style={{ width: "100%", height: "100%" }} />;
  if (items.length === 1) return <Tile hint={items[0]} style={{ width: "100%", height: "100%" }} />;
  if (items.length === 2) {
    return (
      <View style={{ flexDirection: "row", width: "100%", height: "100%", gap: 2 }}>
        <Tile hint={items[0]} style={{ flex: 1, height: "100%" }} />
        <Tile hint={items[1]} style={{ flex: 1, height: "100%" }} />
      </View>
    );
  }
  if (items.length === 3) {
    return (
      <View style={{ flexDirection: "row", width: "100%", height: "100%", gap: 2 }}>
        <Tile hint={items[0]} style={{ flex: 1, height: "100%" }} />
        <View style={{ flex: 1, gap: 2 }}>
          <Tile hint={items[1]} style={{ flex: 1, width: "100%" }} />
          <Tile hint={items[2]} style={{ flex: 1, width: "100%" }} />
        </View>
      </View>
    );
  }
  return (
    <View style={{ flexDirection: "column", width: "100%", height: "100%", gap: 2 }}>
      <View style={{ flexDirection: "row", flex: 1, gap: 2 }}>
        <Tile hint={items[0]} style={{ flex: 1, height: "100%" }} />
        <Tile hint={items[1]} style={{ flex: 1, height: "100%" }} />
      </View>
      <View style={{ flexDirection: "row", flex: 1, gap: 2 }}>
        <Tile hint={items[2]} style={{ flex: 1, height: "100%" }} />
        <Tile hint={items[3]} style={{ flex: 1, height: "100%" }} />
      </View>
    </View>
  );
}

export default function ProfileScreen({ userId, onBack, insideModal = false, initialBoardId = null }) {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [boards, setBoards] = useState(null);
  const [selectedBoardId, setSelectedBoardId] = useState(initialBoardId);
  const [boardHintsLoading, setBoardHintsLoading] = useState(false);
  const [hints, setHints] = useState([]);
  const [hintImageRatios, setHintImageRatios] = useState({});
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("default");
  const [filterVisible, setFilterVisible] = useState(false);
  const [occasionFilter, setOccasionFilter] = useState("");
  const [claimingId, setClaimingId] = useState(null);
  const [savingHintId, setSavingHintId] = useState(null);
  const [savedHintIds, setSavedHintIds] = useState(() => new Set());
  const [groupHint, setGroupHint] = useState(null);
  const [inviteConfirmation, setInviteConfirmation] = useState(null);
  const [contactState, setContactState] = useState("none");
  const [collabStatus, setCollabStatus] = useState("none");
  const [collabStatusLoading, setCollabStatusLoading] = useState(true);
  const [requestingCollab, setRequestingCollab] = useState(false);
  const [collabRequestError, setCollabRequestError] = useState("");
  const [addingContact, setAddingContact] = useState(false);
  const [addContactError, setAddContactError] = useState("");
  const [selectedHint, setSelectedHint] = useState(null);

  const isOwnProfile = currentUser?.id === userId;
  const isViewingOther = currentUser && currentUser.id !== userId;
  const displayName = profile?.full_name || "User";
  const interests = Array.isArray(profile?.interests) ? profile.interests : [];
  const selectedBoardData = selectedBoardId ? boards?.find((b) => b.id === selectedBoardId) : null;

  const loadProfile = useCallback(async () => {
    const [{ data: profileData }, { data: boardRows }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, avatar_url, avatar_color, interests, birthday, username").eq("id", userId).maybeSingle(),
      supabase
        .from("hint_boards")
        .select("id, title, is_default")
        .eq("user_id", userId)
        .or("is_private.is.null,is_private.eq.false")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true }),
    ]);
    setProfile(profileData);

    const withPreviews = await Promise.all(
      (boardRows || []).map(async (board) => {
        const [{ count }, { data: previewHints }] = await Promise.all([
          supabase.from("hints").select("id", { count: "exact", head: true }).eq("board_id", board.id),
          supabase.from("hints").select("image_url").eq("board_id", board.id).order("position", { ascending: true }).limit(4),
        ]);
        return { ...board, hintCount: count || 0, previewHints: previewHints || [] };
      })
    );
    setBoards(withPreviews);

    if (currentUser && currentUser.id !== userId) {
      const { data: contactData } = await supabase.from("contacts").select("id, status").eq("user_id", currentUser.id).eq("profile_id", userId).maybeSingle();
      setContactState(contactData ? (contactData.status === "active" ? "active" : "pending") : "none");
    }
    setLoading(false);
  }, [userId, currentUser?.id]);

  useEffect(() => {
    setLoading(true);
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!selectedBoardId) return;
    let cancelled = false;
    async function loadBoardHints() {
      setBoardHintsLoading(true);
      const { data: hintsData } = await supabase
        .from("hints")
        .select("id, title, image_url, numeric_price, currency, retailer, url, starred, occasions, position, size, size_type, colour")
        .eq("board_id", selectedBoardId)
        .or("is_private.is.null,is_private.eq.false")
        .order("position", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(100);
      if (cancelled) return;
      const hintsList = hintsData || [];
      setHints(hintsList);
      if (currentUser && currentUser.id !== userId && hintsList.length) {
        const { data: claimsData } = await supabase.from("hint_claims").select("id, hint_id, claimed_by, claim_type").in("hint_id", hintsList.map((h) => h.id));
        if (!cancelled) setClaims(claimsData || []);
      }
      // Measured before clearing the loading flag, same as web - so
      // cards appear already correctly sized instead of showing at a
      // default ratio then visibly resizing a moment later.
      const ratios = {};
      await Promise.all(
        hintsList.filter((h) => h.image_url).map(async (h) => {
          const r = await loadImageRatio(h.image_url);
          if (r) ratios[h.id] = r;
        })
      );
      if (cancelled) return;
      setHintImageRatios(ratios);
      setBoardHintsLoading(false);
    }
    loadBoardHints();
    return () => { cancelled = true; };
  }, [selectedBoardId, currentUser?.id, userId]);

  useEffect(() => {
    setCollabStatus("none");
    if (!selectedBoardId || !currentUser || currentUser.id === userId) {
      setCollabStatusLoading(false);
      return;
    }
    setCollabStatusLoading(true);
    let cancelled = false;
    supabase
      .from("board_collaborators")
      .select("status")
      .eq("board_id", selectedBoardId)
      .eq("user_id", currentUser.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setCollabStatus(data?.status || "none");
        setCollabStatusLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedBoardId, currentUser, userId]);

  async function handleRequestCollab() {
    if (!currentUser || !selectedBoardId || requestingCollab) return;
    setRequestingCollab(true);
    setCollabRequestError("");
    const { error } = await supabase.from("board_collaborators").insert({
      board_id: selectedBoardId,
      user_id: currentUser.id,
      status: "pending",
      requested_by: currentUser.id,
    });
    setRequestingCollab(false);
    if (error) {
      setCollabRequestError(error.message);
      return;
    }
    setCollabStatus("pending");
    fetch("https://hintdrop.app/api/collab-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "request", boardId: selectedBoardId, requesterId: currentUser.id }),
    }).catch(() => {});
  }

  async function handleAddToCircle() {
    if (!currentUser) return;
    setAddingContact(true);
    setAddContactError("");
    const { error } = await supabase.functions.invoke("send-contact-invite", {
      body: { target_user_id: userId, name: profile?.full_name || "" },
    });
    if (error) {
      setAddContactError("Could not send the request. Try again.");
    } else {
      setContactState("pending");
    }
    setAddingContact(false);
  }

  async function handleToggleClaim(hint) {
    if (!currentUser || currentUser.id === userId) return;
    const myClaim = claims.find((c) => c.hint_id === hint.id && c.claimed_by === currentUser.id);
    if (myClaim) {
      setClaims((prev) => prev.filter((c) => c.id !== myClaim.id));
      await supabase.from("hint_claims").delete().eq("id", myClaim.id);
    } else {
      const { data } = await supabase.from("hint_claims").insert({ hint_id: hint.id, claimed_by: currentUser.id, claim_type: "solo" }).select().single();
      if (data) setClaims((prev) => [...prev, data]);
    }
  }

  // Same "Add to my hints" gap as web's ProfileClient.jsx (this is
  // mobile's own separate copy of the same claim/group buttons) and
  // FeedScreen.js's HintPeekModal - board_id always null, no board
  // picker in this view.
  async function handleAddToMyHints(hint) {
    if (!currentUser || savingHintId === hint.id || savedHintIds.has(hint.id)) return;
    setSavingHintId(hint.id);
    try {
      const { error } = await supabase.from("hints").insert({
        user_id: currentUser.id,
        board_id: null,
        title: hint.title?.trim() || "Saved hint",
        url: hint.url || "",
        image_url: hint.image_url || "",
        source: "shared_hint",
        is_private: false,
        retailer: hint.retailer || "",
        price_text: hint.price_text || "",
        numeric_price: hint.numeric_price ?? null,
        currency: hint.currency || null,
        starred: false,
        position: 0,
      });
      if (error) throw error;
      setSavedHintIds((prev) => new Set(prev).add(hint.id));
    } catch {
      // Swallowed - button just reverts and can be tried again.
    } finally {
      setSavingHintId(null);
    }
  }

  function handleDeleteBoard(board) {
    if (board.is_default) return;
    Alert.alert(`Delete "${board.title}"?`, `This removes the list and everything saved in it (${board.hintCount} hint${board.hintCount === 1 ? "" : "s"}). This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("hint_boards").delete().eq("id", board.id);
          if (!error) {
            setBoards((prev) => (prev || []).filter((b) => b.id !== board.id));
            if (selectedBoardId === board.id) setSelectedBoardId(null);
          }
        },
      },
    ]);
  }

  async function handleShare() {
    const url = selectedBoardId ? `https://hintdrop.app/b/${selectedBoardId}` : `https://hintdrop.app/profile/${profile?.username || userId}`;
    const title = selectedBoardId ? `${displayName}'s hint: "${selectedBoardData?.title}"` : `Check out ${displayName}'s Hints on HintDrop`;
    try {
      await Share.share({ message: `${title} ${url}` });
    } catch {
      // dismissed
    }
  }

  const allOccasions = [...new Set(hints.flatMap((h) => h.occasions || []))].filter(Boolean);
  const filteredHints = hints
    .filter((h) => {
      if (filter === "starred") return h.starred;
      if (occasionFilter) return (h.occasions || []).includes(occasionFilter);
      return true;
    })
    .sort((a, b) => {
      const aP = a.numeric_price || 0, bP = b.numeric_price || 0;
      const aHas = aP > 0, bHas = bP > 0;
      if (filter === "price_low") { if (aHas && !bHas) return -1; if (!aHas && bHas) return 1; return aP - bP; }
      if (filter === "price_high") { if (aHas && !bHas) return -1; if (!aHas && bHas) return 1; return bP - aP; }
      if (filter === "starred") return (b.starred ? 1 : 0) - (a.starred ? 1 : 0);
      return (a.position ?? 999) - (b.position ?? 999);
    });

  const birthdayDays = contactState === "active" ? daysUntilBirthday(profile?.birthday) : null;
  const c = resolveAvatarColor({ avatarColor: profile?.avatar_color, id: userId });

  const col0 = [], col1 = [];
  filteredHints.forEach((h, i) => (i % 2 === 0 ? col0 : col1).push(h));

  function HintTile({ hint, index }) {
    const [, to] = GRADIENT_PAIRS[index % GRADIENT_PAIRS.length];
    // Matches web exactly - the real measured ratio when available,
    // a 3/4 fallback otherwise (no clamping here, unlike Shop's
    // ShopCard which does clamp - web's own profile grid doesn't
    // either, so this doesn't invent a difference).
    const ratio = hint.image_url && hintImageRatios[hint.id] ? hintImageRatios[hint.id] : 3 / 4;
    return (
      <Pressable style={[styles.hintTile, { aspectRatio: ratio }]} onPress={() => setSelectedHint(hint)}>
        {hint.image_url ? (
          <HintImage uri={hint.image_url} style={styles.hintTileImage} />
        ) : (
          <View style={[styles.hintTileImage, { backgroundColor: to, alignItems: "center", justifyContent: "center" }]}>
            <Text style={{ fontSize: 32 }}>🎁</Text>
          </View>
        )}
        <LinearGradient
          colors={["transparent", "transparent", "rgba(0,0,0,0.65)"]}
          locations={[0, 0.5, 1]}
          style={styles.hintTileOverlay}
        />
        {hint.starred ? <Text style={styles.hintTileStar}>⭐</Text> : null}
        <View style={styles.hintTileTextWrap}>
          <Text style={styles.hintTileTitle} numberOfLines={2}>{hint.title || "Hint"}</Text>
          {hint.numeric_price > 0 ? (
            <View style={styles.hintTilePriceBadge}>
              <Text style={styles.hintTilePriceText}>{new Intl.NumberFormat("en-GB", { style: "currency", currency: hint.currency || "GBP" }).format(hint.numeric_price)}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  }

  return (
    // Top safe-area padding only applies when this screen is opened
    // as its own full-screen Modal (from the header's account menu) -
    // when it's rendered as a tab's own content (Hints/Feed's local
    // "view someone's profile" state), react-navigation's header
    // above it already reserves that space, so adding it again here
    // too would double up the top padding and push everything down.
    <SafeAreaView style={styles.container} edges={insideModal ? ["top", "left", "right"] : ["left", "right"]}>
      {(loading || collabStatusLoading) ? (
        <View style={styles.headerSkeletonWrap}>
          <View style={styles.headerSkeletonTopRow}>
            <Pulse style={styles.skelCircleSm} />
            <Pulse style={styles.skelPillSm} />
          </View>
          <View style={styles.headerSkeletonIdentityRow}>
            <Pulse style={styles.skelCircleLg} />
            <View style={{ flex: 1, gap: 8 }}>
              <Pulse style={styles.skelLineWide} />
              <Pulse style={styles.skelLineNarrow} />
            </View>
          </View>
          <View style={styles.headerSkeletonButtonsRow}>
            <Pulse style={styles.skelButton} />
            <Pulse style={styles.skelButton} />
          </View>
        </View>
      ) : (
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Pressable style={styles.iconButton} onPress={onBack} hitSlop={8}>
              <Text style={styles.iconButtonText}>←</Text>
            </Pressable>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable style={styles.shareButton} onPress={handleShare}>
                <Text style={styles.shareButtonText}>Share</Text>
              </Pressable>
              {selectedBoardId ? (
                <Pressable
                  style={[styles.iconButton, (filter !== "default" || occasionFilter) && styles.iconButtonActive]}
                  onPress={() => setFilterVisible(true)}
                >
                  <Icon name="filter" size={14} color={(filter !== "default" || occasionFilter) ? colors.coral : "#475569"} />
                </Pressable>
              ) : null}
            </View>
          </View>

          <View style={styles.identityRow}>
            <Pressable onPress={() => selectedBoardId && setSelectedBoardId(null)}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarImage, { alignItems: "center", justifyContent: "center", backgroundColor: c.to }]}>
                  <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>{getInitials(displayName)}</Text>
                </View>
              )}
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Pressable onPress={() => selectedBoardId && setSelectedBoardId(null)}>
                <Text style={styles.identityTitle} numberOfLines={1}>
                  {selectedBoardId && selectedBoardData && !selectedBoardData.is_default ? selectedBoardData.title : `${displayName}'s Hints`}
                </Text>
              </Pressable>
              {(!selectedBoardId || selectedBoardData?.is_default) && interests.length > 0 ? (
                <View style={styles.interestsRow}>
                  {interests.slice(0, 6).map((i) => (
                    <View key={i} style={styles.interestChip}>
                      <Text style={styles.interestChipText}>{i}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </View>

          {!isOwnProfile && currentUser ? (
            <View style={styles.relationshipRow}>
              <Pressable
                style={[
                  styles.circleButton,
                  contactState === "active" ? styles.circleButtonActive : contactState === "pending" ? styles.circleButtonPending : styles.circleButtonDefault,
                ]}
                onPress={contactState === "none" ? handleAddToCircle : undefined}
                disabled={addingContact || contactState !== "none"}
              >
                <Text
                  style={[
                    styles.circleButtonText,
                    contactState === "active" ? { color: "#3a7a3a" } : contactState === "pending" ? { color: "#a87d3a" } : { color: "#fff" },
                  ]}
                >
                  {contactState === "active" ? "✓ In your circle" : contactState === "pending" ? "Request sent" : addingContact ? "Sending..." : "+ Add to circle"}
                </Text>
              </Pressable>
              {selectedBoardId && !selectedBoardData?.is_default ? (
                <View style={{ flex: 1 }}>
                  {collabStatus === "accepted" ? (
                    <View style={[styles.circleButton, styles.collabAcceptedButton]}>
                      <Text style={styles.collabAcceptedText}>✏️ Add or edit hints</Text>
                    </View>
                  ) : collabStatus === "pending" ? (
                    <View style={[styles.circleButton, styles.collabAcceptedButton]}>
                      <Text style={styles.collabAcceptedText}>✓ Request sent</Text>
                    </View>
                  ) : (
                    <Pressable style={[styles.circleButton, styles.collabRequestButton]} onPress={handleRequestCollab} disabled={requestingCollab}>
                      <Text style={styles.collabRequestText}>👥 {requestingCollab ? "Sending..." : "Request to collaborate"}</Text>
                    </Pressable>
                  )}
                  {collabRequestError ? <Text style={styles.collabError}>{collabRequestError}</Text> : null}
                </View>
              ) : null}
            </View>
          ) : null}
          {addContactError ? <Text style={styles.collabError}>{addContactError}</Text> : null}
          {birthdayDays != null && birthdayDays <= 30 ? (
            <Text style={styles.birthdayReminder}>
              🎂 {birthdayDays === 0 ? "Birthday is today!" : birthdayDays === 1 ? "Birthday is tomorrow" : `Birthday in ${birthdayDays} days`}
            </Text>
          ) : null}
        </View>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={{ gap: 12 }}>
            <Pulse style={styles.boardSkeleton} />
            <Pulse style={styles.boardSkeleton} />
          </View>
        ) : !selectedBoardId ? (
          boards && boards.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>{displayName} hasn't shared any Hints yet</Text>
              <Text style={styles.emptySubtitle}>Check back soon</Text>
            </View>
          ) : (
            <>
              {boards && boards.length > 0 ? (
                <Text style={styles.giftCountLine}>
                  🎁 {boards.reduce((sum, b) => sum + b.hintCount, 0)} gift idea{boards.reduce((sum, b) => sum + b.hintCount, 0) === 1 ? "" : "s"} across {boards.length} Hints list{boards.length === 1 ? "" : "s"}
                </Text>
              ) : null}
              <View style={styles.boardsGrid}>
                {(boards || []).map((board) => (
                  <View key={board.id} style={styles.boardCard}>
                    <Pressable onPress={() => setSelectedBoardId(board.id)}>
                      <View style={styles.boardCardImage}>
                        <BoardPreviewGrid previewHints={board.previewHints} />
                      </View>
                      <View style={styles.boardCardFooter}>
                        <Text style={styles.boardCardTitle} numberOfLines={1}>{board.title}</Text>
                        <Text style={styles.boardCardSubtitle}>{board.hintCount} Hint{board.hintCount === 1 ? "" : "s"}</Text>
                      </View>
                    </Pressable>
                    {isOwnProfile && !board.is_default ? (
                      <Pressable style={styles.boardDeleteButton} onPress={() => handleDeleteBoard(board)} hitSlop={8}>
                        <Text style={styles.boardDeleteText}>✕</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </View>
            </>
          )
        ) : boardHintsLoading ? (
          <View style={styles.hintsColumnsWrap}>
            <View style={{ flex: 1, gap: 12 }}>
              <Pulse style={styles.hintSkeleton} />
              <Pulse style={styles.hintSkeleton} />
            </View>
            <View style={{ flex: 1, gap: 12 }}>
              <Pulse style={styles.hintSkeleton} />
              <Pulse style={styles.hintSkeleton} />
            </View>
          </View>
        ) : filteredHints.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Hints match that filter</Text>
            <Text style={styles.emptySubtitle}>Try a different filter</Text>
          </View>
        ) : (
          <View style={styles.hintsColumnsWrap}>
            <View style={{ flex: 1, gap: 12 }}>
              {col0.map((hint, i) => <HintTile key={hint.id} hint={hint} index={i * 2} />)}
            </View>
            <View style={{ flex: 1, gap: 12 }}>
              {col1.map((hint, i) => <HintTile key={hint.id} hint={hint} index={i * 2 + 1} />)}
            </View>
          </View>
        )}
      </ScrollView>

      <Modal visible={filterVisible} transparent animationType="slide" onRequestClose={() => setFilterVisible(false)}>
        <Pressable style={styles.filterOverlay} onPress={() => setFilterVisible(false)}>
          <LinearGradient colors={["transparent", "rgba(33,24,20,0.55)"]} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
          <Pressable style={styles.filterCard} onPress={() => {}}>
            <View style={styles.filterHeaderRow}>
              <Text style={styles.filterTitle}>Filter hints</Text>
              <Pressable onPress={() => setFilterVisible(false)} hitSlop={8}>
                <Text style={styles.iconButtonText}>✕</Text>
              </Pressable>
            </View>
            <View style={styles.filterChipsRow}>
              {["default", "starred", "price_low", "price_high"].map((f) => (
                <Pressable
                  key={f}
                  style={[styles.filterChip, filter === f && !occasionFilter && styles.filterChipActive]}
                  onPress={() => { setFilter(f); setOccasionFilter(""); }}
                >
                  <Text style={[styles.filterChipText, filter === f && !occasionFilter && styles.filterChipTextActive]}>
                    {f === "default" ? "All" : f === "starred" ? "⭐ Favourites" : f === "price_low" ? "Price ↑" : "Price ↓"}
                  </Text>
                </Pressable>
              ))}
            </View>
            {allOccasions.length > 0 ? (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.filterLabel}>Occasion</Text>
                <View style={styles.filterChipsRow}>
                  <Pressable style={[styles.filterChip, !occasionFilter && styles.filterChipActive]} onPress={() => setOccasionFilter("")}>
                    <Text style={[styles.filterChipText, !occasionFilter && styles.filterChipTextActive]}>All occasions</Text>
                  </Pressable>
                  {allOccasions.map((o) => (
                    <Pressable key={o} style={[styles.filterChip, occasionFilter === o && styles.filterChipActive]} onPress={() => { setOccasionFilter(o); setFilter("default"); }}>
                      <Text style={[styles.filterChipText, occasionFilter === o && styles.filterChipTextActive]}>{o}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
            <Pressable style={styles.filterDoneButton} onPress={() => setFilterVisible(false)}>
              <Text style={styles.filterDoneText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={Boolean(selectedHint)} transparent animationType="slide" onRequestClose={() => setSelectedHint(null)}>
        <Pressable style={styles.detailOverlay} onPress={() => setSelectedHint(null)}>
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.55)"]} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
          {selectedHint ? (
            <Pressable style={styles.detailCard} onPress={() => {}}>
              <ScrollView>
                <View style={styles.detailCloseRow}>
                  <Pressable style={styles.iconButton} onPress={() => setSelectedHint(null)} hitSlop={8}>
                    <Text style={styles.iconButtonText}>✕</Text>
                  </Pressable>
                </View>
                {selectedHint.image_url ? (
                  <HintImage uri={selectedHint.image_url} style={styles.detailImage} resizeMode="contain" />
                ) : (
                  <View style={[styles.detailImage, { backgroundColor: "#c4a17f", alignItems: "center", justifyContent: "center" }]}>
                    <Text style={{ fontSize: 48 }}>🎁</Text>
                  </View>
                )}
                <View style={{ padding: 20 }}>
                  {selectedHint.starred ? <Text style={styles.detailTopPick}>⭐ Top pick</Text> : null}
                  <Text style={styles.detailTitle}>{selectedHint.title || "Hint"}</Text>
                  {selectedHint.retailer ? <Text style={styles.detailRetailer}>{selectedHint.retailer}</Text> : null}
                  {selectedHint.numeric_price > 0 ? (
                    <Text style={styles.detailPrice}>{new Intl.NumberFormat("en-GB", { style: "currency", currency: selectedHint.currency || "GBP" }).format(selectedHint.numeric_price)}</Text>
                  ) : null}
                  {selectedHint.size || selectedHint.colour ? (
                    <Text style={styles.detailSizeColour}>
                      {selectedHint.size ? `📏 Size: ${selectedHint.size}${selectedHint.size_type ? ` (${selectedHint.size_type})` : ""}` : ""}
                      {selectedHint.size && selectedHint.colour ? "  ·  " : ""}
                      {selectedHint.colour ? `🎨 Colour: ${selectedHint.colour}` : ""}
                    </Text>
                  ) : null}
                  {selectedHint.occasions?.length > 0 ? (
                    <View style={styles.interestsRow}>
                      {selectedHint.occasions.map((o) => (
                        <View key={o} style={styles.interestChip}>
                          <Text style={styles.interestChipText}>{o}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  <Pressable style={styles.detailShareButton} onPress={handleShare}>
                    <Text style={styles.detailShareText}>Share this hint</Text>
                  </Pressable>
                  <View style={styles.detailActionsRow}>
                    {selectedHint.url ? (
                      <Pressable style={styles.detailOpenButton} onPress={() => Linking.openURL(selectedHint.url)}>
                        <Text style={styles.detailOpenText}>Open →</Text>
                      </Pressable>
                    ) : null}
                    {isViewingOther ? (() => {
                      const myClaim = claims.find((c) => c.hint_id === selectedHint.id && c.claimed_by === currentUser?.id);
                      const otherClaim = claims.find((c) => c.hint_id === selectedHint.id && c.claimed_by !== currentUser?.id);
                      return (
                        <Pressable
                          style={[styles.claimButton, myClaim ? styles.claimButtonMine : otherClaim ? styles.claimButtonOther : styles.claimButtonDefault]}
                          disabled={claimingId === selectedHint.id}
                          onPress={() => { setClaimingId(selectedHint.id); handleToggleClaim(selectedHint).finally(() => setClaimingId(null)); }}
                        >
                          <Text style={styles.claimButtonText}>{myClaim ? "✓ On it" : otherClaim ? "Buy anyway?" : "I'm getting this"}</Text>
                        </Pressable>
                      );
                    })() : null}
                  </View>
                  {isViewingOther ? (
                    <Pressable style={styles.groupTogetherButton} onPress={() => setGroupHint(selectedHint)}>
                      <Text style={styles.groupTogetherText}>Get group together</Text>
                    </Pressable>
                  ) : null}
                  {isViewingOther ? (
                    <Pressable
                      style={[styles.groupTogetherButton, { marginTop: 8 }, savedHintIds.has(selectedHint.id) && { backgroundColor: "#edf6eb", borderColor: "#c5dfc0" }]}
                      disabled={savingHintId === selectedHint.id || savedHintIds.has(selectedHint.id)}
                      onPress={() => handleAddToMyHints(selectedHint)}
                    >
                      <Text style={[styles.groupTogetherText, savedHintIds.has(selectedHint.id) && { color: "#4a7a3a" }]}>
                        {savedHintIds.has(selectedHint.id) ? "✓ Added to your hints" : savingHintId === selectedHint.id ? "Adding..." : "Add to my hints"}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </ScrollView>
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
      {groupHint ? (
        <GroupHintModal
          hint={groupHint}
          recipientUserId={userId}
          recipientName={displayName}
          currentUserId={currentUser?.id}
          onClose={() => setGroupHint(null)}
          onSent={(count) => {
            setGroupHint(null);
            setInviteConfirmation(count);
            setTimeout(() => setInviteConfirmation(null), 4000);
          }}
        />
      ) : null}
      {inviteConfirmation != null ? (
        <View style={styles.inviteToast}>
          <Text style={styles.inviteToastText}>
            ✓ Invite{inviteConfirmation > 1 ? "s" : ""} sent — you'll find {inviteConfirmation > 1 ? "them" : "it"} in your messages
          </Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconButton: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  iconButtonActive: { borderColor: colors.coral, backgroundColor: "#fff4ee" },
  iconButtonText: { fontSize: 15, color: colors.textSecondary },
  shareButton: { height: 36, paddingHorizontal: 14, borderRadius: radii.pill, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center", ...shadow },
  shareButtonText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  identityRow: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 12 },
  avatarImage: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: colors.border },
  identityTitle: { fontSize: 20, fontWeight: "600", color: colors.textPrimary, letterSpacing: -0.6 },
  interestsRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 },
  interestChip: { backgroundColor: "#fff4ee", borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 2 },
  interestChipText: { fontSize: 11, fontWeight: "700", color: colors.coralDeep },
  relationshipRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  circleButton: { flex: 1, height: 40, borderRadius: radii.pill, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  circleButtonDefault: { backgroundColor: colors.coral, borderColor: "transparent", ...shadow },
  circleButtonActive: { backgroundColor: "#f0faf0", borderColor: "#c3e0c3" },
  circleButtonPending: { backgroundColor: "#fff8ee", borderColor: "#f0dfc9" },
  circleButtonText: { fontSize: 13, fontWeight: "700" },
  collabAcceptedButton: { backgroundColor: colors.successBg, borderColor: colors.successBorder },
  collabAcceptedText: { fontSize: 13, fontWeight: "700", color: colors.successText },
  collabRequestButton: { backgroundColor: colors.card, borderColor: colors.border },
  collabRequestText: { fontSize: 13, fontWeight: "700", color: colors.textSecondary },
  collabError: { fontSize: 11, color: colors.errorText, marginTop: 4 },
  birthdayReminder: { fontSize: 12, fontWeight: "700", color: colors.coralDeep, marginTop: 6 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  giftCountLine: { fontSize: 13, fontWeight: "700", color: colors.textSecondary, marginBottom: 12 },
  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.textMuted },
  emptySubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  boardsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  boardCard: { width: "47%", borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: "hidden" },
  boardCardImage: { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#fdf5f0" },
  boardCardFooter: { padding: 12 },
  boardCardTitle: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  boardCardSubtitle: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  boardDeleteButton: { position: "absolute", right: 8, top: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.9)", borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  boardDeleteText: { fontSize: 11, color: colors.textMuted },
  hintsColumnsWrap: { flexDirection: "row", gap: 12 },
  hintTile: { borderRadius: radii.xl, overflow: "hidden", position: "relative", ...shadow },
  hintTileImage: { width: "100%", height: "100%", position: "absolute" },
  hintTileOverlay: { ...StyleSheet.absoluteFillObject },
  hintTileStar: { position: "absolute", top: 8, right: 8, fontSize: 16 },
  hintTileTextWrap: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 10 },
  hintTileTitle: { fontSize: 14, fontWeight: "700", color: "#fff" },
  hintTilePriceBadge: { marginTop: 4, alignSelf: "flex-start", backgroundColor: colors.coral, borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 2 },
  hintTilePriceText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  filterOverlay: { flex: 1, justifyContent: "flex-end" },
  filterCard: { backgroundColor: colors.card, borderTopLeftRadius: radii.xxl, borderTopRightRadius: radii.xxl, padding: 20 },
  filterHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  filterTitle: { fontSize: 17, fontWeight: "600", color: colors.textPrimary },
  filterChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: { height: 36, paddingHorizontal: 14, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  filterChipActive: { backgroundColor: colors.coral, borderColor: "transparent" },
  filterChipText: { fontSize: 13, fontWeight: "700", color: colors.textSecondary },
  filterChipTextActive: { color: "#fff" },
  filterLabel: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, marginBottom: 8 },
  filterDoneButton: { marginTop: 20, height: 48, borderRadius: radii.pill, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center", ...shadow },
  filterDoneText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  detailOverlay: { flex: 1, justifyContent: "flex-end" },
  detailCard: { backgroundColor: colors.bg, borderTopLeftRadius: radii.xxl, borderTopRightRadius: radii.xxl, maxHeight: "88%" },
  detailCloseRow: { flexDirection: "row", justifyContent: "flex-end", padding: 12 },
  detailImage: { width: "100%", height: 260 },
  detailTopPick: { fontSize: 11, fontWeight: "700", color: colors.coral, marginBottom: 4 },
  detailTitle: { fontSize: 18, fontWeight: "600", color: colors.textPrimary },
  detailRetailer: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  detailPrice: { fontSize: 16, fontWeight: "700", color: colors.coralDeep, marginTop: 8 },
  detailSizeColour: { fontSize: 13, color: colors.textSecondary, marginTop: 8 },
  detailShareButton: { marginTop: 16, height: 44, borderRadius: radii.pill, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center", ...shadow },
  detailShareText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  detailActionsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  detailOpenButton: { flex: 1, height: 44, borderRadius: radii.pill, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center", ...shadow },
  detailOpenText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  claimButton: { flex: 1, height: 44, borderRadius: radii.pill, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  claimButtonDefault: { backgroundColor: "#fff4ee", borderColor: "#f0c9b5" },
  claimButtonMine: { backgroundColor: "#edf6eb", borderColor: "#c5dfc0" },
  claimButtonOther: { backgroundColor: "#fff8ee", borderColor: "#f0d9a0" },
  claimButtonText: { fontSize: 13, fontWeight: "700", color: colors.coralDeep },
  groupTogetherButton: { marginTop: 10, height: 44, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  groupTogetherText: { fontSize: 13, fontWeight: "700", color: colors.textSecondary },
  inviteToast: { position: "absolute", bottom: 30, left: 24, right: 24, backgroundColor: "#2f3b2d", borderRadius: radii.pill, paddingVertical: 14, paddingHorizontal: 18, alignItems: "center", ...shadow },
  inviteToastText: { fontSize: 13, fontWeight: "700", color: "#fff", textAlign: "center" },
  headerSkeletonWrap: { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 },
  headerSkeletonTopRow: { flexDirection: "row", justifyContent: "space-between" },
  headerSkeletonIdentityRow: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 12 },
  headerSkeletonButtonsRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  skelCircleSm: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#f0e4dd" },
  skelPillSm: { width: 96, height: 36, borderRadius: 18, backgroundColor: "#f0e4dd" },
  skelCircleLg: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#f0e4dd" },
  skelLineWide: { height: 20, width: 160, borderRadius: 999, backgroundColor: "#f0e4dd" },
  skelLineNarrow: { height: 16, width: 96, borderRadius: 999, backgroundColor: "#f0e4dd" },
  skelButton: { flex: 1, height: 40, borderRadius: 999, backgroundColor: "#f0e4dd" },
  boardSkeleton: { height: 190, borderRadius: radii.xxl, backgroundColor: "#f0e4dd" },
  hintSkeleton: { height: 256, borderRadius: radii.xl, backgroundColor: "#f0e4dd" },
});
