import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Image,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Share,
  Linking,
  Alert,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

// Simplified starting point, not the full web version
// (app/hints/[boardId]/HintsClient.jsx): no drag-to-reorder, no
// occasions picker, no gradient-fallback stock photo search for
// non-URL ideas, no editing an existing hint, no board creation from
// this screen (board list is read-only - shows existing boards from
// hint_boards). What's here is genuinely real though: actual
// Supabase data for both boards and hints, and the add-hint flow
// calls the exact same /api/link-preview endpoint the website itself
// uses for scraping a pasted link, rather than reimplementing that
// logic natively.
const CARD_GAP = 12;

function HintCard({ hint, aspectRatio, onPress }) {
  const ratio = aspectRatio || 1;
  const priceLabel = hint.price_text || null;
  return (
    <Pressable style={[styles.card, { aspectRatio: ratio }]} onPress={onPress}>
      {hint.image_url ? (
        <Image source={{ uri: hint.image_url }} style={styles.cardImage} resizeMode="cover" />
      ) : (
        <View style={[styles.cardImage, styles.cardImageFallback]} />
      )}
      {/* Approximates the web version's black/60-to-transparent gradient
          scrim with a flat semi-transparent overlay - true gradient
          would need expo-linear-gradient, a native package, which
          would force a rebuild mid Expo-Go session. Worth adding for
          real once back on a native build. */}
      <View style={styles.cardScrim} pointerEvents="none" />
      {hint.is_private ? <Text style={styles.cardBadgeLeft}>🔒</Text> : null}
      {hint.starred ? <Text style={styles.cardBadgeRight}>★</Text> : null}
      <View style={styles.cardOverlayContent}>
        <Text style={styles.cardOverlayTitle} numberOfLines={1}>
          {hint.title || "Hint"}
        </Text>
        {priceLabel ? (
          <View style={styles.cardPricePill}>
            <Text style={styles.cardPriceText}>{priceLabel}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

// Mirrors splitIntoColumns in HintsClient.jsx exactly: plain
// round-robin (item 0 -> col 0, item 1 -> col 1, item 2 -> col 0...),
// not a height-balancing algorithm.
function splitIntoColumns(items, columnCount = 2) {
  const columns = Array.from({ length: columnCount }, () => []);
  items.forEach((item, index) => {
    columns[index % columnCount].push(item);
  });
  return columns;
}

// Mirrors buildShareUrl/buildShareText in lib/share.js exactly - a
// random 8-char token appended as ?s=, and "{name}'s hint: \"title\""
// (or just "{name}'s hint" with no title) as the share text. Skips
// trackShareEvent's analytics write - that's a pure tracking side
// effect, not something the shared link/text depends on.
function buildShareUrl(path) {
  const token = Math.random().toString(36).slice(2, 10);
  const url = new URL(path, "https://hintdrop.app");
  url.searchParams.set("s", token);
  return url.toString();
}

function buildShareText({ sharerName, title }) {
  const name = (sharerName || "").trim() || "Someone";
  return title ? `${name}'s hint: "${title}"` : `${name}'s hint`;
}

function PreviewCell({ hint }) {
  return hint?.image_url ? (
    <Image source={{ uri: hint.image_url }} style={styles.previewCellImage} resizeMode="cover" />
  ) : (
    <View style={[styles.previewCellImage, styles.previewCellFallback]} />
  );
}

// Mirrors BoardPreviewGrid.jsx's adaptive layout exactly: 1 hint fills
// the whole banner, 2 split evenly side by side, 3 is one large cell
// plus two stacked, 4+ is a 2x2 grid. An empty board shows the same
// gradient-style fallback as a single missing-image cell.
function BoardPreview({ previewHints = [] }) {
  const items = previewHints.slice(0, 4);
  const count = items.length;

  if (count === 0) return <PreviewCell hint={null} />;
  if (count === 1) return <PreviewCell hint={items[0]} />;

  if (count === 2) {
    return (
      <View style={styles.previewRowFlex}>
        <PreviewCell hint={items[0]} />
        <PreviewCell hint={items[1]} />
      </View>
    );
  }

  if (count === 3) {
    return (
      <View style={styles.previewRowFlex}>
        <View style={styles.previewColFlex}>
          <PreviewCell hint={items[0]} />
        </View>
        <View style={styles.previewColFlex}>
          <PreviewCell hint={items[1]} />
          <PreviewCell hint={items[2]} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.previewRowFlex}>
      <View style={styles.previewColFlex}>
        <PreviewCell hint={items[0]} />
        <PreviewCell hint={items[2]} />
      </View>
      <View style={styles.previewColFlex}>
        <PreviewCell hint={items[1]} />
        <PreviewCell hint={items[3]} />
      </View>
    </View>
  );
}

function HintDetailModal({ hint, visible, onClose, onUpdated, onEdit, sharerName }) {
  const [isPrivate, setIsPrivate] = useState(false);
  const [starred, setStarred] = useState(false);

  useEffect(() => {
    if (hint) {
      setIsPrivate(Boolean(hint.is_private));
      setStarred(Boolean(hint.starred));
    }
  }, [hint]);

  if (!hint) return null;

  async function updateField(field, value, setLocal) {
    setLocal(value);
    const { error } = await supabase.from("hints").update({ [field]: value }).eq("id", hint.id);
    if (error) {
      setLocal(!value);
      return;
    }
    onUpdated();
  }

  async function handleShare() {
    const url = buildShareUrl(`/h/${hint.id}`);
    try {
      await Share.share({
        message: `${buildShareText({ sharerName, title: hint.title })} ${url}`,
      });
    } catch {
      // Dismissed - nothing to do.
    }
  }

  function handleOpenLink() {
    if (hint.url) Linking.openURL(hint.url).catch(() => {});
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.detailBackdrop} onPress={onClose}>
        <Pressable style={styles.detailSheet} onPress={() => {}}>
          <ScrollView>
            <View style={styles.detailCloseRow}>
              <Pressable style={styles.detailCloseButton} onPress={onClose}>
                <Text style={styles.detailCloseText}>✕</Text>
              </Pressable>
            </View>

            {hint.image_url ? (
              <Image source={{ uri: hint.image_url }} style={styles.detailImage} resizeMode="cover" />
            ) : (
              <View style={[styles.detailImage, styles.cardImageFallback]} />
            )}

            <View style={styles.detailBody}>
              <Text style={styles.detailTitle}>
                {isPrivate ? "🔒 " : ""}
                {hint.title || "Hint"}
              </Text>
              {hint.retailer ? <Text style={styles.detailRetailer}>{hint.retailer}</Text> : null}
              {hint.size || hint.colour ? (
                <Text style={styles.detailSizeColour}>
                  {hint.size ? `📏 Size: ${hint.size}${hint.size_type ? ` (${hint.size_type})` : ""}` : ""}
                  {hint.size && hint.colour ? "  ·  " : ""}
                  {hint.colour ? `🎨 Colour: ${hint.colour}` : ""}
                </Text>
              ) : null}
              {hint.price_text ? <Text style={styles.detailPrice}>{hint.price_text}</Text> : null}

              <View style={styles.detailToggleRow}>
                <Pressable
                  style={styles.detailToggleButton}
                  onPress={() => updateField("is_private", !isPrivate, setIsPrivate)}
                >
                  <Text style={styles.detailToggleText}>{isPrivate ? "🔒 Private" : "Public"}</Text>
                </Pressable>
                <Pressable
                  style={[styles.detailToggleButton, starred && styles.detailToggleButtonActive]}
                  onPress={() => updateField("starred", !starred, setStarred)}
                >
                  <Text
                    style={[styles.detailToggleText, starred && styles.detailToggleTextActive]}
                  >
                    {starred ? "★ Top pick" : "☆ Star"}
                  </Text>
                </Pressable>
              </View>

              <Pressable style={styles.detailShareButton} onPress={() => handleShare()}>
                <Text style={styles.detailShareText}>Share this hint</Text>
              </Pressable>

              <View style={styles.detailToggleRow}>
                <Pressable
                  style={styles.detailToggleButton}
                  onPress={() => {
                    onClose();
                    onEdit(hint);
                  }}
                >
                  <Text style={styles.detailToggleText}>Edit</Text>
                </Pressable>
                {hint.url ? (
                  <Pressable style={styles.detailOpenButton} onPress={handleOpenLink}>
                    <Text style={styles.detailOpenText}>Open →</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function EditHintModal({ hint, visible, onClose, onSaved, onDeleted }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [priceText, setPriceText] = useState("");
  const [size, setSize] = useState("");
  const [colour, setColour] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (hint) {
      setTitle(hint.title || "");
      setUrl(hint.url || "");
      setPriceText(hint.price_text || "");
      setSize(hint.size || "");
      setColour(hint.colour || "");
      setError("");
    }
  }, [hint]);

  if (!hint) return null;

  async function handleSave() {
    setSaving(true);
    setError("");
    const { error: updateError } = await supabase
      .from("hints")
      .update({
        title: title.trim() || "Hint",
        url: url.trim() || null,
        price_text: priceText.trim() || null,
        size: size.trim() || null,
        colour: colour.trim() || null,
      })
      .eq("id", hint.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onSaved();
    onClose();
  }

  function confirmDelete() {
    Alert.alert(
      "Delete this hint?",
      `"${hint.title || "This hint"}" will be removed for good. This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: handleDelete },
      ]
    );
  }

  async function handleDelete() {
    setDeleting(true);
    setError("");
    const { error: deleteError } = await supabase.from("hints").delete().eq("id", hint.id);
    setDeleting(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    onDeleted();
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.modalSheet, styles.editSheet]}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.editHeaderRow}>
              <Text style={styles.modalTitle}>Edit hint</Text>
              <Pressable style={styles.deleteButton} onPress={confirmDelete} disabled={deleting}>
                {deleting ? (
                  <ActivityIndicator color="#c9633f" size="small" />
                ) : (
                  <Text style={styles.deleteButtonText}>Delete</Text>
                )}
              </Pressable>
            </View>

            <Text style={styles.editLabel}>Link</Text>
            <TextInput
              style={styles.modalInput}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <Text style={styles.editLabel}>Name</Text>
            <TextInput style={styles.modalInput} value={title} onChangeText={setTitle} />

            <Text style={styles.editLabel}>Price</Text>
            <TextInput style={styles.modalInput} value={priceText} onChangeText={setPriceText} />

            <View style={styles.editRow}>
              <View style={styles.editRowItem}>
                <Text style={styles.editLabel}>Size</Text>
                <TextInput
                  style={styles.modalInput}
                  value={size}
                  onChangeText={setSize}
                  placeholder='M, 12 1/2'
                  placeholderTextColor="#c9b8ab"
                />
              </View>
              <View style={styles.editRowItem}>
                <Text style={styles.editLabel}>Colour</Text>
                <TextInput
                  style={styles.modalInput}
                  value={colour}
                  onChangeText={setColour}
                  placeholder="Navy"
                  placeholderTextColor="#c9b8ab"
                />
              </View>
            </View>

            {error ? <Text style={styles.modalError}>{error}</Text> : null}

            <View style={styles.modalButtonRow}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={onClose}
                disabled={saving}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalButton} onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Save</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function BoardCard({ board, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.boardCard, pressed && styles.boardCardPressed]}
      onPress={onPress}
    >
      <View style={styles.boardPreviewWrap}>
        <BoardPreview previewHints={board.previewHints} />
      </View>
      <View style={styles.boardCardFooter}>
        <View style={styles.boardCardText}>
          <Text style={styles.boardTitle} numberOfLines={1}>
            {board.is_private ? "🔒 " : ""}
            {board.title}
          </Text>
          <Text style={styles.boardSubtitle}>
            {board.is_default ? "Personal" : "Hints for someone else"} · {board.hintCount}{" "}
            {board.hintCount === 1 ? "Hint" : "Hints"}
          </Text>
        </View>
        <Text style={styles.boardArrow}>→</Text>
      </View>
    </Pressable>
  );
}

// Mirrors isValidHttpUrl in HintsClient.jsx exactly - used to decide
// whether typed input goes through the link-preview scraper or
// becomes a manual (no scraping) hint straight away.
function isValidHttpUrl(value = "") {
  const trimmed = String(value || "").trim();
  if (!trimmed || /\s/.test(trimmed)) return false;
  try {
    const withProtocol =
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    return (
      ["http:", "https:"].includes(parsed.protocol) && /\.[a-z]{2,}$/i.test(parsed.hostname)
    );
  } catch {
    return false;
  }
}

function AddHintModal({ visible, onClose, onSaved, boardId, initialUrl }) {
  const { user } = useAuth();
  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [title, setTitle] = useState("");
  const [priceText, setPriceText] = useState("");
  const [size, setSize] = useState("");
  const [colour, setColour] = useState("");
  const [imageUrl, setImageUrl] = useState(null);
  const [retailer, setRetailer] = useState(null);
  const [numericPrice, setNumericPrice] = useState(null);
  const [currency, setCurrency] = useState(null);
  const [error, setError] = useState("");

  function reset() {
    setUrl("");
    setReviewing(false);
    setTitle("");
    setPriceText("");
    setSize("");
    setColour("");
    setImageUrl(null);
    setRetailer(null);
    setNumericPrice(null);
    setCurrency(null);
    setError("");
  }

  async function handleFetch(urlToFetch) {
    const trimmed = (urlToFetch ?? url).trim();
    if (!trimmed) {
      setError("Paste a link, or type what you have in mind.");
      return;
    }

    // Not a real URL - matches the web app's own behaviour when the
    // input doesn't look like a link: skip scraping entirely and go
    // straight to review with the typed text as the title. (The web
    // version also offers an AI-generated idea/image at this point -
    // that's a separate, larger feature not built here yet, so this
    // is a genuine but simpler fallback: the typed text becomes a
    // real, savable hint rather than erroring out.)
    if (!isValidHttpUrl(trimmed)) {
      setTitle(trimmed);
      setPriceText("");
      setImageUrl(null);
      setRetailer(null);
      setNumericPrice(null);
      setCurrency(null);
      setReviewing(true);
      setError("");
      return;
    }

    setFetching(true);
    setError("");
    try {
      const res = await fetch("https://hintdrop.app/api/link-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Couldn't fetch that link.");
      setTitle(data.title || "");
      setPriceText(data.priceText || "");
      setImageUrl(data.selectedImage || data.image || null);
      setRetailer(data.siteName || null);
      setNumericPrice(data.numericPrice ?? null);
      setCurrency(data.detectedCurrency || null);
      setReviewing(true);
    } catch (err) {
      setError(err?.message || "Couldn't fetch that link.");
    } finally {
      setFetching(false);
    }
  }

  // When opened from the board page's inline "Paste a URL or describe
  // an experience..." field (the real entry point on web, rather than
  // a separate trigger button), the URL arrives already typed - kick
  // the fetch off immediately instead of making the person retype it
  // into a second field inside the modal.
  useEffect(() => {
    if (visible && initialUrl) {
      setUrl(initialUrl);
      handleFetch(initialUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialUrl]);

  async function handleSave() {
    if (!user?.id) return;
    setSaving(true);
    setError("");
    try {
      const { data: maxRow } = await supabase
        .from("hints")
        .select("position")
        .eq("user_id", user.id)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextPosition = (maxRow?.position ?? -1) + 1;

      const { error: insertError } = await supabase.from("hints").insert({
        user_id: user.id,
        board_id: boardId,
        title: title.trim() || "Shared item",
        url: isValidHttpUrl(url) ? url.trim() : null,
        image_url: imageUrl,
        retailer,
        price_text: priceText.trim() || null,
        numeric_price: numericPrice,
        currency,
        size: size.trim() || null,
        colour: colour.trim() || null,
        source: "preview",
        is_private: false,
        starred: false,
        position: nextPosition,
      });
      if (insertError) throw insertError;

      reset();
      onSaved();
      onClose();
    } catch (err) {
      setError(err?.message || "Couldn't save that hint.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.modalSheet, styles.editSheet]}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>
              {reviewing ? "Review before saving" : "Add a hint"}
            </Text>

            {!reviewing ? (
              <TextInput
                style={styles.modalInput}
                placeholder="Paste a link or describe an experience"
                placeholderTextColor="#94a3b8"
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />
            ) : (
              <>
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.reviewImage} resizeMode="cover" />
                ) : null}

                <Text style={styles.editLabel}>Link</Text>
                <TextInput
                  style={styles.modalInput}
                  value={url}
                  onChangeText={setUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={styles.editLabel}>Name</Text>
                <TextInput style={styles.modalInput} value={title} onChangeText={setTitle} />

                <Text style={styles.editLabel}>Price</Text>
                <TextInput
                  style={styles.modalInput}
                  value={priceText}
                  onChangeText={setPriceText}
                  placeholder="Optional"
                  placeholderTextColor="#c9b8ab"
                />

                <View style={styles.editRow}>
                  <View style={styles.editRowItem}>
                    <Text style={styles.editLabel}>Size</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={size}
                      onChangeText={setSize}
                      placeholder='M, 12 1/2'
                      placeholderTextColor="#c9b8ab"
                    />
                  </View>
                  <View style={styles.editRowItem}>
                    <Text style={styles.editLabel}>Colour</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={colour}
                      onChangeText={setColour}
                      placeholder="Navy"
                      placeholderTextColor="#c9b8ab"
                    />
                  </View>
                </View>
              </>
            )}

            {error ? <Text style={styles.modalError}>{error}</Text> : null}

            <View style={styles.modalButtonRow}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  reset();
                  onClose();
                }}
                disabled={fetching || saving}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </Pressable>

              {reviewing ? (
                <Pressable style={styles.modalButton} onPress={handleSave} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalButtonText}>Save hint</Text>
                  )}
                </Pressable>
              ) : (
                <Pressable style={styles.modalButton} onPress={() => handleFetch()} disabled={fetching}>
                  {fetching ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalButtonText}>Continue</Text>
                  )}
                </Pressable>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function BoardListScreen({ onSelectBoard }) {
  const { user } = useAuth();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadBoards = useCallback(async () => {
    if (!user?.id) return;
    setError("");
    const { data: boardRows, error: boardsError } = await supabase
      .from("hint_boards")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });

    if (boardsError) {
      setError(boardsError.message);
      return;
    }

    // Same shape as the web app's board menu: an exact count plus up
    // to 4 preview thumbnails per board, fetched together.
    const withPreviews = await Promise.all(
      (boardRows || []).map(async (board) => {
        const [{ count }, { data: previewHints }] = await Promise.all([
          supabase
            .from("hints")
            .select("id", { count: "exact", head: true })
            .eq("board_id", board.id),
          supabase
            .from("hints")
            .select("image_url")
            .eq("board_id", board.id)
            .order("position", { ascending: true })
            .limit(4),
        ]);
        return { ...board, hintCount: count || 0, previewHints: previewHints || [] };
      })
    );
    setBoards(withPreviews);
  }, [user?.id]);

  useEffect(() => {
    setLoading(true);
    loadBoards().finally(() => setLoading(false));
  }, [loadBoards]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadBoards();
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Hints</Text>
      </View>

      {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

      <FlatList
        key="board-list"
        data={boards}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BoardCard board={item} onPress={() => onSelectBoard(item)} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#ff875d" />
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No lists yet.</Text>
          </View>
        }
      />
    </View>
  );
}

function BoardHintsScreen({ board, onBack }) {
  const { user } = useAuth();
  const [hints, setHints] = useState([]);
  const [imageRatios, setImageRatios] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [modalInitialUrl, setModalInitialUrl] = useState(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [isPrivate, setIsPrivate] = useState(Boolean(board.is_private));
  const [sharerName, setSharerName] = useState("");
  const [selectedHint, setSelectedHint] = useState(null);
  const [editingHint, setEditingHint] = useState(null);
  const [error, setError] = useState("");

  const loadHints = useCallback(async () => {
    if (!user?.id) return;
    setError("");
    const { data, error } = await supabase
      .from("hints")
      .select("*")
      .eq("user_id", user.id)
      .eq("board_id", board.id)
      .order("position", { ascending: false });

    if (error) {
      setError(error.message);
      return;
    }
    setHints(data || []);

    // Same idea as loadImageAspectRatio on web: measure each hint's
    // actual image so the card height reflects its real proportions
    // (a tall product photo gets a taller card) rather than forcing
    // every card into a uniform square - that variation is what makes
    // it read as masonry instead of a plain grid.
    (data || []).forEach((hint) => {
      if (!hint.image_url) return;
      Image.getSize(
        hint.image_url,
        (width, height) => {
          if (width > 0 && height > 0) {
            setImageRatios((prev) => ({ ...prev, [hint.id]: width / height }));
          }
        },
        () => {
          // Couldn't measure it (broken URL, etc.) - HintCard already
          // falls back to a 1:1 square via aspectRatio's own default.
        }
      );
    });
  }, [user?.id, board.id]);

  useEffect(() => {
    setLoading(true);
    loadHints().finally(() => setLoading(false));
  }, [loadHints]);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.full_name) setSharerName(data.full_name);
      });
  }, [user?.id]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadHints();
    setRefreshing(false);
  }

  function handleAddHint() {
    if (!linkValue.trim()) return;
    setModalInitialUrl(linkValue.trim());
    setAddModalVisible(true);
  }

  async function handleTogglePrivate() {
    const nextValue = !isPrivate;
    setIsPrivate(nextValue);
    const { error: updateError } = await supabase
      .from("hint_boards")
      .update({ is_private: nextValue })
      .eq("id", board.id);
    if (updateError) {
      setIsPrivate(!nextValue);
      setError(updateError.message);
    }
  }

  async function handleShare() {
    const url = buildShareUrl(`/profile/${user?.id}?board=${board.id}`);
    const title = board.is_default ? null : board.title;
    try {
      await Share.share({
        message: `${buildShareText({ sharerName, title })} ${url}`,
      });
    } catch {
      // User dismissed the share sheet - nothing to do.
    }
  }

  const columns = splitIntoColumns(hints, 2);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={onBack} hitSlop={12}>
          <Text style={styles.backButtonText}>‹ Lists</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.boardScrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#ff875d" />
        }
      >
        <View style={styles.heroWrap}>
          <View style={styles.boardPillWrap}>
            <Text style={styles.boardPillText}>
              {isPrivate ? "🔒 " : ""}
              {board.is_default ? "My Hints" : board.title}
            </Text>
          </View>

          <Text style={styles.heroTitle}>Drop a Hint here...</Text>

          <View style={styles.heroActionsRow}>
            <Pressable style={styles.shareButton} onPress={handleShare}>
              <Text style={styles.shareButtonText}>
                {board.is_default ? "Share my Hints" : `Share "${board.title}"`}
              </Text>
            </Pressable>
            <Pressable style={styles.privacyButton} onPress={handleTogglePrivate}>
              <Text style={styles.privacyButtonText}>{isPrivate ? "🔒 Private" : "Public"}</Text>
            </Pressable>
          </View>

          <View style={styles.heroInputRow}>
            <TextInput
              style={styles.heroInput}
              placeholder="Paste a URL or describe an experience..."
              placeholderTextColor="#94a3b8"
              value={linkValue}
              onChangeText={setLinkValue}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={handleAddHint}
              returnKeyType="done"
            />
            <Pressable style={styles.heroButton} onPress={handleAddHint}>
              <Text style={styles.heroButtonText}>Add hint</Text>
            </Pressable>
          </View>

          {error ? (
            <Text style={styles.errorBanner}>{error}</Text>
          ) : (
            <Text style={styles.heroHelperText}>
              We'll try our best to pull the title, image, and price before you review it.
            </Text>
          )}
        </View>

        <View style={styles.masonryFrame}>
          <Image
            source={require("../assets/grid-pattern-tall.png")}
            style={styles.gridPatternImage}
          />
          {loading ? (
            <View style={styles.frameCentered}>
              <ActivityIndicator color="#ff875d" />
            </View>
          ) : hints.length === 0 ? (
            <View style={styles.frameCentered}>
              <Text style={styles.emptyText}>No hints yet - add your first one.</Text>
            </View>
          ) : (
            <View style={styles.masonryContent}>
              <View style={styles.masonryRow}>
                {columns.map((columnHints, colIndex) => (
                  <View key={colIndex} style={styles.masonryColumn}>
                    {columnHints.map((hint) => (
                      <HintCard
                        key={hint.id}
                        hint={hint}
                        aspectRatio={imageRatios[hint.id]}
                        onPress={() => setSelectedHint(hint)}
                      />
                    ))}
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <AddHintModal
        visible={addModalVisible}
        onClose={() => {
          setAddModalVisible(false);
          setModalInitialUrl(null);
        }}
        onSaved={() => {
          setLinkValue("");
          loadHints();
        }}
        boardId={board.id}
        initialUrl={modalInitialUrl}
      />

      <HintDetailModal
        hint={selectedHint}
        visible={Boolean(selectedHint)}
        onClose={() => setSelectedHint(null)}
        onUpdated={loadHints}
        onEdit={setEditingHint}
        sharerName={sharerName}
      />

      <EditHintModal
        hint={editingHint}
        visible={Boolean(editingHint)}
        onClose={() => setEditingHint(null)}
        onSaved={loadHints}
        onDeleted={loadHints}
      />
    </View>
  );
}

export default function HintsScreen() {
  const [selectedBoard, setSelectedBoard] = useState(null);

  if (selectedBoard) {
    return <BoardHintsScreen board={selectedBoard} onBack={() => setSelectedBoard(null)} />;
  }
  return <BoardListScreen onSelectBoard={setSelectedBoard} />;
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
  },
  backButton: {
    paddingVertical: 4,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ff875d",
  },
  addButton: {
    backgroundColor: "#ff875d",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: "#ff875d",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  heroWrap: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: "center",
  },
  boardPillWrap: {
    backgroundColor: "#fff4ee",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
  },
  boardPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#e37b57",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  shareButton: {
    backgroundColor: "#ff875d",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  shareButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  privacyButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ead8ce",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  privacyButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  heroHelperText: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 4,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#f19a78",
    letterSpacing: -0.5,
    marginBottom: 14,
    textAlign: "center",
  },
  heroInputRow: {
    width: "100%",
    gap: 10,
  },
  heroInput: {
    height: 56,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#eadcd3",
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    fontSize: 15,
    color: "#0f172a",
  },
  heroButton: {
    height: 52,
    borderRadius: 999,
    backgroundColor: "#ff875d",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ff875d",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  heroButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  masonryFrame: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#efe0d7",
    backgroundColor: "#fffdfb",
    overflow: "hidden",
  },
  gridPatternImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: 4000,
  },
  boardScrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  frameCentered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  errorBanner: {
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
  masonryContent: {
    padding: 16,
  },
  masonryRow: {
    flexDirection: "row",
    gap: CARD_GAP,
  },
  masonryColumn: {
    flex: 1,
    gap: CARD_GAP,
  },
  card: {
    position: "relative",
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#ffe3d1",
    shadowColor: "#0f172a",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardImageFallback: {
    backgroundColor: "#ffe3d1",
  },
  cardScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  cardBadgeLeft: {
    position: "absolute",
    top: 8,
    left: 8,
    fontSize: 13,
  },
  cardBadgeRight: {
    position: "absolute",
    top: 8,
    right: 8,
    fontSize: 16,
    color: "#ff875d",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardOverlayContent: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
  },
  cardOverlayTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 6,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  cardPricePill: {
    alignSelf: "flex-start",
    backgroundColor: "#ff875d",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  cardPriceText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  boardCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#f0dfd6",
    marginBottom: CARD_GAP,
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  boardCardPressed: {
    opacity: 0.9,
  },
  boardPreviewWrap: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#fdf5f0",
  },
  previewRowFlex: {
    flex: 1,
    flexDirection: "row",
    gap: 1,
  },
  previewColFlex: {
    flex: 1,
    gap: 1,
  },
  previewCellImage: {
    flex: 1,
    width: "100%",
  },
  previewCellFallback: {
    backgroundColor: "#ead8ca",
  },
  boardCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 16,
  },
  boardCardText: {
    flex: 1,
  },
  boardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  boardSubtitle: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  boardArrow: {
    fontSize: 16,
    color: "#cbb8ac",
  },
  emptyText: {
    fontSize: 14,
    color: "#94a3b8",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fffaf7",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  editSheet: {
    maxHeight: "85%",
  },
  reviewImage: {
    width: "100%",
    height: 160,
    borderRadius: 16,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 16,
  },
  modalInput: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ead8ce",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#0f172a",
  },
  modalError: {
    color: "#c9633f",
    fontSize: 13,
    marginTop: 8,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
  },
  previewImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
  },
  previewText: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  previewPrice: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 2,
  },
  modalButtonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    backgroundColor: "#ff875d",
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  modalButtonSecondary: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ead8ce",
  },
  modalButtonSecondaryText: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "600",
  },
  editLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
    marginTop: 12,
  },
  editHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: "#f4cdbd",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#c9633f",
  },
  editRow: {
    flexDirection: "row",
    gap: 12,
  },
  editRowItem: {
    flex: 1,
  },
  detailBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  detailSheet: {
    maxHeight: "92%",
    backgroundColor: "#fffaf7",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: "#efdcd2",
    overflow: "hidden",
  },
  detailCloseRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  detailCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ead8ce",
    alignItems: "center",
    justifyContent: "center",
  },
  detailCloseText: {
    fontSize: 16,
    color: "#94a3b8",
  },
  detailImage: {
    width: "100%",
    height: 260,
  },
  detailBody: {
    padding: 20,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  detailRetailer: {
    fontSize: 13,
    color: "#94a3b8",
    marginBottom: 4,
  },
  detailSizeColour: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 4,
  },
  detailPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: "#df7b59",
    marginBottom: 16,
  },
  detailToggleRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  detailToggleButton: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ead8ce",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  detailToggleButtonActive: {
    borderColor: "#ffd8c9",
    backgroundColor: "#fff2ea",
  },
  detailToggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  detailToggleTextActive: {
    color: "#e27956",
  },
  detailShareButton: {
    height: 44,
    borderRadius: 999,
    backgroundColor: "#ff875d",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#ff875d",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  detailShareText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  detailOpenButton: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    backgroundColor: "#ff875d",
    alignItems: "center",
    justifyContent: "center",
  },
  detailOpenText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
});
