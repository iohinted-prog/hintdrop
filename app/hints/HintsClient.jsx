"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
    image:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    fallbackGradient: "from-[#d9dfcf] via-[#b9c7aa] to-[#90a27e]",
    tags: ["Travel", "Big gift"],
    starred: true,
    private: false,
    size: "hero",
    url: "https://www.airbnb.co.uk/",
    position: 0,
  },
  {
    id: "demo-2",
    title: "Sony headphones",
    retailer: "amazon.co.uk",
    priceLabel: "About £249",
    numericPrice: 249,
    priceBand: "high",
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80",
    fallbackGradient: "from-[#ead8ca] via-[#dbc0a8] to-[#c4a17f]",
    tags: ["Tech", "Birthday"],
    starred: true,
    private: false,
    size: "feature",
    url: "https://www.amazon.co.uk/",
    position: 1,
  },
  {
    id: "demo-3",
    title: "Ceramics workshop",
    retailer: "classbento.co.uk",
    priceLabel: "About £78",
    numericPrice: 78,
    priceBand: "mid",
    image:
      "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80",
    fallbackGradient: "from-[#f3d5cc] via-[#e9b39f] to-[#d98c76]",
    tags: ["Experience", "Couples"],
    starred: false,
    private: false,
    size: "portrait",
    url: "https://classbento.co.uk/",
    position: 2,
  },
  {
    id: "demo-4",
    title: "Silk pillowcases",
    retailer: "johnlewis.com",
    priceLabel: "About £45",
    numericPrice: 45,
    priceBand: "small",
    image:
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
    fallbackGradient: "from-[#efe5de] via-[#e5d2c8] to-[#d1b2a4]",
    tags: ["Home", "Under £50"],
    starred: false,
    private: true,
    size: "square",
    url: "https://www.johnlewis.com/",
    position: 3,
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
  if (price >= 220) return "high";
  if (price >= 120) return "premium";
  if (price >= 60) return "mid";
  return "small";
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

function shortenTitle(title = "", retailer = "") {
  const source = String(title || "").trim();
  if (!source) return "Saved hint";

  const cleanRetailer = String(retailer || "")
    .replace(/^www\./i, "")
    .replace(/\.(co\.uk|com|co|net|org)$/i, "")
    .trim()
    .toLowerCase();

  const stopWords = new Set([
    "the",
    "and",
    "with",
    "for",
    "from",
    "new",
    "latest",
    "edition",
    "model",
    "official",
    "amazon",
    "uk",
    "black",
    "white",
    "silver",
    "blue",
    "green",
    "pink",
    "grey",
    "gray",
    "wireless",
    "bluetooth",
  ]);

  const categoryWords = [
    "headphones",
    "earbuds",
    "speaker",
    "kindle",
    "book",
    "pillowcase",
    "pillowcases",
    "dish",
    "pan",
    "mug",
    "print",
    "necklace",
    "ring",
    "bag",
    "dress",
    "trainer",
    "trainers",
    "jacket",
    "candle",
    "coffee",
    "set",
    "workshop",
    "experience",
    "voucher",
    "lego",
    "camera",
    "watch",
    "sofa",
    "blanket",
    "cabin",
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
  const foundCategory = words.find((word) =>
    categoryWords.includes(word.toLowerCase())
  );

  let finalWords;
  if (foundCategory && brand.toLowerCase() !== foundCategory.toLowerCase()) {
    finalWords = [brand, foundCategory];
  } else {
    finalWords = words.slice(0, Math.min(2, words.length));
  }

  const compact = finalWords.join(" ").trim();
  return compact.charAt(0).toUpperCase() + compact.slice(1);
}

function getBoardSize(price, index, allPrices) {
  if (price == null) return index % 5 === 0 ? "portrait" : "square";

  const sorted = [...allPrices].sort((a, b) => a - b);
  const highCut = sorted[Math.max(0, Math.floor(sorted.length * 0.75))] ?? price;
  const midCut = sorted[Math.max(0, Math.floor(sorted.length * 0.45))] ?? price;

  if (price >= highCut && price >= 180) {
    return index % 3 === 0 ? "hero" : "feature";
  }
  if (price >= midCut && price >= 75) {
    return "portrait";
  }
  return "square";
}

function getTileClass(size) {
  if (size === "hero") return "md:col-span-6 md:row-span-12";
  if (size === "feature") return "md:col-span-4 md:row-span-10";
  if (size === "portrait") return "md:col-span-4 md:row-span-8";
  return "md:col-span-4 md:row-span-6";
}

function getPricePill(priceBand) {
  if (priceBand === "high") return "bg-[#2f3b2d] text-white";
  if (priceBand === "premium") return "bg-[#fff1e9] text-[#df7c59]";
  if (priceBand === "mid") return "bg-[#f3f0ff] text-[#7c61bf]";
  return "bg-[#f1f5ec] text-[#627f53]";
}

function HintComposerModal({
  isOpen,
  draft,
  setDraft,
  onClose,
  onSave,
  isSaving,
}) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [draft.image, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(33,24,20,0.42)] px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-[640px] rounded-[32px] border border-[#ecdcd2] bg-white p-6 shadow-[0_28px_80px_rgba(75,45,30,0.18)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#e08a67]">
              New hint
            </p>
            <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.05em] text-slate-900">
              Check it before saving
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#ead9d0] text-slate-500 hover:bg-[#faf6f3]"
            aria-label="Close add hint modal"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-[220px_1fr]">
          <div className="overflow-hidden rounded-[24px] border border-[#f0dfd6] bg-[#f8f3ef]">
            {draft.image && !imageFailed ? (
              <img
                src={draft.image}
                alt={draft.title || "Hint preview"}
                className="aspect-[4/5] h-full w-full object-cover"
                onError={() => setImageFailed(true)}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex aspect-[4/5] items-end bg-gradient-to-br from-[#ead8ca] via-[#dbc0a8] to-[#c4a17f] p-4">
                <p className="text-sm font-medium text-white/90">
                  {draft.retailer || "Saved link"}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="composer-link"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Link
              </label>
              <input
                id="composer-link"
                type="url"
                value={draft.url}
                onChange={(e) =>
                  setDraft((current) => ({ ...current, url: e.target.value }))
                }
                className="h-14 w-full rounded-[18px] border border-[#eadcd3] bg-white px-5 text-[15px] text-slate-700 outline-none focus:border-[#f19a78]/60 focus:ring-4 focus:ring-[#f19a78]/10"
              />
            </div>

            <div>
              <label
                htmlFor="composer-title"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Name
              </label>
              <input
                id="composer-title"
                type="text"
                value={draft.title}
                onChange={(e) =>
                  setDraft((current) => ({ ...current, title: e.target.value }))
                }
                className="h-14 w-full rounded-[18px] border border-[#eadcd3] bg-white px-5 text-[15px] text-slate-700 outline-none focus:border-[#f19a78]/60 focus:ring-4 focus:ring-[#f19a78]/10"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[20px] border border-[#f0e0d7] bg-[#fffaf7] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Retailer
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {draft.retailer || "Saved link"}
                </p>
              </div>

              <div className="rounded-[20px] border border-[#f0e0d7] bg-[#fffaf7] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Price
                </p>
                <p className="mt-1 text-sm text-slate-700">{draft.priceLabel}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    private: !current.private,
                  }))
                }
                className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                  draft.private
                    ? "border-[#e08a67] bg-[#fff7f2] text-[#e08a67]"
                    : "border-[#ead9d0] bg-white text-slate-700 hover:bg-[#faf6f3]"
                }`}
              >
                {draft.private ? "🔒 Private" : "🔓 Public"}
              </button>
            </div>

            <p className="text-sm text-slate-500">
              We can even remind you when it goes on sale.
            </p>
          </div>
        </div>

        <div className="mt-7 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-12 items-center justify-center rounded-full border border-[#ead9d0] px-5 text-sm font-semibold text-slate-700 hover:bg-[#faf6f3]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-6 text-sm font-semibold text-white shadow-lg disabled:opacity-70"
          >
            {isSaving ? "Saving..." : "Save hint"}
          </button>
        </div>
      </div>
    </div>
  );
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
  if (!isOpen || !hint) return null;

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
            <label
              htmlFor="edit-link"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Link
            </label>
            <input
              id="edit-link"
              type="url"
              value={editForm.url}
              onChange={(e) =>
                setEditForm((current) => ({ ...current, url: e.target.value }))
              }
              className="h-14 w-full rounded-[18px] border border-[#eadcd3] bg-white px-5 text-[15px] text-slate-700 outline-none focus:border-[#f19a78]/60 focus:ring-4 focus:ring-[#f19a78]/10"
            />
          </div>

          <div>
            <label
              htmlFor="edit-title"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Name
            </label>
            <input
              id="edit-title"
              type="text"
              value={editForm.title}
              onChange={(e) =>
                setEditForm((current) => ({ ...current, title: e.target.value }))
              }
              className="h-14 w-full rounded-[18px] border border-[#eadcd3] bg-white px-5 text-[15px] text-slate-700 outline-none focus:border-[#f19a78]/60 focus:ring-4 focus:ring-[#f19a78]/10"
            />
          </div>

          <div className="flex items-center gap-4">
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
              {isRefreshing ? "Refreshing..." : "Refresh from link"}
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

function HintCard({
  hint,
  dragging,
  onEdit,
  onToggleStarred,
  onTogglePrivate,
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(hint.image) && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [hint.image]);

  return (
    <article
      className={`group relative flex h-full min-h-[320px] flex-col overflow-hidden rounded-[32px] border transition-all duration-300 ${
        dragging
          ? "rotate-[1.5deg] border-[#f0cdbf] bg-white shadow-[0_30px_80px_rgba(115,70,45,0.22)]"
          : hint.private
          ? "border-white/50 bg-white/60 shadow-[0_12px_28px_rgba(176,118,86,0.08)] backdrop-blur-sm hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(176,118,86,0.14)]"
          : "border-[#f0dfd6] bg-white shadow-[0_8px_24px_rgba(176,118,86,0.08)] hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(176,118,86,0.14)]"
      }`}
    >
      <div className="relative flex h-full flex-col">
        <div className="relative min-h-[66%] flex-1 overflow-hidden">
          {showImage ? (
            <>
              <img
                src={hint.image}
                alt={hint.title}
                className={`absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] ${
                  hint.private ? "opacity-80" : ""
                }`}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setImageFailed(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[rgba(28,22,18,0.42)] via-[rgba(28,22,18,0.05)] to-[rgba(255,255,255,0.02)]" />
            </>
          ) : (
            <div
              className={`absolute inset-0 bg-gradient-to-br ${hint.fallbackGradient} ${
                hint.private ? "opacity-80" : ""
              }`}
            />
          )}

          <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-700 backdrop-blur-sm">
                ⋮⋮ Drag
              </div>

              {hint.starred && (
                <div className="rounded-full bg-[#fff2ea] px-3 py-1 text-[11px] font-semibold text-[#e27956]">
                  Top pick
                </div>
              )}

              {hint.private && (
                <div className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-600 backdrop-blur-sm">
                  Private
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(hint);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-white/75 text-[15px] text-slate-500 backdrop-blur-sm hover:text-slate-800"
                  aria-label="Edit hint"
                >
                  ✎
                </button>
              )}

              {onToggleStarred && (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleStarred(hint);
                  }}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-white/75 text-[16px] backdrop-blur-sm ${
                    hint.starred ? "text-[#f36f64]" : "text-slate-400 hover:text-[#f36f64]"
                  }`}
                  aria-label={hint.starred ? "Unhighlight hint" : "Highlight hint"}
                >
                  ★
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="relative -mt-7 flex flex-1 px-4 pb-4 sm:px-5 sm:pb-5">
          <div
            className={`flex w-full flex-1 flex-col rounded-[26px] p-5 shadow-sm backdrop-blur-md ${
              hint.private ? "bg-white/84" : "bg-white/92"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getPricePill(
                  hint.priceBand
                )}`}
              >
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
              className="mt-3 min-w-0 overflow-hidden text-[22px] font-semibold tracking-[-0.05em] text-slate-900"
              style={{
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
              }}
            >
              {hint.title}
            </h2>

            <p className="mt-1 truncate text-[13px] text-slate-500">{hint.retailer}</p>

            <div className="mt-auto pt-5">
              <div className="flex items-center justify-end gap-2">
                {onTogglePrivate && (
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePrivate(hint);
                    }}
                    className="rounded-full border border-[#eadfd8] bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-[#faf7f4]"
                  >
                    {hint.private ? "🔒 Private" : "🔓 Public"}
                  </button>
                )}

                <a
                  href={hint.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
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

function SortableHintTile({
  hint,
  onEdit,
  onToggleStarred,
  onTogglePrivate,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: hint.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={getTileClass(hint.size)}>
      <div {...attributes} {...listeners} className="h-full touch-none cursor-grab active:cursor-grabbing">
        <HintCard
          hint={hint}
          dragging={isDragging}
          onEdit={onEdit}
          onToggleStarred={onToggleStarred}
          onTogglePrivate={onTogglePrivate}
        />
      </div>
    </div>
  );
}

export default function HintsClient() {
  const [hints, setHints] = useState([]);
  const [link, setLink] = useState("");
  const [isFetchingDraft, setIsFetchingDraft] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [error, setError] = useState("");
  const [editingHintId, setEditingHintId] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", url: "" });
  const [isRefreshingEdit, setIsRefreshingEdit] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);

  const [draftHint, setDraftHint] = useState({
    title: "",
    url: "",
    image: "",
    retailer: "",
    priceLabel: "Price unavailable",
    numericPrice: null,
    private: false,
  });
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const hasRealHints = hints.length > 0;
  const visibleHints = hasRealHints ? hints : demoHints;
  const activeHint = visibleHints.find((hint) => hint.id === activeId) || null;

  const numericPrices = useMemo(() => {
    return hints
      .map((hint) => hint.numericPrice)
      .filter((value) => typeof value === "number");
  }, [hints]);

  useEffect(() => {
    const supabase = createClient();

    async function loadSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUser(user || null);
      setIsLoading(false);
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
        .order("created_at", { ascending: true });

      if (error) {
        setError(error.message);
        setHints([]);
        setIsLoading(false);
        return;
      }

      const rows = data || [];
      const prices = rows
        .map((row) => row.numeric_price)
        .filter((value) => typeof value === "number");

      setHints(
        rows.map((row, index) => ({
          id: row.id,
          title: row.title || "Saved hint",
          retailer: row.retailer || normaliseRetailer(row.url || ""),
          priceLabel: row.price_text || formatPriceLabel(row.numeric_price, null),
          numericPrice: row.numeric_price,
          priceBand: getPriceBand(row.numeric_price),
          image: row.image_url || "",
          fallbackGradient: buildFallbackGradient(index),
          tags: [],
          starred: Boolean(row.starred),
          private: Boolean(row.is_private),
          size: row.size || getBoardSize(row.numeric_price, index, prices),
          url: row.url || "",
          position: row.position ?? index,
        }))
      );

      setIsLoading(false);
    }

    loadHints();
  }, [currentUser]);

  async function persistPositions(updatedHints) {
    if (!currentUser) return;

    const supabase = createClient();

    await Promise.all(
      updatedHints.map((hint, index) =>
        supabase.from("hints").update({ position: index }).eq("id", hint.id)
      )
    );
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
    if (!currentUser || !editingHintId) return;

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
    if (!currentUser || !editingHintId) return;

    const supabase = createClient();

    const { error } = await supabase.from("hints").delete().eq("id", editingHintId);

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
    if (!trimmed || !editingHintId) return;

    setIsRefreshingEdit(true);
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
        throw new Error(data?.error || "Could not refresh this link.");
      }

      const numericPrice = extractNumericPrice(data.priceText);
      const retailer = data.siteName || normaliseRetailer(trimmed);
      const refreshedTitle = shortenTitle(
        data.title || editForm.title || "",
        retailer
      );

      setHints((current) =>
        current.map((hint, index) => {
          if (hint.id !== editingHintId) return hint;

          return {
            ...hint,
            title: refreshedTitle,
            retailer,
            priceLabel: formatPriceLabel(numericPrice, data.priceText),
            numericPrice,
            priceBand: getPriceBand(numericPrice),
            image:
              typeof data.image === "string" && data.image.startsWith("http")
                ? data.image
                : hint.image,
            url: data.url || trimmed,
            size: getBoardSize(numericPrice, index, numericPrices),
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

  async function handleFetchDraft() {
    if (!currentUser) {
      setError("You must be signed in to add hints.");
      return;
    }

    const trimmed = link.trim();

    if (!trimmed) {
      setError("Paste a link first.");
      return;
    }

    setIsFetchingDraft(true);
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
      const retailer = data.siteName || normaliseRetailer(trimmed);
      const shortTitle = shortenTitle(data.title || "Saved hint", retailer);

      setDraftHint({
        title: shortTitle,
        url: data.url || trimmed,
        image:
          typeof data.image === "string" && data.image.startsWith("http")
            ? data.image
            : "",
        retailer,
        priceLabel: formatPriceLabel(numericPrice, data.priceText),
        numericPrice,
        private: false,
      });

      setIsComposerOpen(true);
    } catch (err) {
      setError(err.message || "Could not extract this link.");
    } finally {
      setIsFetchingDraft(false);
    }
  }

  async function handleSaveDraft() {
    if (!currentUser) return;

    setIsSavingDraft(true);
    setError("");

    try {
      const incomingPriceSet = [
        ...numericPrices,
        ...(draftHint.numericPrice != null ? [draftHint.numericPrice] : []),
      ];

      const newHint = {
        id: crypto.randomUUID(),
        title: shortenTitle(draftHint.title || "Saved hint", draftHint.retailer),
        retailer: draftHint.retailer || normaliseRetailer(draftHint.url),
        priceLabel: draftHint.priceLabel,
        numericPrice: draftHint.numericPrice,
        priceBand: getPriceBand(draftHint.numericPrice),
        image: draftHint.image || "",
        fallbackGradient: buildFallbackGradient(hints.length),
        tags: [],
        starred: false,
        private: draftHint.private,
        size: getBoardSize(draftHint.numericPrice, hints.length, incomingPriceSet),
        url: draftHint.url,
        position: 0,
      };

      const reordered = [newHint, ...hints].map((hint, index) => ({
        ...hint,
        position: index,
      }));

      const supabase = createClient();

      const { error: insertError } = await supabase.from("hints").insert({
        id: newHint.id,
        user_id: currentUser.id,
        title: newHint.title,
        url: newHint.url,
        image_url: newHint.image,
        retailer: newHint.retailer,
        price_text: newHint.priceLabel,
        numeric_price: newHint.numericPrice,
        starred: newHint.starred,
        is_private: newHint.private,
        position: 0,
        size: newHint.size,
        source: "user",
      });

      if (insertError) {
        throw new Error(insertError.message || "Could not save this hint.");
      }

      setHints(reordered);
      setLink("");
      setIsComposerOpen(false);

      await persistPositions(reordered);
    } catch (err) {
      setError(err.message || "Could not save this hint.");
    } finally {
      setIsSavingDraft(false);
    }
  }

  function handleDragStart(event) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;
    if (!currentUser) return;

    const oldIndex = hints.findIndex((hint) => hint.id === active.id);
    const newIndex = hints.findIndex((hint) => hint.id === over.id);

    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(hints, oldIndex, newIndex).map((hint, index) => ({
      ...hint,
      position: index,
    }));

    setHints(reordered);
    await persistPositions(reordered);
  }

  return (
    <main className="min-h-screen bg-[#fff8f4] text-slate-800">
      <header className="border-b border-[#efe0d7] bg-[#fff8f4]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between px-5 py-4 md:px-8">
          <Link href="/feed" className="flex items-center gap-3.5">
            <LogoMark />
            <div className="text-[22px] font-extrabold tracking-[-0.05em] text-slate-900">
              Hinted<span className="text-[#f36f64]">.io</span>
            </div>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <nav className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/feed"
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-4 text-[14px] font-semibold text-slate-700 hover:bg-[#fff5f0] sm:px-5"
              >
                Feed
              </Link>
              <Link
                href="/hints"
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#2f3b2d] px-4 text-[14px] font-semibold text-white sm:px-5"
              >
                Hints
              </Link>
              <Link
                href="/circles"
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-4 text-[14px] font-semibold text-slate-700 hover:bg-[#fff5f0] sm:px-5"
              >
                Circles
              </Link>
              <Link
                href="/shop"
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-4 text-[14px] font-semibold text-slate-700 hover:bg-[#fff5f0] sm:px-5"
              >
                Shop
              </Link>
            </nav>

            <AvatarMenu />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1480px] px-5 py-10 md:px-8 md:py-12">
        <section className="mx-auto max-w-[920px] text-center">
          <h1 className="text-[38px] font-extrabold tracking-[-0.07em] text-[#f19a78] sm:text-[48px] md:text-[58px]">
            Paste a link here...
          </h1>

          <p className="mx-auto mt-4 max-w-[640px] text-[15px] leading-6 text-slate-500 sm:text-[16px]">
            Save things you’d genuinely love, keep some private, and we can even
            remind you when it goes on sale.
          </p>

          <div className="mt-7">
            <div className="mx-auto flex w-full max-w-[860px] flex-col gap-3 sm:flex-row">
              <input
                id="hint-link"
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleFetchDraft();
                  }
                }}
                placeholder="Paste a link here..."
                className="h-[72px] w-full rounded-full border border-[#eadcd3] bg-white px-8 text-[16px] text-slate-700 outline-none focus:border-[#f19a78]/60 focus:ring-4 focus:ring-[#f19a78]/10"
              />
              <button
                type="button"
                onClick={handleFetchDraft}
                disabled={isFetchingDraft || isLoading}
                className="inline-flex h-[72px] shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-8 text-sm font-semibold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-70 sm:min-w-[170px]"
              >
                {isFetchingDraft ? "Fetching..." : isLoading ? "Loading..." : "Add hint"}
              </button>
            </div>

            {error ? (
              <p className="mt-3 text-sm font-medium text-[#c45c42]">{error}</p>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                We’ll pull the image, title, and price first, then you can name it
                and choose privacy before saving.
              </p>
            )}
          </div>
        </section>

        <section className="mt-14">
          <div className="relative overflow-hidden rounded-[40px] border border-[#efdfd6] bg-[#fffdfb] p-4 sm:p-6 md:p-7">
            <div
              className="pointer-events-none absolute inset-0 opacity-90"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(217, 196, 184, 0.45) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(217, 196, 184, 0.45) 1px, transparent 1px)
                `,
                backgroundSize: "88px 88px",
                backgroundPosition: "center center",
              }}
            />

            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.88),transparent_44%)]" />

            {isLoading ? (
              <div className="relative grid auto-rows-[34px] grid-cols-1 gap-8 md:grid-cols-12">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`overflow-hidden rounded-[32px] border border-[#efdfd6] bg-[#f9f8f5] ${
                      i === 1
                        ? "md:col-span-6 md:row-span-12"
                        : i === 2
                        ? "md:col-span-4 md:row-span-10"
                        : "md:col-span-4 md:row-span-8"
                    }`}
                  >
                    <div className="skeleton h-full min-h-[320px] w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={visibleHints.map((hint) => hint.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="relative grid auto-rows-[34px] grid-cols-1 gap-8 md:grid-cols-12">
                    {visibleHints.map((hint) => (
                      <SortableHintTile
                        key={hint.id}
                        hint={hint}
                        onEdit={openEditModal}
                        onToggleStarred={toggleStarred}
                        onTogglePrivate={togglePrivate}
                      />
                    ))}
                  </div>
                </SortableContext>

                <DragOverlay
                  dropAnimation={{
                    duration: 220,
                    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                >
                  {activeHint ? (
                    <div className={`${getTileClass(activeHint.size)} w-[min(92vw,420px)]`}>
                      <HintCard hint={activeHint} dragging />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        </section>
      </div>

      <HintComposerModal
        isOpen={isComposerOpen}
        draft={draftHint}
        setDraft={setDraftHint}
        onClose={() => setIsComposerOpen(false)}
        onSave={handleSaveDraft}
        isSaving={isSavingDraft}
      />

      <EditHintModal
        isOpen={editingHintId !== null}
        editForm={editForm}
        setEditForm={setEditForm}
        onClose={closeEditModal}
        onSave={saveEditChanges}
        onRefreshFromLink={refreshHintFromLink}
        onDelete={deleteHint}
        onTogglePrivate={() => {
          const hint = hints.find((h) => h.id === editingHintId);
          if (hint) togglePrivate(hint);
        }}
        onToggleStarred={() => {
          const hint = hints.find((h) => h.id === editingHintId);
          if (hint) toggleStarred(hint);
        }}
        isRefreshing={isRefreshingEdit}
        isSaving={isSavingEdit}
        hint={hints.find((h) => h.id === editingHintId)}
      />
    </main>
  );
}
