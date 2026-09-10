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

function HintCard({ hint, aspectRatio }) {
  const ratio = aspectRatio || 1;
  const priceLabel = hint.price_text || null;
  return (
    <View style={[styles.card, { aspectRatio: ratio }]}>
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
      {hint.starred ? <Text style={styles.cardBadgeRight}>⭐</Text> : null}
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
    </View>
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

function AddHintModal({ visible, onClose, onSaved, boardId, initialUrl }) {
  const { user } = useAuth();
  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");

  function reset() {
    setUrl("");
    setPreview(null);
    setError("");
  }

  async function handleFetch(urlToFetch) {
    const trimmed = (urlToFetch ?? url).trim();
    if (!trimmed) {
      setError("Paste a link first.");
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
      setPreview(data);
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
    if (!preview || !user?.id) return;
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
        title: preview.title || "Shared item",
        url: preview.url || url.trim(),
        image_url: preview.selectedImage || preview.image || null,
        retailer: preview.siteName || null,
        price_text: preview.priceText || null,
        numeric_price: preview.numericPrice || null,
        currency: preview.detectedCurrency || null,
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
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Add a hint</Text>

          <TextInput
            style={styles.modalInput}
            placeholder="Paste a product link"
            placeholderTextColor="#94a3b8"
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          {error ? <Text style={styles.modalError}>{error}</Text> : null}

          {preview ? (
            <View style={styles.previewRow}>
              {preview.selectedImage || preview.image ? (
                <Image
                  source={{ uri: preview.selectedImage || preview.image }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
              ) : null}
              <View style={styles.previewText}>
                <Text style={styles.previewTitle} numberOfLines={2}>
                  {preview.title}
                </Text>
                {preview.priceText ? (
                  <Text style={styles.previewPrice}>{preview.priceText}</Text>
                ) : null}
              </View>
            </View>
          ) : null}

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

            {preview ? (
              <Pressable style={styles.modalButton} onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Add to Hints</Text>
                )}
              </Pressable>
            ) : (
              <Pressable style={styles.modalButton} onPress={handleFetch} disabled={fetching}>
                {fetching ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Fetch details</Text>
                )}
              </Pressable>
            )}
          </View>
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

  const columns = splitIntoColumns(hints, 2);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={onBack} hitSlop={12}>
          <Text style={styles.backButtonText}>‹ Lists</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {board.title}
        </Text>
      </View>

      <View style={styles.heroWrap}>
        <Text style={styles.heroTitle}>Drop a Hint here...</Text>
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
      </View>

      {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

      <View style={styles.masonryFrame}>
        <Image
          source={require("../assets/grid-pattern-tile.png")}
          style={StyleSheet.absoluteFillObject}
          resizeMode="repeat"
        />
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#ff875d" />
          </View>
        ) : hints.length === 0 ? (
          <ScrollView
            contentContainerStyle={styles.centered}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#ff875d" />
            }
          >
            <Text style={styles.emptyText}>No hints yet - add your first one.</Text>
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={styles.masonryContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#ff875d" />
            }
          >
            <View style={styles.masonryRow}>
              {columns.map((columnHints, colIndex) => (
                <View key={colIndex} style={styles.masonryColumn}>
                  {columnHints.map((hint) => (
                    <HintCard key={hint.id} hint={hint} aspectRatio={imageRatios[hint.id]} />
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>

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
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#efe0d7",
    backgroundColor: "#fffdfb",
    overflow: "hidden",
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
    fontSize: 13,
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
});
