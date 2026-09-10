import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
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

function HintCard({ hint }) {
  return (
    <View style={styles.card}>
      {hint.image_url ? (
        <Image source={{ uri: hint.image_url }} style={styles.cardImage} resizeMode="cover" />
      ) : (
        <View style={[styles.cardImage, styles.cardImageFallback]} />
      )}
      <Text style={styles.cardTitle} numberOfLines={2}>
        {hint.title}
      </Text>
      {hint.price_text ? <Text style={styles.cardPrice}>{hint.price_text}</Text> : null}
    </View>
  );
}

function BoardCard({ board, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.boardCard, pressed && styles.boardCardPressed]}
      onPress={onPress}
    >
      <View style={styles.boardIconWrap}>
        <Text style={styles.boardIcon}>🎁</Text>
      </View>
      <Text style={styles.boardTitle} numberOfLines={1}>
        {board.title}
      </Text>
      {board.is_default ? <Text style={styles.boardBadge}>Default</Text> : null}
    </Pressable>
  );
}

function AddHintModal({ visible, onClose, onSaved, boardId }) {
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

  async function handleFetch() {
    const trimmed = url.trim();
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
    const { data, error } = await supabase
      .from("hint_boards")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setBoards(data || []);
    }
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
        data={boards}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
    } else {
      setHints(data || []);
    }
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={onBack} hitSlop={12}>
          <Text style={styles.backButtonText}>‹ Lists</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {board.title}
        </Text>
        <Pressable style={styles.addButton} onPress={() => setAddModalVisible(true)}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#ff875d" />
        </View>
      ) : (
        <FlatList
          data={hints}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => <HintCard hint={item} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#ff875d" />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No hints yet - add your first one.</Text>
            </View>
          }
        />
      )}

      <AddHintModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSaved={loadHints}
        boardId={board.id}
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
  row: {
    gap: CARD_GAP,
  },
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 10,
    marginBottom: CARD_GAP,
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    marginBottom: 10,
  },
  cardImageFallback: {
    backgroundColor: "#ffe3d1",
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
  },
  cardPrice: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 3,
  },
  boardCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: CARD_GAP,
    alignItems: "center",
    shadowColor: "#0f172a",
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  boardCardPressed: {
    opacity: 0.85,
  },
  boardIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ffe3d1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  boardIcon: {
    fontSize: 24,
  },
  boardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
  },
  boardBadge: {
    fontSize: 11,
    fontWeight: "600",
    color: "#ff875d",
    marginTop: 4,
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
