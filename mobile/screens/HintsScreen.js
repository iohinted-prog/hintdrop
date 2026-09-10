import { useCallback, useEffect, useState } from "react";
import {
  View,
  FlatList,
  SectionList,
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
import Text from "../components/Text";
import ActionSheet from "../components/ActionSheet";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../lib/supabase";
import { resolveAvatarColor } from "../lib/avatarColor";
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

function HintCard({ hint, aspectRatio, onPress, onDrag, isActive }) {
  const ratio = aspectRatio || 1;
  const priceLabel = hint.price_text || null;
  return (
    <Pressable
      style={[styles.card, { aspectRatio: ratio }, isActive && styles.cardDragging]}
      onPress={onPress}
      onLongPress={onDrag}
      delayLongPress={200}
    >
      {hint.image_url ? (
        <Image source={{ uri: secureImageUrl(hint.image_url) }} style={styles.cardImage} resizeMode="cover" />
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

// Mirrors rebuildFromColumns in HintsClient.jsx exactly: interleaves
// columns row-major (col0-row0, col1-row0, col0-row1, ...), which is
// the same order splitIntoColumns' round-robin expects, so re-
// splitting this array reproduces the same column layout rather than
// scrambling it - then reassigns sequential position values.
function rebuildFromColumns(nextColumns) {
  const maxLen = Math.max(0, ...nextColumns.map((col) => col.length));
  const interleaved = [];
  for (let row = 0; row < maxLen; row++) {
    for (let col = 0; col < nextColumns.length; col++) {
      if (nextColumns[col][row]) interleaved.push(nextColumns[col][row]);
    }
  }
  return interleaved.map((hint, index) => ({ ...hint, position: index }));
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
    <Image source={{ uri: secureImageUrl(hint.image_url) }} style={styles.previewCellImage} resizeMode="cover" />
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
              <Image source={{ uri: secureImageUrl(hint.image_url) }} style={styles.detailImage} resizeMode="cover" />
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

function BoardCard({ board, onPress, ownerName }) {
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
            {ownerName ? `Collaborating with ${ownerName}` : board.is_default ? "Personal" : "Hints for someone else"} · {board.hintCount}{" "}
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
// Matches the exact list in HintsClient.jsx's occasion picker.
const OCCASIONS = [
  "Birthday",
  "Christmas",
  "Valentine's Day",
  "Anniversary",
  "Wedding",
  "Graduation",
  "Just because",
  "Mother's Day",
  "Father's Day",
  "Housewarming",
];

// iOS blocks plain http:// image loads by default (App Transport
// Security) - confirmed via a real ATS error in Console for one of
// the scraped image URLs. Most sites that serve product images over
// http:// also serve the identical asset over https:// (it's the
// same CDN, just an unupgraded stored URL), so upgrading the scheme
// is a safe, simple fix rather than needing an ATS exception per
// domain in app.json.
function secureImageUrl(url) {
  if (!url) return url;
  return url.startsWith("http://") ? "https://" + url.slice(7) : url;
}

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
  const [isIdea, setIsIdea] = useState(false);
  const [title, setTitle] = useState("");
  const [priceText, setPriceText] = useState("");
  const [size, setSize] = useState("");
  const [colour, setColour] = useState("");
  const [occasions, setOccasions] = useState([]);
  const [occasionLimitMessage, setOccasionLimitMessage] = useState("");
  const [imageUrl, setImageUrl] = useState(null);
  const [imageOptions, setImageOptions] = useState([]);
  const [retailer, setRetailer] = useState(null);
  const [numericPrice, setNumericPrice] = useState(null);
  const [currency, setCurrency] = useState(null);
  const [error, setError] = useState("");

  function toggleOccasion(occasion) {
    setOccasions((current) => {
      if (current.includes(occasion)) {
        setOccasionLimitMessage("");
        return current.filter((o) => o !== occasion);
      }
      if (current.length >= 2) {
        setOccasionLimitMessage("You can only pick 2 at a time - unclick one first.");
        setTimeout(() => setOccasionLimitMessage(""), 3000);
        return current;
      }
      setOccasionLimitMessage("");
      return [...current, occasion];
    });
  }

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo library access is needed to upload a photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    // An uploaded photo replaces whatever scraped/Pexels options were
    // showing - same priority as the web version's
    // uploadedImage || image, a manual choice always wins.
    setImageUrl(result.assets[0].uri);
    setImageOptions([]);
    // Starting fresh from "Upload a photo instead" (reviewing was
    // still false) means there's no URL to scrape - same "idea"
    // shape as the non-URL text flow, so Link/Size/Colour stay
    // hidden until/unless they also type a real link.
    if (!reviewing) {
      setIsIdea(true);
      setReviewing(true);
    }
  }

  function reset() {
    setUrl("");
    setReviewing(false);
    setIsIdea(false);
    setTitle("");
    setPriceText("");
    setSize("");
    setColour("");
    setOccasions([]);
    setOccasionLimitMessage("");
    setImageUrl(null);
    setImageOptions([]);
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

    // Not a real URL - matches the web app's own behaviour: rather
    // than scraping, hits the real /api/hint-idea endpoint, which
    // title-cases the typed text and searches Pexels for up to 3
    // matching stock photos (needsReview: true means these are
    // meant to be picked from, not auto-applied).
    if (!isValidHttpUrl(trimmed)) {
      setFetching(true);
      setError("");
      setIsIdea(true);
      try {
        const res = await fetch("https://hintdrop.app/api/hint-idea", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: trimmed }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Couldn't find images for that.");
        setTitle(data.title || trimmed);
        setPriceText("");
        setImageOptions(data.images || []);
        setImageUrl(data.images?.[0] || null);
        setRetailer(data.retailer || null);
        setNumericPrice(null);
        setCurrency(null);
        setReviewing(true);
      } catch (err) {
        // Even if Pexels comes back empty/fails, the idea itself is
        // still worth saving - fall back to no image rather than
        // blocking the person from adding it at all.
        setTitle(trimmed);
        setPriceText("");
        setImageOptions([]);
        setImageUrl(null);
        setRetailer(null);
        setNumericPrice(null);
        setCurrency(null);
        setReviewing(true);
      } finally {
        setFetching(false);
      }
      return;
    }

    setFetching(true);
    setError("");
    setIsIdea(false);
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
      setImageOptions([]);
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
        size: isIdea ? null : size.trim() || null,
        colour: isIdea ? null : colour.trim() || null,
        occasions: occasions.length ? occasions : null,
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
              <>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Paste a link or describe an experience"
                  placeholderTextColor="#94a3b8"
                  value={url}
                  onChangeText={setUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <View style={styles.orDivider}>
                  <View style={styles.orDividerLine} />
                  <Text style={styles.orDividerText}>or</Text>
                  <View style={styles.orDividerLine} />
                </View>
                <Pressable style={styles.uploadButton} onPress={handlePickImage}>
                  <Text style={styles.uploadButtonText}>📷 Upload a photo instead</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable style={styles.uploadButton} onPress={handlePickImage}>
                  <Text style={styles.uploadButtonText}>📷 Upload a photo</Text>
                </Pressable>

                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.reviewImageLarge} resizeMode="cover" />
                ) : (
                  <View style={styles.reviewImagePlaceholder}>
                    <Text style={styles.reviewImagePlaceholderText}>No image yet</Text>
                  </View>
                )}

                {imageOptions.length > 1 ? (
                  <>
                    <Text style={styles.editLabel}>Choose a photo</Text>
                    <View style={styles.imageOptionsGrid}>
                      {imageOptions.map((optionUrl) => (
                        <Pressable
                          key={optionUrl}
                          style={styles.imageOptionCell}
                          onPress={() => setImageUrl(optionUrl)}
                        >
                          <Image
                            source={{ uri: optionUrl }}
                            style={[
                              styles.imageOptionThumb,
                              optionUrl === imageUrl && styles.imageOptionThumbSelected,
                            ]}
                            resizeMode="cover"
                          />
                          {optionUrl === imageUrl ? (
                            <View style={styles.imageOptionCheck}>
                              <Text style={styles.imageOptionCheckText}>✓</Text>
                            </View>
                          ) : null}
                        </Pressable>
                      ))}
                    </View>
                  </>
                ) : null}

                {!isIdea ? (
                  <>
                    <Text style={styles.editLabel}>Link</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={url}
                      onChangeText={setUrl}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </>
                ) : null}

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

                {!isIdea ? (
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
                ) : null}

                <Text style={styles.editLabel}>Occasions (optional)</Text>
                <View style={styles.occasionsWrap}>
                  {OCCASIONS.map((occasion) => {
                    const selected = occasions.includes(occasion);
                    return (
                      <Pressable
                        key={occasion}
                        style={[styles.occasionChip, selected && styles.occasionChipSelected]}
                        onPress={() => toggleOccasion(occasion)}
                      >
                        <Text
                          style={[
                            styles.occasionChipText,
                            selected && styles.occasionChipTextSelected,
                          ]}
                        >
                          {occasion}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {occasionLimitMessage ? (
                  <Text style={styles.modalError}>{occasionLimitMessage}</Text>
                ) : null}
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
  const [collabBoards, setCollabBoards] = useState([]);
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

    // Boards this person collaborates on but doesn't own - matches
    // the same "Collaborating on" section added to the web app's
    // Hints menu earlier today, so a collaborator has somewhere to
    // find a board again beyond the original shared link.
    const { data: collabRows } = await supabase
      .from("board_collaborators")
      .select("board_id, hint_boards(id, title, is_default, is_private, user_id, profiles:user_id(full_name))")
      .eq("user_id", user.id)
      .eq("status", "accepted");

    const collabWithPreviews = await Promise.all(
      (collabRows || [])
        .filter((row) => row.hint_boards)
        .map(async (row) => {
          const cb = row.hint_boards;
          const [{ count }, { data: previewHints }] = await Promise.all([
            supabase.from("hints").select("id", { count: "exact", head: true }).eq("board_id", cb.id),
            supabase.from("hints").select("image_url").eq("board_id", cb.id).order("position", { ascending: true }).limit(4),
          ]);
          return { ...cb, hintCount: count || 0, previewHints: previewHints || [], ownerName: cb.profiles?.full_name || "Someone", isCollab: true };
        })
    );
    setCollabBoards(collabWithPreviews);
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

  const sections = [
    { title: null, data: boards },
    ...(collabBoards.length > 0 ? [{ title: "Collaborating on", data: collabBoards }] : []),
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Hints</Text>
      </View>

      {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

      <SectionList
        key="board-list"
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BoardCard board={item} onPress={() => onSelectBoard(item)} ownerName={item.ownerName} />
        )}
        renderSectionHeader={({ section }) =>
          section.title ? (
            <Text style={styles.collabSectionHeader}>{section.title.toUpperCase()}</Text>
          ) : null
        }
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

// Mobile version of app/components/CollaborateModal.jsx - owner
// invites Circle contacts or by email, sees/approves pending
// requests, and can remove an accepted collaborator. Simplified vs
// the web version (no share-invite-link button, no avatar photos -
// initials only), but the real data flow is the same: board_
// collaborators rows, the collab-notify API for email + bell
// notification on both request and accept.
// Mobile version of app/components/CollaborateModal.jsx - owner
// shares an invite link, invites Circle contacts or by email (both
// go straight to status "accepted" - the owner is granting access
// directly, there's no separate approval step for someone THEY
// chose to add), sees/approves pending requests that came in from
// someone else requesting access (rare from mobile today since there's
// no "request to collaborate" entry point here yet, but these can
// still arrive from the web app's profile page, same database), and
// can remove an accepted collaborator.
function CollabAvatar({ name, avatarUrl, avatarColor, userId, size = 36 }) {
  const colors = resolveAvatarColor({ avatarColor, id: userId });
  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  const initials = String(name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center", backgroundColor: colors.to }}>
      <Text style={{ color: "#fff", fontSize: size * 0.38, fontWeight: "700" }}>{initials || "?"}</Text>
    </View>
  );
}

function CollaborateModal({ visible, onClose, board, currentUserId }) {
  const [circleContacts, setCircleContacts] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [emailInput, setEmailInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    if (!board?.id) return;
    setError("");
    const [{ data: contactRows }, { data: collabRows }] = await Promise.all([
      supabase
        .from("contacts")
        .select("id, name, email, profile_id, profiles:profile_id(full_name, avatar_url, avatar_color)")
        .eq("user_id", currentUserId)
        .eq("status", "active")
        .not("profile_id", "is", null),
      supabase
        .from("board_collaborators")
        .select("id, user_id, invited_email, status, profiles:user_id(full_name, avatar_url, avatar_color)")
        .eq("board_id", board.id),
    ]);
    setCircleContacts(contactRows || []);
    setCollaborators(collabRows || []);
  }, [board?.id, currentUserId]);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      loadData().finally(() => setLoading(false));
    }
  }, [visible, loadData]);

  const invitedProfileIds = new Set(collaborators.map((c) => c.user_id).filter(Boolean));
  const availableContacts = circleContacts.filter((c) => !invitedProfileIds.has(c.profile_id));
  const pending = collaborators.filter((c) => c.status === "pending");
  const accepted = collaborators.filter((c) => c.status === "accepted");

  async function handleShareLink() {
    const url = buildShareUrl(`/b/${board.id}`);
    try {
      await Share.share({
        message: `Collaborate on "${board.title}" Hints with me ${url}`,
      });
    } catch {
      // dismissed
    }
  }

  async function inviteContact(contact) {
    setError("");
    // Straight to "accepted" - the owner picked this person
    // themselves, so there's no approval step needed (matches the
    // web app exactly). "pending" is reserved for someone else
    // requesting access that the owner then has to approve.
    const { data, error: insertError } = await supabase
      .from("board_collaborators")
      .insert({
        board_id: board.id,
        user_id: contact.profile_id,
        invited_email: contact.email || null,
        status: "accepted",
        requested_by: currentUserId,
      })
      .select("id, user_id, invited_email, status, profiles:user_id(full_name, avatar_url, avatar_color)")
      .single();
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setCollaborators((prev) => [...prev, data]);
  }

  async function inviteByEmail() {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    setError("");
    const { data: profileMatchRows } = await supabase.rpc("get_profile_id_by_email", { target_email: email });
    const matchedProfileId = profileMatchRows?.[0]?.id || null;
    const { data, error: insertError } = await supabase
      .from("board_collaborators")
      .insert({
        board_id: board.id,
        user_id: matchedProfileId,
        invited_email: email,
        status: "accepted",
        requested_by: currentUserId,
      })
      .select("id, user_id, invited_email, status, profiles:user_id(full_name, avatar_url, avatar_color)")
      .single();
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setCollaborators((prev) => [...prev, data]);
    setEmailInput("");
  }

  async function approveRequest(collabId, requesterId) {
    const { error: updateError } = await supabase.from("board_collaborators").update({ status: "accepted" }).eq("id", collabId);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setCollaborators((prev) => prev.map((c) => (c.id === collabId ? { ...c, status: "accepted" } : c)));
    fetch("https://hintdrop.app/api/collab-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "accepted", boardId: board.id, requesterId }),
    }).catch(() => {});
  }

  async function declineOrRemove(collabId) {
    await supabase.from("board_collaborators").delete().eq("id", collabId);
    setCollaborators((prev) => prev.filter((c) => c.id !== collabId));
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.collabOverlay}>
        <View style={styles.collabCard}>
          <View style={styles.collabHeaderRow}>
            <Text style={styles.collabHeaderTitle}>Invite people to "{board?.title}"</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.collabCloseText}>✕</Text>
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color="#ff875d" style={{ marginTop: 24 }} />
          ) : (
            <ScrollView style={{ maxHeight: "100%" }}>
              {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

              <View style={styles.collabShareBox}>
                <Text style={styles.collabShareEyebrow}>FASTEST WAY</Text>
                <Text style={styles.collabShareTitle}>Share an invite link</Text>
                <Text style={styles.collabShareSubtitle}>Anyone with this link can view the list and request to collaborate.</Text>
                <Pressable style={styles.collabShareButton} onPress={handleShareLink}>
                  <Text style={styles.collabApproveText}>Share invite link</Text>
                </Pressable>
              </View>

              {pending.length > 0 && (
                <View style={styles.collabSection}>
                  <Text style={styles.collabSectionTitle}>{pending.length} pending request{pending.length === 1 ? "" : "s"}</Text>
                  {pending.map((c) => (
                    <View key={c.id} style={styles.collabRow}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                        <CollabAvatar
                          name={c.profiles?.full_name || c.invited_email}
                          avatarUrl={c.profiles?.avatar_url}
                          avatarColor={c.profiles?.avatar_color}
                          userId={c.user_id}
                        />
                        <Text style={styles.collabRowName}>{c.profiles?.full_name || c.invited_email || "Someone"}</Text>
                      </View>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <Pressable style={styles.collabApproveButton} onPress={() => approveRequest(c.id, c.user_id)}>
                          <Text style={styles.collabApproveText}>Approve</Text>
                        </Pressable>
                        <Pressable style={styles.collabDeclineButton} onPress={() => declineOrRemove(c.id)}>
                          <Text style={styles.collabDeclineText}>Decline</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.collabSection}>
                <Text style={styles.collabSectionTitle}>Invite from your circle</Text>
                {availableContacts.length === 0 ? (
                  <Text style={styles.collabEmptyText}>
                    {circleContacts.length ? "Everyone in your Circle is already invited." : "Nobody in your Circle is on HintDrop yet."}
                  </Text>
                ) : (
                  availableContacts.map((contact) => (
                    <Pressable key={contact.id} style={styles.collabRow} onPress={() => inviteContact(contact)}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                        <CollabAvatar
                          name={contact.profiles?.full_name || contact.name}
                          avatarUrl={contact.profiles?.avatar_url}
                          avatarColor={contact.profiles?.avatar_color}
                          userId={contact.profile_id}
                        />
                        <Text style={styles.collabRowName}>{contact.profiles?.full_name || contact.name}</Text>
                      </View>
                      <Text style={styles.collabInviteText}>Invite</Text>
                    </Pressable>
                  ))
                )}
              </View>

              <View style={styles.collabSection}>
                <Text style={styles.collabSectionTitle}>Invite by email</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TextInput
                    style={styles.collabEmailInput}
                    value={emailInput}
                    onChangeText={setEmailInput}
                    placeholder="their@email.com"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  <Pressable style={styles.collabInviteEmailButton} onPress={inviteByEmail}>
                    <Text style={styles.collabApproveText}>Send</Text>
                  </Pressable>
                </View>
              </View>

              {accepted.length > 0 && (
                <View style={styles.collabSection}>
                  <Text style={styles.collabSectionTitle}>Collaborating ({accepted.length})</Text>
                  {accepted.map((c) => (
                    <View key={c.id} style={styles.collabRow}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                        <CollabAvatar
                          name={c.profiles?.full_name || c.invited_email}
                          avatarUrl={c.profiles?.avatar_url}
                          avatarColor={c.profiles?.avatar_color}
                          userId={c.user_id}
                        />
                        <Text style={styles.collabRowName}>{c.profiles?.full_name || c.invited_email || "Someone"}</Text>
                      </View>
                      <Pressable onPress={() => declineOrRemove(c.id)}>
                        <Text style={styles.collabRemoveText}>Remove</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
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
  // Set when this board was opened from the "Collaborating on"
  // section rather than the owner's own list - gates owner-only
  // actions (privacy toggle, the 3-dot menu) the same way the
  // isCollaboratorView flag does on web, since RLS already allows a
  // collaborator to read/write hints here but shouldn't imply they
  // can rename, delete, or manage collaborators on someone else's
  // board.
  const isCollaboratorView = Boolean(board.isCollab);
  const [collabModalVisible, setCollabModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameDraft, setRenameDraft] = useState(board.title);
  const [boardTitle, setBoardTitle] = useState(board.title);
  const [sharerName, setSharerName] = useState("");
  const [selectedHint, setSelectedHint] = useState(null);
  const [editingHint, setEditingHint] = useState(null);
  const [error, setError] = useState("");

  const loadHints = useCallback(async () => {
    if (!user?.id) return;
    setError("");
    // Scoped by board only, not the viewer's own user_id - a board's
    // hints always belong to its owner, so also filtering by the
    // current viewer's id breaks collaborator access entirely (their
    // id never matches hints.user_id, only the owner's does). Same
    // bug fixed on web earlier today.
    const { data, error } = await supabase
      .from("hints")
      .select("*")
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
        secureImageUrl(hint.image_url),
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

  // Not currently wired to any UI - drag-and-drop reordering was
  // reverted (see commit history) after react-native-draggable-
  // flatlist's Nestable components didn't handle two independent
  // side-by-side columns correctly. The actual reorder + persist
  // logic here is still correct and ready to reconnect once a
  // working two-column drag approach is found.
  async function handleColumnDragEnd(colIndex, newColumnData) {
    const currentColumns = splitIntoColumns(hints, 2);
    currentColumns[colIndex] = newColumnData;
    const reordered = rebuildFromColumns(currentColumns);

    // Optimistic local update first, same as the web version - the
    // reorder should feel instant, not wait on a round trip.
    setHints(reordered);

    if (!user?.id) return;
    const results = await Promise.all(
      reordered.map((hint, index) =>
        supabase.from("hints").update({ position: index }).eq("id", hint.id).eq("user_id", user.id)
      )
    );
    const failed = results.find((r) => r.error);
    if (failed) {
      setError(failed.error.message);
    }
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
    // board.user_id (the actual owner), not the current viewer's own
    // id - those differ for a collaborator, who'd otherwise build a
    // profile link to their own account instead of the board owner's.
    // Routed through /b/... rather than /profile/...?board=... so the
    // link gets a real preview image, matching the fix already made
    // on web.
    const url = buildShareUrl(`/b/${board.id}`);
    const title = board.is_default ? null : board.title;
    try {
      await Share.share({
        message: `${buildShareText({ sharerName, title })} ${url}`,
      });
    } catch {
      // User dismissed the share sheet - nothing to do.
    }
  }

  async function handleSaveBoardName() {
    const trimmed = renameDraft.trim();
    if (!trimmed || trimmed === boardTitle) {
      setRenameModalVisible(false);
      return;
    }
    const { error: renameError } = await supabase
      .from("hint_boards")
      .update({ title: trimmed })
      .eq("id", board.id);
    if (renameError) {
      Alert.alert("Couldn't rename", renameError.message);
    } else {
      board.title = trimmed;
      setBoardTitle(trimmed);
    }
    setRenameModalVisible(false);
  }

  function handleDeleteBoard() {
    Alert.alert(
      "Delete this list?",
      "This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error: deleteError } = await supabase.from("hint_boards").delete().eq("id", board.id);
            if (deleteError) {
              Alert.alert("Couldn't delete", deleteError.message);
            } else {
              onBack();
            }
          },
        },
      ]
    );
  }

  function handleMenuPress() {
    if (board.is_default) return;
    setMenuVisible(true);
  }

  const columns = splitIntoColumns(hints, 2);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={onBack} hitSlop={12}>
          <Text style={styles.backButtonText}>‹ Lists</Text>
        </Pressable>
        {!board.is_default && !isCollaboratorView && (
          <Pressable style={styles.menuButton} onPress={handleMenuPress} hitSlop={12}>
            <Text style={styles.menuButtonText}>⋯</Text>
          </Pressable>
        )}
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
              {board.is_default ? "My Hints" : boardTitle}
            </Text>
          </View>

          {isCollaboratorView && (
            <Text style={styles.collabBadgeText}>Collaborating with {board.ownerName || "someone"}</Text>
          )}

          <Text style={styles.heroTitle}>Drop a Hint here...</Text>

          <View style={styles.heroActionsRow}>
            <Pressable style={styles.shareButton} onPress={handleShare}>
              <Text style={styles.shareButtonText}>
                {board.is_default ? "Share my Hints" : `Share "${boardTitle}"`}
              </Text>
            </Pressable>
            {!isCollaboratorView && (
              <Pressable style={styles.privacyButton} onPress={handleTogglePrivate}>
                <Text style={styles.privacyButtonText}>{isPrivate ? "🔒 Private" : "Public"}</Text>
              </Pressable>
            )}
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

      <ActionSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        title="List options"
        options={[
          { label: "Rename list", onPress: () => { setRenameDraft(board.title); setRenameModalVisible(true); } },
          { label: "Collaborate", onPress: () => setCollabModalVisible(true) },
          { label: "Delete list", destructive: true, onPress: handleDeleteBoard },
        ]}
      />

      <Modal visible={renameModalVisible} transparent animationType="fade" onRequestClose={() => setRenameModalVisible(false)}>
        <View style={styles.renameOverlay}>
          <View style={styles.renameCard}>
            <Text style={styles.renameTitle}>Rename list</Text>
            <TextInput
              style={styles.renameInput}
              value={renameDraft}
              onChangeText={setRenameDraft}
              autoFocus
              placeholder="List name"
              placeholderTextColor="#94a3b8"
            />
            <View style={styles.renameActionsRow}>
              <Pressable style={styles.renameCancelButton} onPress={() => setRenameModalVisible(false)}>
                <Text style={styles.renameCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.renameSaveButton} onPress={handleSaveBoardName}>
                <Text style={styles.renameSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <CollaborateModal
        visible={collabModalVisible}
        onClose={() => setCollabModalVisible(false)}
        board={board}
        currentUserId={user?.id}
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
    fontWeight: "700",
    color: "#f19a78",
    letterSpacing: -1.7,
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
  collabSectionHeader: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: "#94a3b8",
    marginTop: 24,
    marginBottom: 12,
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
  cardDragging: {
    opacity: 0.85,
    transform: [{ scale: 1.03 }],
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
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
  uploadButton: {
    height: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#eadcd3",
    backgroundColor: "#fcfaf8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#df7c59",
  },
  orDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  orDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ead8ce",
  },
  orDividerText: {
    marginHorizontal: 10,
    fontSize: 12,
    color: "#94a3b8",
  },
  reviewImageLarge: {
    width: "100%",
    height: 220,
    borderRadius: 20,
    marginBottom: 12,
  },
  reviewImagePlaceholder: {
    width: "100%",
    height: 140,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#efe0d7",
    backgroundColor: "#faf6f3",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  reviewImagePlaceholderText: {
    fontSize: 13,
    color: "#94a3b8",
  },
  imageOptionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  imageOptionCell: {
    width: "31%",
    aspectRatio: 1,
  },
  imageOptionThumb: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "transparent",
  },
  imageOptionThumbSelected: {
    borderColor: "#ff946d",
  },
  imageOptionCheck: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ff946d",
    alignItems: "center",
    justifyContent: "center",
  },
  imageOptionCheckText: {
    fontSize: 11,
    color: "#fff",
    fontWeight: "700",
  },
  occasionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  occasionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  occasionChipSelected: {
    borderColor: "#e3f5ea",
    backgroundColor: "#e3f5ea",
  },
  occasionChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#475569",
  },
  occasionChipTextSelected: {
    color: "#2f8a5f",
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
  menuButton: {
    marginLeft: "auto",
    height: 32,
    width: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ead8ce",
  },
  menuButtonText: {
    fontSize: 18,
    color: "#64748b",
    fontWeight: "700",
  },
  collabBadgeText: {
    fontSize: 12,
    color: "#2f8a5f",
    fontWeight: "600",
    marginBottom: 8,
  },
  renameOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  renameCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
  },
  renameTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 12,
  },
  renameInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ead8ce",
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#1e293b",
  },
  renameActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  renameCancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ead8ce",
    alignItems: "center",
    justifyContent: "center",
  },
  renameCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  renameSaveButton: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    backgroundColor: "#ff875d",
    alignItems: "center",
    justifyContent: "center",
  },
  renameSaveText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  collabOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  collabCard: {
    backgroundColor: "#fffaf7",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  collabHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  collabHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    flex: 1,
    marginRight: 12,
  },
  collabCloseText: {
    fontSize: 18,
    color: "#94a3b8",
  },
  collabShareBox: {
    backgroundColor: "#fff7f2",
    borderWidth: 1,
    borderColor: "#f0dfd6",
    borderRadius: 20,
    padding: 16,
    marginTop: 12,
  },
  collabShareEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "#df7b59",
    letterSpacing: 0.6,
  },
  collabShareTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 6,
  },
  collabShareSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
    lineHeight: 17,
  },
  collabShareButton: {
    marginTop: 12,
    height: 42,
    borderRadius: 999,
    backgroundColor: "#ff875d",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 18,
  },
  collabSection: {
    marginTop: 16,
  },
  collabSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 0.6,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  collabRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f0dfd6",
    marginBottom: 8,
  },
  collabRowName: {
    fontSize: 14,
    color: "#1e293b",
    fontWeight: "600",
    flex: 1,
  },
  collabApproveButton: {
    backgroundColor: "#ff875d",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  collabApproveText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  collabDeclineButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ead8ce",
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  collabDeclineText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  collabRemoveText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#c9633f",
  },
  collabInviteText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ff875d",
  },
  collabEmailInput: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ead8ce",
    paddingHorizontal: 14,
    fontSize: 13,
    color: "#1e293b",
    backgroundColor: "#fff",
  },
  collabInviteEmailButton: {
    height: 40,
    borderRadius: 999,
    backgroundColor: "#ff875d",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  collabEmptyText: {
    fontSize: 13,
    color: "#94a3b8",
  },
});
