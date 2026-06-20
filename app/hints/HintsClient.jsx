"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  closestCenter,
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
    position: 1,
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
    size: "hero",
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
    image:
      "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80",
    fallbackGradient: "from-[#f3d5cc] via-[#e9b39f] to-[#d98c76]",
    tags: ["Experience", "Couples"],
    starred: false,
    private: false,
    size: "feature",
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
    image:
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
    fallbackGradient: "from-[#efe5de] via-[#e5d2c8] to-[#d1b2a4]",
    tags: ["Home", "Under £50"],
    starred: false,
    private: true,
    size: "base",
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
  if (price >= 95) return "mid";
  return "small";
}

function getSizeFromPrice(price, allPrices) {
  if (price == null || allPrices.length < 3) return "base";

  const sorted = [...allPrices].sort((a, b) => a - b);
  const middleCut = sorted[Math.floor(sorted.length * 0.6)];
  const topCut = sorted[Math.floor(sorted.length * 0.85)];

  if (price >= topCut) return "hero";
  if (price >= middleCut) return "feature";
  return "base";
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
  if (size === "hero") return "md:col-span-4 md:row-span-10";
  if (size === "feature") return "md:col-span-4 md:row-span-8";
  return "md:col-span-4 md:row-span-7";
}

function getImageFrameClass(size) {
  if (size === "hero") return "min-h-[66%]";
  if (size === "feature") return "min-h-[63%]";
  return "min-h-[60%]";
}

function getPricePill(priceBand) {
  if (priceBand === "high") return "bg-[#2f3b2d] text-white";
  if (priceBand === "mid") return "bg-[#fff1e9] text-[#df7c59]";
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
    "coat",
    "boots",
    "sandals",
    "lamp",
    "vase",
    "frame",
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
    finalWords = words.slice(0, words.length >= 2 ? 2 : 1);
  }

  const compact = finalWords.join(" ").trim();
  return compact.charAt(0).toUpperCase() + compact.slice(1);
}

function inferImageStyle(hint) {
  const title = `${hint.title || ""} ${hint.retailer || ""}`.toLowerCase();
  const productWords = [
    "headphones",
    "earbuds",
    "speaker",
    "watch",
    "ring",
    "necklace",
    "bag",
    "boots",
    "sandals",
    "pillowcase",
    "pillowcases",
    "lamp",
    "vase",
    "mug",
    "candle",
    "camera",
    "trainer",
    "trainers",
    "jacket",
    "dress",
    "coat",
    "kindle",
    "lego",
  ];

  return productWords.some((word) => title.includes(word)) ? "object-contain" : "object-cover";
}

function ComposerPreview({
  preview,
  titleDraft,
  setTitleDraft,
  visibility,
  setVisibility,
  isAdding,
  onAdd,
  onClear,
}) {
  return (
    <div className="mx-auto mt-4 w-full max-w-[980px] rounded-[30px] border border-[#efdfd6] bg-white/88 p-4 shadow-[0_18px_40px_rgba(176,118,86,0.08)] backdrop-blur-sm sm:p-5">
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex h-[172px] w-full shrink-0 items-center justify-center overflow-hidden rounded-[24px] border border-[#f0e1d8] bg-[#fbf7f3] md:w-[220px]">
          {preview.image ? (
            <>
              <div className="absolute inset-[14px] rounded-[20px] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),_rgba(247,239,233,0.95)_62%,_rgba(235,220,212,0.9))]" />
              <img
                src={preview.image}
                alt={titleDraft || preview.title || "Hint preview"}
                className={`relative z-[1] h-[82%] w-[82%] ${inferImageStyle(preview)} drop-shadow-[0_16px_24px_rgba(92,62,46,0.18)]`}
                referrerPolicy="no-referrer"
              />
            </>
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${preview.fallbackGradient}`} />
          )}

          <div className="pointer-events-none absolute inset-x-5 bottom-4 h-6 rounded-full bg-[rgba(66,44,33,0.10)] blur-md" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setVisibility("shared")}
              className={`rounded-full px-4 py-2 text-[12px] font-semibold transition ${
                visibility === "shared"
                  ? "bg-[#2f3b2d] text-white"
                  : "border border-[#ead9d0] bg-white text-slate-600 hover:bg-[#faf6f3]"
              }`}
            >
              Shared
            </button>
            <button
              type="button"
              onClick={() => setVisibility("private")}
              className={`rounded-full px-4 py-2 text-[12px] font-semibold transition ${
                visibility === "private"
                  ? "bg-[#fff3ec] text-[#df7c59]"
                  : "border border-[#ead9d0] bg-white text-slate-600 hover:bg-[#faf6f3]"
              }`}
            >
              Private
            </button>

            {preview.priceLabel ? (
              <span
                className={`rounded-full px-3 py-2 text-[12px] font-semibold ${getPricePill(
                  preview.priceBand
                )}`}
              >
                {preview.priceLabel}
              </span>
            ) : null}
          </div>

          <div className="mt-4">
            <input
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              className="h-14 w-full rounded-[18px] border border-[#eadcd3] bg-white px-5 text-[18px] font-semibold tracking-[-0.03em] text-slate-900 outline-none focus:border-[#f19a78]/60 focus:ring-4 focus:ring-[#f19a78]/10"
              placeholder="Name this hint"
            />
            <p className="mt-2 truncate text-[13px] text-slate-500">
              {preview.retailer}
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onAdd}
              disabled={isAdding}
              className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-6 text-sm font-semibold text-white shadow-lg disabled:opacity-70"
            >
              {isAdding ? "Adding..." : "Save hint"}
            </button>
            <button
              type="button"
              onClick={onClear}
              disabled={isAdding}
              className="inline-flex h-12 items-center justify-center rounded-full border border-[#ead9d0] px-5 text-sm font-semibold text-slate-600 hover:bg-[#faf6f3] disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
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

function HintCard({
  hint,
  isDragging = false,
  dragListeners,
  dragAttributes,
  setDragActivatorNodeRef,
  onEdit,
  onToggleStarred,
  onTogglePrivate,
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(hint.image) && !imageFailed;
  const imageFit = inferImageStyle(hint);

  return (
    <article
      className={`group relative flex h-full min-h-[360px] flex-col overflow-hidden rounded-[32px] border transition-[transform,box-shadow,opacity] duration-200 ${
        getTileClass(hint.size)
      } ${
        isDragging
          ? "z-20 rotate-[1.2deg] shadow-[0_26px_60px_rgba(176,118,86,0.22)]"
          : "hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(176,118,86,0.14)]"
      } ${
        hint.private
          ? "border-white/50 bg-white/60 shadow-[0_10px_28px_rgba(176,118,86,0.08)] backdrop-blur-sm"
          : "border-[#f0dfd6] bg-white shadow-sm"
      }`}
    >
      <div className="relative flex h-full flex-col">
        <div
          className={`relative flex-1 overflow-hidden ${getImageFrameClass(
            hint.size
          )}`}
        >
          {showImage ? (
            <>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,250,246,0.96),_rgba(245,236,229,0.92)_58%,_rgba(233,220,211,0.88))]" />
              <div className="absolute inset-[18px] rounded-[26px] border border-white/70 bg-white/38 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-[2px]" />
              <img
                src={hint.image}
                alt={hint.title}
                className={`absolute inset-[28px] h-[calc(100%-56px)] w-[calc(100%-56px)] ${imageFit} drop-shadow-[0_24px_30px_rgba(96,69,54,0.18)] ${hint.private ? "opacity-86" : ""}`}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setImageFailed(true)}
              />
              <div className="pointer-events-none absolute inset-x-10 bottom-7 h-7 rounded-full bg-[rgba(67,42,28,0.12)] blur-md" />
            </>
          ) : (
            <>
              <div
                className={`absolute inset-0 bg-gradient-to-br ${hint.fallbackGradient} ${
                  hint.private ? "opacity-80" : ""
                }`}
              />
              <div className="absolute inset-[18px] rounded-[26px] border border-white/35 bg-white/18 backdrop-blur-[2px]" />
            </>
          )}

          <div className="absolute left-4 right-4 top-4 flex items-start justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                ref={setDragActivatorNodeRef}
                {...dragAttributes}
                {...dragListeners}
                className="flex cursor-grab touch-none items-center gap-1 rounded-full bg-white/82 px-3 py-1 text-[11px] font-semibold text-slate-700 backdrop-blur-sm active:cursor-grabbing"
                title="Drag to reorder"
                aria-label={`Drag ${hint.title}`}
              >
                ⋮⋮ Drag
              </button>

              {hint.starred && (
                <div className="rounded-full bg-[#fff2ea] px-3 py-1 text-[11px] font-semibold text-[#e27956]">
                  Top pick
                </div>
              )}

              {hint.private && (
                <div className="rounded-full bg-white/76 px-3 py-1 text-[11px] font-semibold text-slate-600 backdrop-blur-sm">
                  Private
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onEdit(hint)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-white/76 text-[15px] text-slate-500 backdrop-blur-sm hover:text-slate-800"
                aria-label="Edit hint"
              >
                ✎
              </button>

              <button
                onClick={() => onToggleStarred(hint)}
                className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-white/76 text-[16px] backdrop-blur-sm ${
                  hint.starred
                    ? "text-[#f36f64]"
                    : "text-slate-400 hover:text-[#f36f64]"
                }`}
                aria-label={hint.starred ? "Unhighlight hint" : "Highlight hint"}
                type="button"
              >
                ★
              </button>
            </div>
          </div>
        </div>

        <div className="relative -mt-8 flex flex-1 px-4 pb-4 sm:px-5 sm:pb-5">
          <div
            className={`flex w-full flex-1 flex-col rounded-[26px] p-4 shadow-sm backdrop-blur-md ${
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
              className="mt-3 min-w-0 overflow-hidden text-[21px] font-semibold tracking-[-0.04em] text-slate-900"
              style={{
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
                lineClamp: 2,
              }}
            >
              {hint.title}
            </h2>

            <p className="mt-1 truncate text-[13px] text-slate-500">
              {hint.retailer}
            </p>

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

function SortableHintTile(props) {
  const { hint } = props;
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: hint.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "z-20" : ""}>
      <HintCard
        {...props}
        isDragging={isDragging}
        dragListeners={listeners}
        dragAttributes={attributes}
        setDragActivatorNodeRef={setActivatorNodeRef}
      />
    </div>
  );
}

export default function HintsPage() {
  const [hints, setHints] = useState([]);
  const [link, setLink] = useState("");
  const [draftPreview, setDraftPreview] = useState(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftVisibility, setDraftVisibility] = useState("shared");
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");
  const [editingHintId, setEditingHintId] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", url: "" });
  const [isRefreshingEdit, setIsRefreshingEdit] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);

  const numericPrices = useMemo(
    () =>
      hints
        .map((hint) => hint.numericPrice)
        .filter((value) => typeof value === "number"),
    [hints]
  );

  const activeHint = useMemo(
    () => hints.find((hint) => hint.id === activeId) || null,
    [hints, activeId]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 120, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
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

      const allLoadedPrices = (data || [])
        .map((item) => item.numeric_price)
        .filter((value) => typeof value === "number");

      setHints(
        (data || []).map((row, index) => ({
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
          size: row.size || getSizeFromPrice(row.numeric_price, allLoadedPrices),
          url: row.url || "",
          position: row.position ?? index,
        }))
      );

      setIsLoading(false);
    }

    loadHints();
  }, [currentUser]);

  async function persistHintOrder(updatedHints) {
    if (!currentUser) return;

    const supabase = createClient();

    await Promise.all(
      updatedHints.map((hint, index) =>
        supabase.from("hints").update({ position: index }).eq("id", hint.id)
      )
    );
  }

  function resetComposer() {
    setDraftPreview(null);
    setDraftTitle("");
    setDraftVisibility("shared");
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
      const refreshedTitle =
        data.titleShort ||
        shortenTitle(
          data.title || editForm.title || "",
          data.siteName || normaliseRetailer(trimmed)
        );

      const chosenImage =
        typeof data.selectedImage === "string" && data.selectedImage.startsWith("http")
          ? data.selectedImage
          : typeof data.image === "string" && data.image.startsWith("http")
          ? data.image
          : "";

      setHints((current) => {
        const pricePool = current
          .map((hint) => (hint.id === editingHintId ? numericPrice : hint.numericPrice))
          .filter((value) => typeof value === "number");

        return current.map((hint) => {
          if (hint.id !== editingHintId) return hint;

          return {
            ...hint,
            title: refreshedTitle,
            retailer: data.siteName || normaliseRetailer(trimmed),
            priceLabel: formatPriceLabel(numericPrice, data.priceText),
            numericPrice,
            priceBand: getPriceBand(numericPrice),
            image: chosenImage || hint.image,
            size: getSizeFromPrice(numericPrice, pricePool),
            url: data.url || trimmed,
          };
        });
      });

      setEditForm((current) => ({
        ...current,
        title: refreshedTitle,
        url: data.url || trimmed,
      }));

      const supabase = createClient();
      await supabase
        .from("hints")
        .update({
          title: refreshedTitle,
          url: data.url || trimmed,
          image_url: chosenImage || null,
          retailer: data.siteName || normaliseRetailer(trimmed),
          price_text: formatPriceLabel(numericPrice, data.priceText),
          numeric_price: numericPrice,
        })
        .eq("id", editingHintId);
    } catch (err) {
      setError(err.message || "Could not refresh this link.");
    } finally {
      setIsRefreshingEdit(false);
    }
  }

  async function handleFetchPreview() {
    if (!currentUser) {
      setError("You must be signed in to add hints.");
      return;
    }

    const trimmed = link.trim();

    if (!trimmed) {
      setError("Paste a link first.");
      return;
    }

    setIsFetchingPreview(true);
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
      const allPrices = [...numericPrices, ...(numericPrice != null ? [numericPrice] : [])];
      const retailer = data.siteName || normaliseRetailer(trimmed);
      const shortTitle =
        data.titleShort || shortenTitle(data.title || "Saved hint", retailer);

      const chosenImage =
        typeof data.selectedImage === "string" && data.selectedImage.startsWith("http")
          ? data.selectedImage
          : typeof data.image === "string" && data.image.startsWith("http")
          ? data.image
          : "";

      const preview = {
        title: shortTitle,
        retailer,
        priceLabel: formatPriceLabel(numericPrice, data.priceText),
        numericPrice,
        priceBand: getPriceBand(numericPrice),
        image: chosenImage,
        fallbackGradient: buildFallbackGradient(hints.length),
        url: data.url || trimmed,
        size: getSizeFromPrice(numericPrice, allPrices),
      };

      setDraftPreview(preview);
      setDraftTitle(shortTitle);
      setDraftVisibility("shared");
    } catch (err) {
      setError(err.message || "Could not extract this link.");
      setDraftPreview(null);
    } finally {
      setIsFetchingPreview(false);
    }
  }

  async function handleAddHint() {
    if (!currentUser || !draftPreview) return;

    setIsAdding(true);
    setError("");

    try {
      const newHint = {
        id: crypto.randomUUID(),
        title: draftTitle.trim() || draftPreview.title || "Saved hint",
        retailer: draftPreview.retailer,
        priceLabel: draftPreview.priceLabel,
        numericPrice: draftPreview.numericPrice,
        priceBand: draftPreview.priceBand,
        image: draftPreview.image,
        fallbackGradient: draftPreview.fallbackGradient,
        tags: ["Added from link"],
        starred: false,
        private: draftVisibility === "private",
        size: draftPreview.size,
        url: draftPreview.url,
        position: 0,
      };

      const supabase = createClient();

      const { data: insertedHint, error } = await supabase
        .from("hints")
        .insert({
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
          source: "user",
          size: newHint.size,
        })
        .select("id")
        .single();

      if (error) {
        throw new Error(error.message || "Could not save this hint.");
      }

      newHint.id = insertedHint.id;

      const updatedHints = [newHint, ...hints].map((hint, index) => ({
        ...hint,
        position: index,
      }));

      setHints(updatedHints);
      setLink("");
      resetComposer();
      persistHintOrder(updatedHints);
    } catch (err) {
      setError(err.message || "Could not save this hint.");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = hints.findIndex((hint) => hint.id === active.id);
    const newIndex = hints.findIndex((hint) => hint.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(hints, oldIndex, newIndex).map((hint, index) => ({
      ...hint,
      position: index,
    }));

    setHints(reordered);
    persistHintOrder(reordered);
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
                    handleFetchPreview();
                  }
                }}
                placeholder="Paste any product, wishlist, or experience link"
                className="h-[72px] w-full rounded-full border border-[#eadcd3] bg-white px-8 text-[16px] text-slate-700 outline-none focus:border-[#f19a78]/60 focus:ring-4 focus:ring-[#f19a78]/10"
              />
              <button
                type="button"
                onClick={handleFetchPreview}
                disabled={isFetchingPreview || isLoading}
                className="inline-flex h-[72px] shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-8 text-sm font-semibold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-70 sm:min-w-[170px]"
              >
                {isFetchingPreview
                  ? "Fetching..."
                  : isLoading
                  ? "Loading..."
                  : "Preview"}
              </button>
            </div>

            {error ? (
              <p className="mt-3 text-sm font-medium text-[#c45c42]">{error}</p>
            ) : draftPreview ? null : (
              <p className="mt-3 text-sm text-slate-500">
                Pull the image, tweak the name, choose who sees it.
              </p>
            )}
          </div>

          {draftPreview ? (
            <ComposerPreview
              preview={draftPreview}
              titleDraft={draftTitle}
              setTitleDraft={setDraftTitle}
              visibility={draftVisibility}
              setVisibility={setDraftVisibility}
              isAdding={isAdding}
              onAdd={handleAddHint}
              onClear={resetComposer}
            />
          ) : null}
        </section>

        <section className="mt-12">
          <div className="relative rounded-[36px] border border-[#efdfd6] bg-[#fffdfb] p-3 sm:p-5">
            <div
              className="pointer-events-none absolute inset-0 rounded-[36px] opacity-80"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(214, 195, 184, 0.32) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(214, 195, 184, 0.32) 1px, transparent 1px)
                `,
                backgroundSize: "108px 108px",
                backgroundPosition: "center center",
              }}
            />

            {isLoading ? (
              <div className="grid auto-rows-[54px] grid-cols-1 gap-7 md:grid-cols-12">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`relative flex h-full min-h-[360px] flex-col overflow-hidden rounded-[30px] border border-[#efdfd6] bg-[#f9f8f5] md:col-span-4 ${
                      i === 1
                        ? "md:row-span-10"
                        : i === 2
                        ? "md:row-span-8"
                        : "md:row-span-7"
                    }`}
                  >
                    <div className="relative flex-1 overflow-hidden">
                      <div className="skeleton h-full w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={(event) => setActiveId(event.active.id)}
                onDragEnd={handleDragEnd}
                onDragCancel={() => setActiveId(null)}
              >
                <SortableContext
                  items={visibleHints.map((hint) => hint.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="relative grid auto-rows-[54px] grid-cols-1 gap-7 md:grid-cols-12">
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

                <DragOverlay>
                  {activeHint ? (
                    <div className="w-full max-w-[420px]">
                      <HintCard
                        hint={activeHint}
                        isDragging
                        onEdit={() => {}}
                        onToggleStarred={() => {}}
                        onTogglePrivate={() => {}}
                      />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
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
