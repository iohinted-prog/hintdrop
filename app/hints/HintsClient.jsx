"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
import AvatarMenu from "../components/AvatarMenu";

const demoHints = [
  {
    id: "demo-1",
    title: "Weekend cabin",
    retailer: "airbnb.co.uk",
    priceLabel: "From £320",
    numericPrice: 320,
    priceBand: "high",
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    fallbackGradient: "from-[#d9dfcf] via-[#b9c7aa] to-[#90a27e]",
    tags: ["Travel", "Big gift"],
    starred: true,
    private: false,
    size: "tall",
    url: "https://www.airbnb.co.uk/",
    position: 1,
  },
  {
    id: "demo-2",
    title: "Sony headphones",
    retailer: "amazon.co.uk",
    priceLabel: "About £249",
    numericPrice: 249,
    priceBand: "high",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80",
    fallbackGradient: "from-[#ead8ca] via-[#dbc0a8] to-[#c4a17f]",
    tags: ["Tech", "Birthday"],
    starred: true,
    private: false,
    size: "tall",
    url: "https://www.amazon.co.uk/",
    position: 2,
  },
  {
    id: "demo-3",
    title: "Ceramics workshop",
    retailer: "classbento.co.uk",
    priceLabel: "About £78",
    numericPrice: 78,
    priceBand: "mid",
    image: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80",
    fallbackGradient: "from-[#f3d5cc] via-[#e9b39f] to-[#d98c76]",
    tags: ["Experience", "Couples"],
    starred: false,
    private: false,
    size: "portrait",
    url: "https://classbento.co.uk/",
    position: 3,
  },
  {
    id: "demo-4",
    title: "Silk pillowcases",
    retailer: "johnlewis.com",
    priceLabel: "About £45",
    numericPrice: 45,
    priceBand: "small",
    image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
    fallbackGradient: "from-[#efe5de] via-[#e5d2c8] to-[#d1b2a4]",
    tags: ["Home", "Under £50"],
    starred: false,
    private: true,
    size: "square",
    url: "https://www.johnlewis.com/",
    position: 4,
  },
];

function LogoMark() {
  return (
    <div className="relative flex h-11 w-11 items-center justify-center rounded-[16px] bg-gradient-to-b from-[#ffa47f] to-[#ff875d] text-white shadow-lg">
      <span className="text-lg">🎁</span>
    </div>
  );
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
  if (!value || typeof value !== "string") return null;

  const cleaned = value.replace(/,/g, "");
  const match =
    cleaned.match(/(?:£|\$|€)\s?(\d+(?:\.\d{1,2})?)/) ||
    cleaned.match(/(\d+(?:\.\d{1,2})?)/);

  if (!match) return null;

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function getPriceBand(price) {
  if (price == null) return "small";
  if (price >= 180) return "high";
  if (price >= 120) return "premium";
  if (price >= 60) return "mid";
  return "small";
}

function getSizeFromPrice(price, allPrices) {
  if (price == null || allPrices.length < 3) return "portrait";

  const sorted = [...allPrices].sort((a, b) => a - b);
  const lowCut = sorted[Math.floor(sorted.length * 0.35)];
  const highCut = sorted[Math.floor(sorted.length * 0.75)];

  if (price >= highCut) return "tall";
  if (price >= lowCut) return "portrait";
  return "square";
}

function formatPriceLabel(price, rawPrice) {
  if (rawPrice && typeof rawPrice === "string") return rawPrice;
  if (price == null) return "Price unavailable";
  return `About £${Math.round(price)}`;
}

function buildFallbackGradient(index) {
  const gradients = [
    "from-[#ead8ca] via-[#dbc0a8] to-[#c4a17f]",
    "from-[#d9dfcf] via-[#b9c7aa] to-[#90a27e]",
    "from-[#f3d5cc] via-[#e9b39f] to-[#d98c76]",
    "from-[#d5dbee] via-[#b3c0df] to-[#8f9fc9]",
    "from-[#eadce8] via-[#d8bfd1] to-[#bb9ab6]",
    "from-[#d6e7eb] via-[#b5ced7] to-[#8fb3c5]",
  ];
  return gradients[index % gradients.length];
}

function getTileClass(size) {
  if (size === "tall") return "md:col-span-3 md:row-span-9";
  if (size === "portrait") return "md:col-span-3 md:row-span-7";
  return "md:col-span-3 md:row-span-5";
}

function getPricePill(priceBand) {
  if (priceBand === "high") return "bg-[#2f3b2d] text-white";
  if (priceBand === "premium") return "bg-[#fff1e9] text-[#df7c59]";
  if (priceBand === "mid") return "bg-[#f3f0ff] text-[#7c61bf]";
  return "bg-[#f1f5ec] text-[#627f53]";
}

function shortenTitle(title = "", retailer = "") {
  const source = String(title || "").trim();
  if (!source) return "Saved hint";

  const cleanRetailer = String(retailer || "")
    .replace(/^www\./i, "")
    .replace(/\.(co\.uk|com|co|net|org)$/i, "")
    .trim()
    .toLowerCase();

  const stopWords = new Set([
    "the", "and", "with", "for", "from", "new", "latest",
    "edition", "model", "official", "amazon", "uk",
    "black", "white", "silver", "blue", "green", "pink", "grey", "gray",
    "wireless", "bluetooth",
  ]);

  const categoryWords = [
    "headphones", "earbuds", "speaker", "kindle", "book",
    "pillowcase", "pillowcases", "dish", "pan", "mug", "print",
    "necklace", "ring", "bag", "dress", "trainer", "trainers",
    "jacket", "candle", "coffee", "set", "workshop", "experience",
    "voucher", "lego", "camera", "watch", "sofa", "blanket",
  ];

  let cleaned = source
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/[|:;,/]/g, " ")
    .replace(/\b[A-Z0-9-]{6,}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  let words = cleaned.split(" ").filter(Boolean);

  words = words.filter((word) => {
    const lower = word.toLowerCase();
    if (stopWords.has(lower)) return false;
    if (lower === cleanRetailer) return false;
    if (/^\d+$/.test(lower)) return false;
    return true;
  });

  if (words.length === 0) return "Saved hint";

  const brand = words[0];
  const foundCategory = words.find((word) => categoryWords.includes(word.toLowerCase()));

  let finalWords;
  if (foundCategory && brand.toLowerCase() !== foundCategory.toLowerCase()) {
    finalWords = [brand, foundCategory];
  } else {
    finalWords = words.slice(0, Math.min(4, Math.max(2, words.length >= 2 ? 2 : 1)));
  }

  const compact = finalWords.slice(0, 4).join(" ").trim();
  return compact.charAt(0).toUpperCase() + compact.slice(1);
}

function EditHintModal({
  isOpen,
  editForm,
  setEditForm,
  onClose,
  onSave,
  onRefreshFromLink,
  onDelete,
  onTogglePrivate,
  onToggleStarred,
  isRefreshing,
  isSaving,
  hint,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(33,24,20,0.42)] px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-[560px] rounded-[30px] border border-[#ecdcd2] bg-white p-6 shadow-[0_28px_80px_rgba(75,45,30,0.18)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#e08a67]">
              Edit hint
            </p>
            <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.05em] text-slate-900">
              Update this card
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#ead9d0] text-slate-500 hover:bg-[#faf6f3]"
            aria-label="Close edit modal"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="edit-link" className="mb-2 block text-sm font-medium text-slate-700">
              Link
            </label>
            <input
              id="edit-link"
              type="url"
              value={editForm.url}
              onChange={(e) => setEditForm((current) => ({ ...current, url: e.target.value }))}
              className="h-14 w-full rounded-[18px] border border-[#eadcd3] bg-white px-5 text-[15px] text-slate-700 outline-none focus:border-[#f19a78]/60 focus:ring-4 focus:ring-[#f19a78]/10"
            />
          </div>

          <div>
            <label htmlFor="edit-title" className="mb-2 block text-sm font-medium text-slate-700">
              Name
            </label>
            <input
              id="edit-title"
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm((current) => ({ ...current, title: e.target.value }))}
              className="h-14 w-full rounded-[18px] border border-[#eadcd3] bg-white px-5 text-[15px] text-slate-700 outline-none focus:border-[#f19a78]/60 focus:ring-4 focus:ring-[#f19a78]/10"
            />
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={onToggleStarred}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${
                hint.starred
                  ? "border-[#f36f64] bg-[#fff2ea] text-[#e27956]"
                  : "border-[#ead9d0] bg-white text-slate-700 hover:bg-[#faf6f3]"
              }`}
            >
              <span>★</span>
              {hint.starred ? "Starred" : "Star"}
            </button>

            <button
              type="button"
              onClick={onTogglePrivate}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${
                hint.private
                  ? "border-[#e08a67] bg-[#fffaf7] text-[#e08a67]"
                  : "border-[#ead9d0] bg-white text-slate-700 hover:bg-[#faf6f3]"
              }`}
            >
              <span>{hint.private ? "🔒" : "🔓"}</span>
              {hint.private ? "Private" : "Public"}
            </button>
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-12 items-center justify-center rounded-full border border-[#f1d4c8] px-5 text-sm font-semibold text-[#d56949] hover:bg-[#fff4ef]"
          >
            Delete hint
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onRefreshFromLink}
              disabled={isRefreshing}
              className="inline-flex h-12 items-center justify-center rounded-full border border-[#ead9d0] px-5 text-sm font-semibold text-slate-700 hover:bg-[#faf6f3] disabled:opacity-60"
            >
              {isRefreshing ? "Refreshing..." : "Replace from link"}
            </button>

            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-6 text-sm font-semibold text-white shadow-lg disabled:opacity-70"
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HintTile({
  hint,
  index,
  draggedIndex,
  setDraggedIndex,
  moveHint,
  onEdit,
  onToggleStarred,
  onTogglePrivate,
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(hint.image) && !imageFailed;

  return (
    <article
      className={`group relative flex h-full min-h-[280px] flex-col overflow-hidden rounded-[30px] border transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(176,118,86,0.14)] ${getTileClass(hint.size)} ${
        draggedIndex === index ? "opacity-60" : ""
      } ${
        hint.private
          ? "border-white/50 bg-white/55 shadow-[0_10px_28px_rgba(176,118,86,0.08)] backdrop-blur-sm"
          : "border-[#f0dfd6] bg-white shadow-sm"
      }`}
      draggable={false}
    >
      <div className="relative flex h-full flex-col">
        <div className="relative min-h-[62%] flex-1 overflow-hidden">
          {showImage ? (
            <>
              <img
                src={hint.image}
                alt={hint.title}
                className={`absolute inset-0 h-full w-full object-cover ${hint.private ? "opacity-80" : ""}`}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setImageFailed(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[rgba(31,24,20,0.35)] via-[rgba(31,24,20,0.05)] to-[rgba(255,255,255,0.02)]" />
            </>
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${hint.fallbackGradient} ${hint.private ? "opacity-80" : ""}`} />
          )}

          <div className="absolute left-4 right-4 top-4 flex items-start justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div
                className="flex cursor-grab items-center gap-1 rounded-full bg-white/78 px-3 py-1 text-[11px] font-semibold text-slate-700 backdrop-blur-sm"
                title="Drag to reorder"
              >
                ⋮⋮ Drag
              </div>

              {hint.starred && (
                <div className="rounded-full bg-[#fff2ea] px-3 py-1 text-[11px] font-semibold text-[#e27956]">
                  Top pick
                </div>
              )}

              {hint.private && (
                <div className="rounded-full bg-white/74 px-3 py-1 text-[11px] font-semibold text-slate-600 backdrop-blur-sm">
                  Private
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onEdit(hint)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-white/72 text-[15px] text-slate-500 backdrop-blur-sm hover:text-slate-800"
                aria-label="Edit hint"
              >
                ✎
              </button>

              <button
                onClick={() => onToggleStarred(hint)}
                className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-white/72 text-[16px] backdrop-blur-sm ${
                  hint.starred ? "text-[#f36f64]" : "text-slate-400 hover:text-[#f36f64]"
                }`}
                aria-label={hint.starred ? "Unhighlight hint" : "Highlight hint"}
                type="button"
              >
                ★
              </button>
            </div>
          </div>
        </div>

        <div className="relative -mt-6 flex flex-1 px-4 pb-4 sm:px-5 sm:pb-5">
          <div className={`flex w-full flex-1 flex-col rounded-[24px] p-4 shadow-sm backdrop-blur-md ${hint.private ? "bg-white/82" : "bg-white/90"}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getPricePill(hint.priceBand)}`}>
                {hint.priceLabel}
              </span>

              {hint.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[#f8f5f2] px-2.5 py-1 text-[11px] font-medium text-slate-500"
                >
                  {tag}
                </span>
              ))}
            </div>

            <h2
              className="mt-3 min-w-0 overflow-hidden text-[20px] font-semibold tracking-[-0.04em] text-slate-900"
              style={{
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
                lineClamp: 2,
              }}
            >
              {hint.title}
            </h2>

            <p className="mt-1 truncate text-[13px] text-slate-500">{hint.retailer}</p>

            <div className="mt-auto pt-4">
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => onTogglePrivate(hint)}
                  className="rounded-full border border-[#eadfd8] bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-[#faf7f4]"
                >
                  {hint.private ? "🔒 Private" : "🔓 Public"}
                </button>
                <a
                  href={hint.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-[#eadfd8] bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-[#faf7f4]"
                >
                  Open
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function HintsPage() {
  const [hints, setHints] = useState([]);
  const [link, setLink] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [editingHintId, setEditingHintId] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", url: "" });
  const [isRefreshingEdit, setIsRefreshingEdit] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const numericPrices = useMemo(
    () => hints.map((hint) => hint.numericPrice).filter((value) => typeof value === "number"),
    [hints]
  );

  useEffect(() => {
    const supabase = createClient();

    async function loadSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);
    }

    loadSession();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const supabase = createClient();

    async function loadHints() {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("hints")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("position", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message);
        setHints([]);
        setIsLoading(false);
        return;
      }

      setHints(
        (data || []).map((row, index) => ({
          id: row.id,
          title: row.title || "Saved hint",
          retailer: row.retailer || normaliseRetailer(row.url || ""),
          priceLabel: row.price_text || formatPriceLabel(row.numeric_price, null),
          numericPrice: row.numeric_price,
          priceBand: row.priceBand || getPriceBand(row.numeric_price),
          image: row.image_url || "",
          fallbackGradient: buildFallbackGradient(index),
          tags: [],
          starred: Boolean(row.starred),
          private: Boolean(row.is_private),
          size: row.size || "portrait",
          url: row.url || "",
          position: row.position ?? index,
        }))
      );

      setIsLoading(false);
    }

    loadHints();
  }, [currentUser]);

  function moveHint(fromIndex, toIndex) {
    if (fromIndex == null || toIndex == null || fromIndex === toIndex) {
      setDraggedIndex(null);
      return;
    }

    setHints((current) => {
      const updated = [...current];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });

    setDraggedIndex(null);

    if (!currentUser) return;

    const supabase = createClient();

    const newHints = [...hints];
    const [moved] = newHints.splice(fromIndex, 1);
    newHints.splice(toIndex, 0, moved);

    const updates = newHints.map((hint, idx) => ({
      id: hint.id,
      position: idx,
    }));

    for (const update of updates) {
      supabase
        .from("hints")
        .update({ position: update.position })
        .eq("id", update.id);
    }
  }

  function openEditModal(hint) {
    setEditingHintId(hint.id);
    setEditForm({
      title: hint.title || "",
      url: hint.url || "",
    });
  }

  function closeEditModal() {
    setEditingHintId(null);
    setEditForm({ title: "", url: "" });
    setIsRefreshingEdit(false);
    setIsSavingEdit(false);
  }

  async function saveEditChanges() {
    if (!currentUser) return;

    const trimmedTitle = editForm.title.trim();
    const trimmedUrl = editForm.url.trim();

    setIsSavingEdit(true);

    const supabase = createClient();

    const { error } = await supabase
      .from("hints")
      .update({
        title: trimmedTitle,
        url: trimmedUrl,
        retailer: trimmedUrl ? normaliseRetailer(trimmedUrl) : null,
      })
      .eq("id", editingHintId);

    if (error) {
      setError(error.message);
      setIsSavingEdit(false);
      return;
    }

    setHints((current) =>
      current.map((hint) =>
        hint.id === editingHintId
          ? {
              ...hint,
              title: trimmedTitle || hint.title,
              url: trimmedUrl || hint.url,
              retailer: trimmedUrl ? normaliseRetailer(trimmedUrl) : hint.retailer,
            }
          : hint
      )
    );

    setIsSavingEdit(false);
    closeEditModal();
  }

  async function deleteHint() {
    if (!currentUser) return;

    const supabase = createClient();

    const { error } = await supabase
      .from("hints")
      .delete()
      .eq("id", editingHintId);

    if (error) {
      setError(error.message);
      return;
    }

    setHints((current) => current.filter((hint) => hint.id !== editingHintId));
    closeEditModal();
  }

  async function toggleStarred(hint) {
    if (!currentUser) return;

    const supabase = createClient();
    const newStarred = !hint.starred;

    setHints((current) =>
      current.map((h) => (h.id === hint.id ? { ...h, starred: newStarred } : h))
    );

    const { error } = await supabase
      .from("hints")
      .update({ starred: newStarred })
      .eq("id", hint.id);

    if (error) {
      setError(error.message);
      setHints((current) =>
        current.map((h) => (h.id === hint.id ? { ...h, starred: hint.starred } : h))
      );
    }
  }

  async function togglePrivate(hint) {
    if (!currentUser) return;

    const supabase = createClient();
    const newPrivate = !hint.private;

    setHints((current) =>
      current.map((h) => (h.id === hint.id ? { ...h, private: newPrivate } : h))
    );

    const { error } = await supabase
      .from("hints")
      .update({ is_private: newPrivate })
      .eq("id", hint.id);

    if (error) {
      setError(error.message);
      setHints((current) =>
        current.map((h) => (h.id === hint.id ? { ...h, private: hint.private } : h))
      );
    }
  }

  async function refreshHintFromLink() {
    const trimmed = editForm.url.trim();

    if (!trimmed || editingHintId == null) return;

    setIsRefreshingEdit(true);

    try {
      const response = await fetch("/api/link-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: trimmed }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Could not refresh this link.");
      }

      const numericPrice = extractNumericPrice(data.priceText);
      const refreshedTitle = shortenTitle(
        data.title || editForm.title || "",
        data.siteName || normaliseRetailer(trimmed)
      );

      setHints((current) =>
        current.map((hint) => {
          if (hint.id !== editingHintId) return hint;

          return {
            ...hint,
            title: refreshedTitle,
            retailer: data.siteName || normaliseRetailer(trimmed),
            priceLabel: formatPriceLabel(numericPrice, data.priceText),
            numericPrice,
            priceBand: getPriceBand(numericPrice),
            image: typeof data.image === "string" && data.image.startsWith("http") ? data.image : hint.image,
            url: data.url || trimmed,
          };
        })
      );

      setEditForm((current) => ({
        ...current,
        title: refreshedTitle,
        url: data.url || trimmed,
      }));
    } catch (err) {
      setError(err.message || "Could not refresh this link.");
    } finally {
      setIsRefreshingEdit(false);
    }
  }

  async function handleAddHint() {
    if (!currentUser) {
      setError("You must be signed in to add hints.");
      return;
    }

    const trimmed = link.trim();

    if (!trimmed) {
      setError("Paste a link first.");
      return;
    }

    setIsAdding(true);
    setError("");

    try {
      const response = await fetch("/api/link-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: trimmed }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Could not extract this link.");
      }

      const numericPrice = extractNumericPrice(data.priceText);
      const size = getSizeFromPrice(
        numericPrice,
        [...numericPrices, ...(numericPrice != null ? [numericPrice] : [])]
      );

      const retailer = data.siteName || normaliseRetailer(trimmed);
      const shortTitle = shortenTitle(data.title || "Saved hint", retailer);

      const newHint = {
        id: crypto.randomUUID(),
        title: shortTitle,
        retailer,
        priceLabel: formatPriceLabel(numericPrice, data.priceText),
        numericPrice,
        priceBand: getPriceBand(numericPrice),
        image: typeof data.image === "string" && data.image.startsWith("http") ? data.image : "",
        fallbackGradient: buildFallbackGradient(hints.length),
        tags: ["Added from link"],
        starred: false,
        private: false,
        size: size === "square" ? "portrait" : size,
        url: data.url || trimmed,
        position: hints.length,
      };

      const supabase = createClient();

      const { error } = await supabase.from("hints").insert({
        user_id: currentUser.id,
        title: newHint.title,
        url: newHint.url,
        image_url: newHint.image,
        retailer: newHint.retailer,
        price_text: newHint.priceLabel,
        numeric_price: newHint.numericPrice,
        starred: newHint.starred,
        is_private: newHint.private,
        position: newHint.position,
        source: "user",
      });

      if (error) {
        throw new Error(error.message || "Could not save this hint.");
      }

      setHints((current) => [newHint, ...current]);
      setLink("");
    } catch (err) {
      setError(err.message || "Could not extract this link.");
    } finally {
      setIsAdding(false);
    }
  }

  const hasRealHints = hints.length > 0;
  const visibleHints = hasRealHints ? hints : demoHints;

  return (
    <main className="min-h-screen bg-[#fffaf7] text-slate-800">
      <header className="border-b border-[#efe0d7] bg-[#fffaf7]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1380px] items-center justify-between px-5 py-4 md:px-8">
          <Link href="/feed" className="flex items-center gap-3.5">
            <LogoMark />
            <div className="text-[22px] font-extrabold tracking-[-0.05em] text-slate-900">
              Hinted<span className="text-[#f36f64]">.io</span>
            </div>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <nav className="flex items-center gap-2 sm:gap-3">
              <Link href="/feed" className="inline-flex h-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-4 text-[14px] font-semibold text-slate-700 hover:bg-[#fff5f0] sm:px-5">Feed</Link>
              <Link href="/hints" className="inline-flex h-11 items-center justify-center rounded-full bg-[#2f3b2d] px-4 text-[14px] font-semibold text-white sm:px-5">Hints</Link>
              <Link href="/circles" className="inline-flex h-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-4 text-[14px] font-semibold text-slate-700 hover:bg-[#fff5f0] sm:px-5">Circles</Link>
              <Link href="/shop" className="inline-flex h-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-4 text-[14px] font-semibold text-slate-700 hover:bg-[#fff5f0] sm:px-5">Shop</Link>
            </nav>

            <AvatarMenu />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1380px] px-5 py-10 md:px-8">
        <section className="text-center">
          <h1 className="text-[32px] font-extrabold tracking-[-0.06em] text-[#f19a78] sm:text-[44px] md:text-[56px]">
            Paste a link here...
          </h1>

          <div className="mt-6">
            <div className="mx-auto flex w-full max-w-[980px] flex-col gap-3 sm:flex-row">
              <input
                id="hint-link"
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddHint();
                  }
                }}
                placeholder="Paste any product, wishlist, or experience link"
                className="h-[72px] w-full rounded-full border border-[#eadcd3] bg-white px-8 text-[16px] text-slate-700 outline-none focus:border-[#f19a78]/60 focus:ring-4 focus:ring-[#f19a78]/10"
              />
              <button
                type="button"
                onClick={handleAddHint}
                disabled={isAdding || isLoading}
                className="inline-flex h-[72px] shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-8 text-sm font-semibold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-70 sm:min-w-[170px]"
              >
                {isAdding ? "Adding..." : isLoading ? "Loading..." : "Add hint"}
              </button>
            </div>

            {error ? (
              <p className="mt-3 text-sm font-medium text-[#c45c42]">{error}</p>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                We'll pull the title, image, and price from the link, then you can edit it any time.
              </p>
            )}
          </div>
        </section>

        <section className="mt-12">
          <div className="relative rounded-[36px] border border-[#efdfd6] bg-[#fffdfb] p-3 sm:p-5">
            <div
              className="pointer-events-none absolute inset-0 rounded-[36px] opacity-70"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(214, 195, 184, 0.28) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(214, 195, 184, 0.28) 1px, transparent 1px)
                `,
                backgroundSize: "76px 76px",
                backgroundPosition: "center center",
              }}
            />

            {isLoading ? (
              <div className="grid auto-rows-[46px] grid-cols-1 gap-6 md:grid-cols-12">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`relative flex h-full min-h-[280px] flex-col overflow-hidden rounded-[30px] border border-[#efdfd6] bg-[#f9f8f5] md:col-span-3 ${
                      i === 1 ? "md:row-span-9" : i === 2 ? "md:row-span-7" : "md:row-span-5"
                    }`}
                  >
                    <div className="relative min-h-[62%] flex-1 overflow-hidden">
                      <div className="skeleton h-full w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative grid auto-rows-[46px] grid-cols-1 gap-6 md:grid-cols-12">
                {visibleHints.map((hint, index) => (
                  <HintTile
                    key={hint.id}
                    hint={hint}
                    index={index}
                    draggedIndex={draggedIndex}
                    setDraggedIndex={setDraggedIndex}
                    moveHint={moveHint}
                    onEdit={openEditModal}
                    onToggleStarred={toggleStarred}
                    onTogglePrivate={togglePrivate}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <EditHintModal
        isOpen={editingHintId !== null}
        editForm={editForm}
        setEditForm={setEditForm}
        onClose={closeEditModal}
        onSave={saveEditChanges}
        onRefreshFromLink={refreshHintFromLink}
        onDelete={deleteHint}
        onTogglePrivate={() => {
          const hint = visibleHints.find((h) => h.id === editingHintId);
          if (hint) togglePrivate(hint);
        }}
        onToggleStarred={() => {
          const hint = visibleHints.find((h) => h.id === editingHintId);
          if (hint) toggleStarred(hint);
        }}
        isRefreshing={isRefreshingEdit}
        isSaving={isSavingEdit}
        hint={visibleHints.find((h) => h.id === editingHintId)}
      />
    </main>
  );
}
