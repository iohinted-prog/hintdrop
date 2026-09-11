import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, Pressable, Image, TextInput, ActivityIndicator, ScrollView, Modal, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Text from "../components/Text";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { colors, radii, spacing, shadow } from "../lib/theme";
import { getStoredRegion } from "../lib/region";

// Mirrors app/components/ShopPageContent.jsx. Built against the real
// file - same shop_products data (fetched from the same public
// /api/products endpoint web itself calls, so no separate mobile
// data path), same region switching as web's own Settings "Shop
// region" section (lib/region.js mirrors web's, AsyncStorage instead
// of a cookie - see there for why this was missing initially), same
// filter set (interests capped at 2, occasion, relationship, price
// band, search), same Add-to-hints board-picker flow including the
// live image-refetch-before-save behavior, same View-item affiliate-
// link resolution.
//
// Simplified, not cut: web's grid is CSS multi-column masonry
// (columns-2/3/4 with per-image measured aspect ratios and a scroll-
// anchor fix for the resulting reflow). React Native has no native
// equivalent without a fairly heavy third-party masonry library for
// what's a nice-to-have layout polish, not a feature - a fixed 2-
// column grid with a consistent card height shows the exact same
// products, filters, and actions.
//
// Explicitly deferred: per-product native share (web's navigator.
// share to HintDrop's own indexable product page, gift-shop-{region}/
// p/{id}) - that page and its metadata don't have a mobile-reachable
// equivalent to link to yet.

const interestOptions = ["Home", "Food", "Beauty", "Tech", "Travel", "Wellness", "Books", "Fashion", "Experiences", "Music", "Gaming", "Kids", "Hobbies", "Other"];
const occasionOptions = ["Birthday", "Christmas", "Anniversary", "Valentine's Day", "Mother's Day", "Father's Day", "Thank you", "New baby", "Housewarming", "Wedding", "Graduation", "Just because"];
const RELATIONSHIP_GROUPS = {
  "Partner": ["Partner", "Boyfriend", "Girlfriend", "Husband", "Wife"],
  "Family": ["Family", "Father", "Mother", "Parent", "Brother", "Sister", "Sibling", "Son", "Child"],
  "Friend": ["Friend"],
  "Colleague": ["Colleague"],
  "For him": ["For him"],
  "For her": ["For her"],
};
const relationshipOptions = Object.keys(RELATIONSHIP_GROUPS);
const priceBandOptions = [
  { label: "Under £25", max: 25 },
  { label: "£25 - £50", min: 25, max: 50 },
  { label: "£50 - £100", min: 50, max: 100 },
  { label: "£100 - £250", min: 100, max: 250 },
  { label: "£250 - £500", min: 250, max: 500 },
  { label: "£500 - £1000", min: 500, max: 1000 },
  { label: "£1000+", max: Infinity, min: 1000 },
];

function shuffleProducts(products) {
  const shuffled = [...products];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getTagArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) return value.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

function getProfileInterestTags(profile) {
  const candidates = [profile?.interests, profile?.interest_tags, profile?.onboarding_interests, profile?.gift_interests];
  for (const c of candidates) {
    const parsed = getTagArray(c);
    if (parsed.length) return parsed;
  }
  return [];
}

function normaliseRetailer(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Saved link";
  }
}

function extractNumericPrice(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (!value) return null;
  const cleaned = String(value).replace(/,/g, "");
  const match = cleaned.match(/(\d+(\.\d{1,2})?)/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function getOutboundUrl(product) {
  const affiliate = String(product?.affiliate_url || "").trim();
  const productUrl = String(product?.product_url || "").trim();
  return affiliate || productUrl || "";
}

function getDisplayPrice(product) {
  const numericPrice = typeof product?.numeric_price === "number" ? product.numeric_price : extractNumericPrice(product?.price_text);
  if (typeof numericPrice === "number" && Number.isFinite(numericPrice)) {
    const currency = product?.currency || "GBP";
    try {
      return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(numericPrice);
    } catch {
      return `${currency} ${numericPrice.toFixed(2)}`;
    }
  }
  return product?.price_text || "Price unavailable";
}

function buildHintInsertPayload(product, userId, boardId) {
  const outboundUrl = getOutboundUrl(product);
  const parsedNumericPrice = typeof product?.numeric_price === "number" ? product.numeric_price : extractNumericPrice(product?.price_text);
  return {
    user_id: userId,
    board_id: boardId || null,
    title: product?.title?.trim() || "Saved from shop",
    url: outboundUrl,
    image_url: product?.image_url || "",
    source: "shop",
    is_private: false,
    retailer: product?.retailer || normaliseRetailer(outboundUrl),
    price_text: product?.price_text || "",
    numeric_price: parsedNumericPrice,
    currency: product?.currency || null,
    starred: false,
    position: 0,
  };
}

function FilterChip({ label, selected, onPress }) {
  return (
    <Pressable style={[styles.filterChip, selected && styles.filterChipSelected]} onPress={onPress}>
      <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function ShopCard({ product, imageRatio, onPress, onAddToHints, onViewItem, isSavingHint, isOpeningLink }) {
  const displayPrice = getDisplayPrice(product);
  const retailerLabel = product.retailer || normaliseRetailer(getOutboundUrl(product));
  // Same clamp range as web's ShopCard (0.55-1.35) - lets genuinely
  // square/landscape shots read differently from portrait ones
  // instead of flattening everything to one uniform height, while
  // still keeping extreme outliers from breaking the column layout.
  const clampedRatio = imageRatio && Number.isFinite(imageRatio) ? Math.min(1.35, Math.max(0.55, imageRatio)) : 0.85;
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.cardImageWrap, { aspectRatio: clampedRatio }]}>
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImage, { backgroundColor: "#dbc0a8" }]} />
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{product.title || "Gift idea"}</Text>
        <View style={styles.cardMetaRow}>
          <Text style={styles.cardRetailer} numberOfLines={1}>{retailerLabel}</Text>
          <View style={styles.cardPriceBadge}><Text style={styles.cardPriceText}>{displayPrice}</Text></View>
        </View>
        <View style={styles.cardActionsRow}>
          <Pressable style={styles.cardAddButton} onPress={(e) => { e.stopPropagation?.(); onAddToHints(product); }} disabled={isSavingHint}>
            <Text style={styles.cardAddButtonText}>{isSavingHint ? "Adding..." : "Add to hints"}</Text>
          </Pressable>
          <Pressable style={styles.cardViewButton} onPress={(e) => { e.stopPropagation?.(); onViewItem(product); }} disabled={isOpeningLink}>
            <Text style={styles.cardViewButtonText}>{isOpeningLink ? "..." : "View"}</Text>
          </Pressable>
        </View>

      </View>
    </Pressable>
  );
}

function ProductDetailModal({ product, onClose, onAddToHints, onViewItem, isSavingHint, isOpeningLink }) {
  if (!product) return null;
  const displayPrice = getDisplayPrice(product);
  const retailerLabel = product.retailer || normaliseRetailer(getOutboundUrl(product));
  const displayTags = [...getTagArray(product.interest_tags).slice(0, 1), ...getTagArray(product.occasion_tags).slice(0, 1)].slice(0, 2);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.detailOverlay} onPress={onClose}>
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.55)"]} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
        <Pressable style={styles.detailCard} onPress={() => {}}>
          <ScrollView>
            {product.image_url ? (
              <Image source={{ uri: product.image_url }} style={styles.detailImage} resizeMode="cover" />
            ) : (
              <View style={[styles.detailImage, { backgroundColor: "#dbc0a8", alignItems: "center", justifyContent: "center" }]}><Text style={{ fontSize: 48 }}>🎁</Text></View>
            )}
            <View style={{ padding: 20 }}>
              <Text style={styles.detailTitle}>{product.title || "Gift idea"}</Text>
              {retailerLabel ? <Text style={styles.detailRetailer}>{retailerLabel}</Text> : null}
              <Text style={styles.detailPrice}>{displayPrice}</Text>
              {displayTags.length ? (
                <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                  {displayTags.map((tag) => <View key={tag} style={styles.detailTag}><Text style={styles.detailTagText}>{tag}</Text></View>)}
                </View>
              ) : null}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable style={styles.detailAddButton} onPress={() => onAddToHints(product)} disabled={isSavingHint}>
                  <Text style={styles.detailAddButtonText}>{isSavingHint ? "Adding..." : "Add to hints"}</Text>
                </Pressable>
                <Pressable style={styles.detailViewButton} onPress={() => onViewItem(product)} disabled={isOpeningLink}>
                  <Text style={styles.detailViewButtonText}>{isOpeningLink ? "Opening..." : "View item →"}</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// A collage per board, mirroring the same adaptive-grid idea
// HintsScreen.js's BoardPreview uses for the board list itself,
// simplified for this smaller context (a single image when there's
// only one, an even split otherwise) rather than duplicating its
// full 1/2/3/4-cell layout logic here.
function BoardPreviewThumb({ previewHints = [] }) {
  const items = previewHints.filter((h) => h.image_url).slice(0, 4);
  if (items.length === 0) {
    return <View style={[styles.boardGridThumb, styles.boardGridThumbEmpty]}><Text style={{ fontSize: 22 }}>🎁</Text></View>;
  }
  if (items.length === 1) {
    return (
      <View style={styles.boardGridThumb}>
        <Image source={{ uri: items[0].image_url }} style={styles.boardGridThumbFull} />
      </View>
    );
  }
  return (
    <View style={[styles.boardGridThumb, { flexDirection: "row", flexWrap: "wrap" }]}>
      {items.map((hint, i) => (
        <Image key={hint.id || i} source={{ uri: hint.image_url }} style={styles.boardGridThumbQuarter} />
      ))}
    </View>
  );
}

function BoardPickerModal({ visible, boards, loading, onSelectBoard, onClose, newBoardTitle, setNewBoardTitle, onCreateBoard, isCreatingBoard }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.detailOverlay} onPress={onClose}>
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.55)"]} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
        <Pressable style={styles.detailCard} onPress={() => {}}>
          <View style={{ padding: 20 }}>
            <Text style={styles.detailTitle}>Add to which list?</Text>
            {loading ? (
              <ActivityIndicator color={colors.coral} style={{ marginTop: 16 }} />
            ) : boards.length === 0 ? (
              <Text style={styles.emptyText}>You don't have any hint lists yet — create one below.</Text>
            ) : (
              // Matches web's actual board picker exactly - a 2-column
              // grid of square collage cards, not a plain text list -
              // web's own version here is genuinely richer than what
              // this had before, not something invented for mobile.
              <ScrollView style={{ maxHeight: 340, marginTop: 12 }}>
                <View style={styles.boardGridWrap}>
                  {boards.map((b) => (
                    <Pressable key={b.id} style={styles.boardGridItem} onPress={() => onSelectBoard(b.id)}>
                      <BoardPreviewThumb previewHints={b.previewHints} />
                      <Text style={styles.boardGridTitle} numberOfLines={1}>{b.is_private ? "🔒 " : ""}{b.title}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            )}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
              <TextInput style={[styles.formInput, { flex: 1 }]} value={newBoardTitle} onChangeText={setNewBoardTitle} placeholder="New list name" placeholderTextColor={colors.textMuted} />
              <Pressable style={styles.detailAddButton} onPress={onCreateBoard} disabled={isCreatingBoard || !newBoardTitle.trim()}>
                <Text style={styles.detailAddButtonText}>{isCreatingBoard ? "..." : "Create"}</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function ShopScreen() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [savingHintId, setSavingHintId] = useState("");
  const [openingLinkId, setOpeningLinkId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [selectedOccasion, setSelectedOccasion] = useState("");
  const [selectedRelationship, setSelectedRelationship] = useState("");
  const [selectedPriceBand, setSelectedPriceBand] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [interestLimitMessage, setInterestLimitMessage] = useState("");
  const [detailProduct, setDetailProduct] = useState(null);
  const [boardPickerProduct, setBoardPickerProduct] = useState(null);
  const [userBoards, setUserBoards] = useState([]);
  const [boardsLoading, setBoardsLoading] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [imageRatios, setImageRatios] = useState({});
  const [region, setRegion] = useState("uk");
  const measuredIdsRef = useRef(new Set());
  const toastTimerRef = useRef(null);

  // Loads the shop catalog for the given region. Pulled out of the
  // mount-time effect so it can also be re-run from useFocusEffect
  // below whenever the region changes in Settings and the person
  // comes back to this tab - React Navigation tabs stay mounted, so
  // without this a region change made in Settings wouldn't show up
  // here until the app restarted.
  const loadProducts = useCallback(async (forRegion) => {
    setLoading(true);
    setPageError("");
    try {
      if (user?.id) {
        const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
        const tags = getProfileInterestTags(profileData);
        if (tags.length) setSelectedInterests(tags.slice(0, 2));
      }
      const response = await fetch(`https://hintdrop.app/api/products?region=${forRegion}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to load shop products.");
      setProducts(shuffleProducts(Array.isArray(data?.products) ? data.products : []));
    } catch (err) {
      setPageError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    getStoredRegion().then((stored) => {
      if (!active) return;
      setRegion(stored);
      loadProducts(stored);
    });
    return () => { active = false; };
  }, [loadProducts]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getStoredRegion().then((stored) => {
        if (!active || stored === region) return;
        setRegion(stored);
        loadProducts(stored);
      });
      return () => { active = false; };
    }, [region, loadProducts])
  );

  const activeFilterCount = (selectedOccasion ? 1 : 0) + (selectedRelationship ? 1 : 0) + (selectedPriceBand ? 1 : 0) + selectedInterests.length;

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return [...products]
      .filter((product) => {
        const interestTags = getTagArray(product.interest_tags);
        const occasionTags = getTagArray(product.occasion_tags);
        const relationshipTags = getTagArray(product.relationship_tags);
        const matchesInterest = selectedInterests.length === 0 || selectedInterests.some((i) => interestTags.includes(i));
        const matchesOccasion = !selectedOccasion || occasionTags.includes(selectedOccasion);
        const matchesRelationship = !selectedRelationship || (RELATIONSHIP_GROUPS[selectedRelationship] || [selectedRelationship]).some((t) => relationshipTags.includes(t));
        const productPrice = typeof product.numeric_price === "number" ? product.numeric_price : extractNumericPrice(product.price_text);
        const priceBand = priceBandOptions.find((b) => b.label === selectedPriceBand);
        const matchesPrice = !priceBand || (typeof productPrice === "number" && productPrice <= priceBand.max && (priceBand.min === undefined || productPrice > priceBand.min));
        const searchable = [product.title, product.retailer, product.short_note, product.primary_category, product.subcategory, ...interestTags, ...occasionTags, ...relationshipTags].filter(Boolean).join(" ").toLowerCase();
        const matchesQuery = !query || searchable.includes(query);
        return matchesInterest && matchesOccasion && matchesRelationship && matchesPrice && matchesQuery;
      })
      .sort((a, b) => {
        const countA = getTagArray(a.interest_tags).filter((t) => selectedInterests.includes(t)).length;
        const countB = getTagArray(b.interest_tags).filter((t) => selectedInterests.includes(t)).length;
        return countB - countA;
      });
  }, [products, searchQuery, selectedInterests, selectedOccasion, selectedRelationship, selectedPriceBand]);

  // Measures each product's real image aspect ratio so ShopCard can
  // size itself accordingly (see the clamp logic there) - same idea
  // as HintsScreen.js/ProfileScreen.js's own hint-image measurement,
  // which is what makes those grids read as masonry instead of a
  // uniform grid. Only measures images not already measured, so
  // re-filtering doesn't re-trigger a fetch for products already
  // sized.
  useEffect(() => {
    const toMeasure = filteredProducts.filter((p) => p.image_url && !measuredIdsRef.current.has(p.id));
    if (!toMeasure.length) return;
    toMeasure.forEach((p) => measuredIdsRef.current.add(p.id));
    toMeasure.forEach((p) => {
      Image.getSize(
        p.image_url,
        (width, height) => {
          if (width > 0 && height > 0) setImageRatios((prev) => ({ ...prev, [p.id]: width / height }));
        },
        () => {}
      );
    });
  }, [filteredProducts]);

  // Plain round-robin split (item 0 -> col 0, item 1 -> col 1, ...),
  // same approach as HintsScreen.js's splitIntoColumns - not a
  // height-balancing algorithm, matching how web's own CSS columns
  // layout distributes items too.
  const productColumns = useMemo(() => {
    const columns = [[], []];
    filteredProducts.forEach((product, index) => {
      columns[index % 2].push(product);
    });
    return columns;
  }, [filteredProducts]);

  function toggleInterest(interest) {
    setSelectedInterests((current) => {
      if (current.includes(interest)) {
        setInterestLimitMessage("");
        return current.filter((i) => i !== interest);
      }
      if (current.length >= 2) {
        setInterestLimitMessage("You can only pick 2 at a time — unclick one first.");
        setTimeout(() => setInterestLimitMessage(""), 3000);
        return current;
      }
      setInterestLimitMessage("");
      return [...current, interest];
    });
  }

  function clearFilters() {
    setSelectedInterests([]);
    setSelectedOccasion("");
    setSelectedRelationship("");
    setSelectedPriceBand("");
    setSearchQuery("");
  }

  async function loadUserBoards(userId) {
    setBoardsLoading(true);
    const { data: boardRows } = await supabase.from("hint_boards").select("id, title, is_default, is_private").eq("user_id", userId).order("is_default", { ascending: false }).order("created_at", { ascending: true });
    const boardsWithCounts = await Promise.all(
      (boardRows || []).map(async (board) => {
        const [{ count }, { data: previewHints }] = await Promise.all([
          supabase.from("hints").select("id", { count: "exact", head: true }).eq("board_id", board.id),
          // Same pattern as HintsMenuClient's/ProfileClient's own board
          // previews - a handful of images per board, not the full hint
          // list, is what makes the picker feel like it's showing real
          // content instead of a bare text list of names/counts.
          supabase.from("hints").select("id, image_url").eq("board_id", board.id).order("position", { ascending: true }).limit(4),
        ]);
        return { ...board, hintCount: count || 0, previewHints: previewHints || [] };
      })
    );
    setUserBoards(boardsWithCounts);
    setBoardsLoading(false);
  }

  function handleAddToHints(product) {
    if (!user?.id) {
      setPageError("You must be signed in to save something from Shop.");
      return;
    }
    setBoardPickerProduct(product);
    loadUserBoards(user.id);
  }

  async function confirmAddToBoard(boardId) {
    const product = boardPickerProduct;
    if (!product || !user?.id) return;
    setSavingHintId(product.id);
    setPageError("");
    setSuccessMessage("");
    setBoardPickerProduct(null);
    setDetailProduct(null);
    try {
      // Same live image-refetch-before-save as web - shop catalog
      // images are sometimes genuinely poor (favicons, tiny grid
      // thumbnails), so try a fresher one from the retailer's own
      // page first, bounded so a slow/blocked retailer never holds
      // up the save.
      let refetchedImage = null;
      const scrapeUrl = String(product?.product_url || "").trim() || getOutboundUrl(product);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 18000);
        const res = await fetch("https://hintdrop.app/api/link-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: scrapeUrl }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          if (data?.image && typeof data.image === "string" && data.image.startsWith("http")) refetchedImage = data.image;
        }
      } catch {
        // fall through to the shop's own stored image
      }
      const productForInsert = refetchedImage ? { ...product, image_url: refetchedImage } : product;
      const payload = buildHintInsertPayload(productForInsert, user.id, boardId);
      const { error } = await supabase.from("hints").insert(payload);
      if (error) throw error;
      setSuccessMessage(`Added "${product.title || "item"}" to your hints.`);
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setSuccessMessage(""), 3200);
    } catch (err) {
      setPageError(err?.message || "Something went wrong.");
    } finally {
      setSavingHintId("");
    }
  }

  async function createBoardAndAdd() {
    const title = newBoardTitle.trim();
    if (!title || !user?.id) return;
    setIsCreatingBoard(true);
    try {
      const { data: newBoard, error } = await supabase.from("hint_boards").insert({ user_id: user.id, title, is_default: false, is_private: false }).select("id").single();
      if (error) throw error;
      setNewBoardTitle("");
      await confirmAddToBoard(newBoard.id);
    } catch (err) {
      setPageError(err?.message || "Something went wrong.");
    } finally {
      setIsCreatingBoard(false);
    }
  }

  async function handleViewItem(product) {
    const existingAffiliateUrl = String(product?.affiliate_url || "").trim();
    const destinationUrl = String(product?.product_url || "").trim();
    if (existingAffiliateUrl) {
      Linking.openURL(existingAffiliateUrl);
      return;
    }
    if (!destinationUrl) {
      setPageError("No product URL is available for this item.");
      return;
    }
    setOpeningLinkId(product.id);
    setPageError("");
    try {
      const response = await fetch("https://hintdrop.app/api/affiliate-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinationUrl, network: product?.network || "manual", campaignId: product?.campaign_id || null, product: { id: product?.id, network: product?.network, campaign_id: product?.campaign_id } }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to create affiliate link.");
      Linking.openURL(data?.url || destinationUrl);
    } catch (err) {
      setPageError(err?.message || "Something went wrong.");
    } finally {
      setOpeningLinkId("");
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.screenTitle}>Shop</Text>
        <ActivityIndicator color={colors.coral} style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.listContent}>
        <Text style={styles.screenTitle}>Shop</Text>
        <Text style={styles.subtitle}>Curated gift ideas, then save the good ones to hints.</Text>
        <Text style={styles.affiliateNote}>Some links may be affiliate links. If you buy through them, HintDrop may earn a commission at no extra cost to you.</Text>

        <TextInput style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} placeholder="Search gifts, retailers, interests..." placeholderTextColor={colors.textMuted} />

        <Pressable style={styles.filtersToggle} onPress={() => setFiltersOpen((v) => !v)}>
          <Text style={styles.filtersToggleText}>Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}</Text>
        </Pressable>

        {filtersOpen ? (
          <View style={styles.filtersPanel}>
            <Text style={styles.filterLabel}>Interests (pick up to 2)</Text>
            <View style={styles.chipsRow}>
              {interestOptions.map((i) => <FilterChip key={i} label={i} selected={selectedInterests.includes(i)} onPress={() => toggleInterest(i)} />)}
            </View>
            {interestLimitMessage ? <Text style={styles.limitMessage}>{interestLimitMessage}</Text> : null}

            <Text style={styles.filterLabel}>Occasion</Text>
            <View style={styles.chipsRow}>
              {occasionOptions.map((o) => <FilterChip key={o} label={o} selected={selectedOccasion === o} onPress={() => setSelectedOccasion((v) => (v === o ? "" : o))} />)}
            </View>

            <Text style={styles.filterLabel}>Relationship</Text>
            <View style={styles.chipsRow}>
              {relationshipOptions.map((r) => <FilterChip key={r} label={r} selected={selectedRelationship === r} onPress={() => setSelectedRelationship((v) => (v === r ? "" : r))} />)}
            </View>

            <Text style={styles.filterLabel}>Price</Text>
            <View style={styles.chipsRow}>
              {priceBandOptions.map((p) => <FilterChip key={p.label} label={p.label} selected={selectedPriceBand === p.label} onPress={() => setSelectedPriceBand((v) => (v === p.label ? "" : p.label))} />)}
            </View>

            {activeFilterCount > 0 || searchQuery ? (
              <Pressable onPress={clearFilters}><Text style={styles.clearFiltersText}>Clear filters</Text></Pressable>
            ) : null}
          </View>
        ) : null}

        {pageError ? <Text style={styles.errorText}>{pageError}</Text> : null}

        {filteredProducts.length === 0 ? (
          <Text style={styles.emptyText}>No products match those filters yet.</Text>
        ) : (
          // Two side-by-side columns of plain Views (not FlatList) -
          // this IS the masonry: each column stacks its own cards at
          // their own measured heights, so the two columns naturally
          // fall out of sync with each other rather than lining up
          // row by row, matching web's CSS-columns look.
          <View style={styles.masonryRow}>
            {productColumns.map((column, colIndex) => (
              <View key={colIndex} style={styles.masonryColumn}>
                {column.map((item) => (
                  <ShopCard
                    key={item.id}
                    product={item}
                    imageRatio={imageRatios[item.id]}
                    onPress={() => setDetailProduct(item)}
                    onAddToHints={handleAddToHints}
                    onViewItem={handleViewItem}
                    isSavingHint={savingHintId === item.id}
                    isOpeningLink={openingLinkId === item.id}
                  />
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <ProductDetailModal product={detailProduct} onClose={() => setDetailProduct(null)} onAddToHints={handleAddToHints} onViewItem={handleViewItem} isSavingHint={savingHintId === detailProduct?.id} isOpeningLink={openingLinkId === detailProduct?.id} />

      <BoardPickerModal
        visible={Boolean(boardPickerProduct)}
        boards={userBoards}
        loading={boardsLoading}
        onSelectBoard={confirmAddToBoard}
        onClose={() => setBoardPickerProduct(null)}
        newBoardTitle={newBoardTitle}
        setNewBoardTitle={setNewBoardTitle}
        onCreateBoard={createBoardAndAdd}
        isCreatingBoard={isCreatingBoard}
      />

      {successMessage ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>✓ {successMessage}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  screenTitle: { fontSize: 28, fontWeight: "700", letterSpacing: -1.1, color: colors.textPrimary, marginTop: 16, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 6 },
  affiliateNote: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
  searchInput: { height: 46, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 14, fontSize: 14, color: colors.textPrimary, marginTop: 14 },
  filtersToggle: { alignSelf: "flex-start", marginTop: 10, height: 34, paddingHorizontal: 14, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  filtersToggleText: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
  filtersPanel: { marginTop: 12, padding: 14, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  filterLabel: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, marginTop: 10, marginBottom: 6 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  filterChip: { borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg },
  filterChipSelected: { backgroundColor: "#e3f5ea", borderColor: "#e3f5ea" },
  filterChipText: { fontSize: 12, color: colors.textSecondary },
  filterChipTextSelected: { color: "#2f8a5f", fontWeight: "600" },
  limitMessage: { fontSize: 11, color: "#c9633f", marginTop: 4 },
  clearFiltersText: { fontSize: 12, fontWeight: "700", color: colors.coral, marginTop: 12 },
  errorText: { color: "#b14f43", fontSize: 13, marginTop: 12 },
  emptyText: { textAlign: "center", color: colors.textMuted, marginTop: 30 },
  masonryRow: { flexDirection: "row", gap: 12 },
  masonryColumn: { flex: 1, minWidth: 0 },
  card: { width: "100%", borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: "hidden", marginTop: 12 },
  cardImageWrap: { width: "100%", backgroundColor: "#fdf5f0" },
  cardImage: { width: "100%", height: "100%" },
  cardBody: { padding: 10 },
  cardTitle: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  cardMetaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4, gap: 6 },
  cardRetailer: { fontSize: 11, color: colors.textMuted, flex: 1 },
  cardPriceBadge: { borderWidth: 1, borderColor: "#f0a384", backgroundColor: "#fff4ee", borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 2 },
  cardPriceText: { fontSize: 10, fontWeight: "700", color: "#df7b59" },
  cardActionsRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  cardAddButton: { flex: 1, height: 30, borderRadius: radii.pill, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center" },
  cardAddButtonText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  cardViewButton: { flex: 1, height: 30, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  cardViewButtonText: { fontSize: 10, fontWeight: "700", color: colors.textSecondary },
  detailOverlay: { flex: 1, justifyContent: "flex-end" },
  detailCard: { backgroundColor: colors.bg, borderTopLeftRadius: radii.xxl, borderTopRightRadius: radii.xxl, maxHeight: "88%" },
  detailImage: { width: "100%", height: 260 },
  detailTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  detailRetailer: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  detailPrice: { fontSize: 15, fontWeight: "700", color: "#df7b59", marginTop: 6, marginBottom: 12 },
  detailTag: { backgroundColor: "#fff4ee", borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 4 },
  detailTagText: { fontSize: 11, fontWeight: "700", color: "#df7b59" },
  detailAddButton: { flex: 1, height: 44, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  detailAddButtonText: { fontSize: 13, fontWeight: "700", color: colors.textSecondary },
  detailViewButton: { flex: 1, height: 44, borderRadius: radii.pill, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center" },
  detailViewButtonText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  formInput: { height: 44, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 12, fontSize: 13, color: colors.textPrimary },
  boardGridWrap: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  boardGridItem: { width: "47%" },
  boardGridThumb: { width: "100%", aspectRatio: 1, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, overflow: "hidden", backgroundColor: "#fdf5f0" },
  boardGridThumbEmpty: { alignItems: "center", justifyContent: "center" },
  boardGridThumbFull: { width: "100%", height: "100%" },
  boardGridThumbQuarter: { width: "50%", height: "50%" },
  boardGridTitle: { fontSize: 13, fontWeight: "600", color: colors.textPrimary, marginTop: 6 },
  toast: { position: "absolute", bottom: 24, left: 20, right: 20, backgroundColor: "#f3fbf1", borderWidth: 1, borderColor: "#d8e8d3", borderRadius: radii.pill, paddingVertical: 12, paddingHorizontal: 18, alignItems: "center", ...shadow },
  toastText: { fontSize: 13, fontWeight: "700", color: "#3a7d55" },
});
