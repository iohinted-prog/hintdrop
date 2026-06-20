"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  MeasuringStrategy,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  defaultAnimateLayoutChanges,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "../../lib/supabase/client";
import AvatarMenu from "../components/AvatarMenu";

const ACTIVE_CURRENCY = "GBP";
const LOCAL_PREVIEW_TIMEOUT_MS = 5000;
const REMOTE_PREVIEW_TIMEOUT_MS = 6500;

const PREVIEW_STAGE = {
  IDLE: "idle",
  LOCAL: "local",
  REMOTE: "remote",
  MANUAL: "manual",
};

const EMPTY_NEW_HINT_FORM = {
  title: "",
  url: "",
  retailer: "",
  image: "",
  uploadedImage: null,
  priceInput: "",
  private: false,
  starred: false,
  needsReview: false,
  source: "preview",
};

const EMPTY_EDIT_FORM = {
  title: "",
  url: "",
  retailer: "",
  image: "",
  uploadedImage: null,
  priceInput: "",
};

const demoHints = [
  {
    id: "demo-1",
    title: "Weekend cabin",
    retailer: "airbnb.co.uk",
    priceLabel: "From £320",
    numericPrice: 320,
    image:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    fallbackGradient: "from-[#d9dfcf] via-[#b9c7aa] to-[#90a27e]",
    starred: true,
    private: false,
    size: "medium",
    url: "https://www.airbnb.co.uk/",
    position: 0,
    needsReview: false,
  },
  {
    id: "demo-2",
    title: "Sony headphones",
    retailer: "amazon.co.uk",
    priceLabel: "About £249",
    numericPrice: 249,
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80",
    fallbackGradient: "from-[#ead8ca] via-[#dbc0a8] to-[#c4a17f]",
    starred: false,
    private: false,
    size: "medium",
    url: "https://www.amazon.co.uk/",
    position: 1,
    needsReview: false,
  },
  {
    id: "demo-3",
    title: "Silk pillowcases",
    retailer: "johnlewis.com",
    priceLabel: "About £45",
    numericPrice: 45,
    image:
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
    fallbackGradient: "from-[#efe5de] via-[#e5d2c8] to-[#d1b2a4]",
    starred: false,
    private: true,
    size: "small",
    url: "https://www.johnlewis.com/",
    position: 2,
    needsReview: false,
  },
  {
    id: "demo-4",
    title: "Hotel voucher",
    retailer: "booking.com",
    priceLabel: "From £1290",
    numericPrice: 1290,
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    fallbackGradient: "from-[#d5dbee] via-[#b3c0df] to-[#8f9fc9]",
    starred: true,
    private: false,
    size: "large",
    url: "https://www.booking.com/",
    position: 3,
    needsReview: false,
  },
];

function LogoMark() {
  return (
    <div className="relative flex h-11 w-11 items-center justify-center rounded-[16px] border border-[#efc4b2] bg-gradient-to-b from-[#ffa47f] to-[#ff875d] text-white shadow-lg">
      <span className="text-lg">🎁</span>
    </div>
  );
}

function errorToMessage(value) {
  if (!value) return "Something went wrong.";
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message || "Something went wrong.";

  if (typeof value === "object") {
    if (typeof value.message === "string" && value.message.trim()) return value.message;
    if (typeof value.error === "string" && value.error.trim()) return value.error;
    try {
      return JSON.stringify(value);
    } catch {
      return "Something went wrong.";
    }
  }

  return String(value);
}

function normaliseRetailer(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Saved link";
  }
}

function isValidHttpUrl(value = "") {
  try {
    const withProtocol =
      value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;
    const parsed = new URL(withProtocol);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function normaliseInputUrl(value = "") {
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  return trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? trimmed
    : `https://${trimmed}`;
}

function detectCurrency(raw = "") {
  const text = String(raw || "").trim();
  if (!text) return null;
  if (text.includes("£")) return "GBP";
  if (text.includes("$") && !text.includes("A$") && !text.includes("C$") && !text.includes("NZ$")) return "USD";
  if (text.includes("€")) return "EUR";
  if (/\bR\s?\d/i.test(text) || /\bZAR\b/i.test(text)) return "ZAR";
  return null;
}

function extractNumericPrice(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (!value || typeof value !== "string") return null;

  const cleaned = value.replace(/,/g, "");
  const match =
    cleaned.match(/(?:£|\$|€)\s?(\d+(?:\.\d{1,2})?)/) ||
    cleaned.match(/\bR\s?(\d+(?:\.\d{1,2})?)/i) ||
    cleaned.match(/(\d+(?:\.\d{1,2})?)/);

  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function getSizeFromPrice(price) {
  if (price == null || price <= 100) return "small";
  if (price <= 1000) return "medium";
  return "large";
}

function getAspectRatio(size) {
  if (size === "large") return "1 / 1.7";
  if (size === "medium") return "1 / 1.35";
  return "1 / 1";
}

function formatPriceLabel(price, rawPrice, currency = ACTIVE_CURRENCY) {
  if (currency !== ACTIVE_CURRENCY) return "Price unavailable";
  if (rawPrice && typeof rawPrice === "string" && detectCurrency(rawPrice) === ACTIVE_CURRENCY) {
    return rawPrice;
  }
  if (price == null) return "Price unavailable";
  if (currency === "GBP") return `About £${Math.round(price)}`;
  return `About ${Math.round(price)}`;
}

function sanitisePrice(rawPrice, numericPrice) {
  const detectedCurrency = detectCurrency(rawPrice) || ACTIVE_CURRENCY;
  if (detectedCurrency !== ACTIVE_CURRENCY) {
    return { numericPrice: null, priceLabel: "Price unavailable" };
  }
  return {
    numericPrice,
    priceLabel: formatPriceLabel(numericPrice, rawPrice, ACTIVE_CURRENCY),
  };
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

  if (!words.length) return "Saved hint";
  const result = words.slice(0, 2).join(" ").trim();
  return result.charAt(0).toUpperCase() + result.slice(1);
}

function splitIntoColumns(items, columnCount = 3) {
  const columns = Array.from({ length: columnCount }, () => []);
  items.forEach((item, index) => {
    columns[index % columnCount].push(item);
  });
  return columns;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });
}

function buildDraftFromPreview(data, rawUrl) {
  const extractedNumericPrice =
    typeof data?.numericPrice === "number" ? data.numericPrice : extractNumericPrice(data?.priceText);
  const priceMeta = sanitisePrice(data?.priceText, extractedNumericPrice);
  const retailer = data?.siteName || normaliseRetailer(rawUrl);
  const title = shortenTitle(data?.title || "Saved hint", retailer);
  const image = typeof data?.image === "string" && data.image.startsWith("http") ? data.image : "";
  const finalUrl = data?.url || normaliseInputUrl(rawUrl);
  const needsReview = Boolean(data?.needsReview) || !image || !title || !priceMeta.numericPrice;

  return {
    title,
    retailer,
    image,
    uploadedImage: null,
    url: finalUrl,
    priceInput: priceMeta.numericPrice != null ? String(priceMeta.numericPrice) : "",
    priceLabel: priceMeta.priceLabel,
    numericPrice: priceMeta.numericPrice,
    starred: false,
    private: false,
    needsReview,
    source: data?.source || "preview",
  };
}

function buildManualDraft(rawUrl = "") {
  const finalUrl = normaliseInputUrl(rawUrl);

  return {
    ...EMPTY_NEW_HINT_FORM,
    title: "",
    retailer: normaliseRetailer(finalUrl),
    image: "",
    uploadedImage: null,
    url: finalUrl,
    priceInput: "",
    private: false,
    starred: false,
    needsReview: true,
    source: "manual",
  };
}

async function fetchPreview(url, { signal } = {}) {
  const response = await fetch("/api/link-preview", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ url, currency: ACTIVE_CURRENCY }),
    signal,
  });

  const raw = await response.text();
  let data = null;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    throw new Error(raw || "The preview service returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
        data?.message ||
        (typeof data === "string" ? data : "Could not fetch this link preview.")
    );
  }

  return data;
}

async function fetchPreviewWithTimeout(url, timeoutMs, controller) {
  let timeoutId = null;

  try {
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort();
        const err = new Error("Preview timed out.");
        err.code = "PREVIEW_TIMEOUT";
        reject(err);
      }, timeoutMs);
    });

    return await Promise.race([
      fetchPreview(url, { signal: controller.signal }),
      timeoutPromise,
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
}

function HintFormFields({
  form,
  setForm,
  prefix = "new",
  showReviewCopy = false,
  showToggles = true,
  imageHelpText = "No image yet. Upload one here if you want to add a photo.",
}) {
  const previewImage = form.uploadedImage || form.image;

  return (
    <div className="space-y-4">
      {showReviewCopy && form.needsReview ? (
        <div className="rounded-[22px] border border-[#f4cdbd] bg-[#fff6f1] p-4 text-sm text-[#9b553d]">
          We couldn’t fill everything automatically. You can still save this now, and image and price are optional.
        </div>
      ) : null}

      <div>
        <label htmlFor={`${prefix}-link`} className="mb-2 block text-sm font-medium text-slate-700">
          Link
        </label>
        <input
          id={`${prefix}-link`}
          type="url"
          value={form.url}
          onChange={(e) => setForm((current) => ({ ...current, url: e.target.value }))}
          className="h-14 w-full rounded-[18px] border border-[#eadcd3] bg-[#fcfaf8] px-5 text-[15px] text-slate-700 outline-none focus:ring-2 focus:ring-[#f19a78]/50"
        />
      </div>

      <div>
        <label htmlFor={`${prefix}-title`} className="mb-2 block text-sm font-medium text-slate-700">
          Name
        </label>
        <input
          id={`${prefix}-title`}
          type="text"
          value={form.title}
          onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
          placeholder="Give this hint a clear name"
          className="h-14 w-full rounded-[18px] border border-[#eadcd3] bg-[#fcfaf8] px-5 text-[15px] text-slate-700 outline-none focus:ring-2 focus:ring-[#f19a78]/50"
        />
      </div>

      <div>
        <label htmlFor={`${prefix}-price`} className="mb-2 block text-sm font-medium text-slate-700">
          Price (optional)
        </label>
        <input
          id={`${prefix}-price`}
          type="text"
          value={form.priceInput}
          onChange={(e) => setForm((current) => ({ ...current, priceInput: e.target.value }))}
          placeholder="Leave blank if you don’t want to add a price"
          className="h-14 w-full rounded-[18px] border border-[#eadcd3] bg-[#fcfaf8] px-5 text-[15px] text-slate-700 outline-none focus:ring-2 focus:ring-[#f19a78]/50"
        />
      </div>

      <div>
        <label htmlFor={`${prefix}-image`} className="mb-2 block text-sm font-medium text-slate-700">
          Photo (optional)
        </label>
        <input
          id={`${prefix}-image`}
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const imageUrl = await fileToDataUrl(file);
            setForm((current) => ({ ...current, uploadedImage: imageUrl }));
          }}
          className="block w-full rounded-[18px] border border-dashed border-[#eadcd3] bg-[#fcfaf8] px-4 py-4 text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-[#fff1e9] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#df7c59]"
        />

        {previewImage ? (
          <div className="mt-3 overflow-hidden rounded-[20px] border border-[#efe0d7] bg-[#faf6f3]">
            <img
              src={previewImage}
              alt={form.title || "Selected hint image"}
              className="h-40 w-full object-cover"
            />
          </div>
        ) : (
          <div className="mt-3 rounded-[20px] border border-dashed border-[#efe0d7] bg-[#faf6f3] px-4 py-8 text-center text-sm text-slate-500">
            {imageHelpText}
          </div>
        )}
      </div>

      {showToggles ? (
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setForm((current) => ({ ...current, starred: !current.starred }))}
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${
              form.starred
                ? "border-[#ffd8c9] bg-[#fff2ea] text-[#e27956]"
                : "border-[#efe0d7] bg-[#f7f2ee] text-slate-700 hover:bg-[#f1ebe6]"
            }`}
          >
            {form.starred ? "★ Starred" : "★ Star"}
          </button>

          <button
            type="button"
            onClick={() => setForm((current) => ({ ...current, private: !current.private }))}
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${
              form.private
                ? "border-[#ffd8c9] bg-[#fffaf7] text-[#e08a67]"
                : "border-[#efe0d7] bg-[#f7f2ee] text-slate-700 hover:bg-[#f1ebe6]"
            }`}
          >
            {form.private ? "🔒 Private" : "🔓 Public"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function AddHintModal({ isOpen, form, setForm, onClose, onSubmit, isSaving }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(33,24,20,0.42)] px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-[620px] rounded-[30px] border border-[#efdcd2] bg-white p-6 shadow-[0_28px_80px_rgba(75,45,30,0.18)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#e08a67]">
              New hint
            </p>
            <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.05em] text-slate-900">
              Review before saving
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#efe0d7] text-slate-500 hover:bg-[#faf6f3]"
            aria-label="Close add modal"
          >
            ✕
          </button>
        </div>

        <div className="mt-6">
          <HintFormFields
            form={form}
            setForm={setForm}
            prefix="new"
            showReviewCopy
            showToggles
            imageHelpText="No image yet. Upload one only if you want to add a photo now."
          />
        </div>

        <div className="mt-7 flex justify-end">
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSaving}
            className="inline-flex h-12 items-center justify-center rounded-full border border-[#ee8d69] bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-6 text-sm font-semibold text-white shadow-lg disabled:opacity-70"
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
  isRefreshing,
  isSaving,
  hint,
}) {
  if (!isOpen || !hint) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(33,24,20,0.42)] px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-[620px] rounded-[30px] border border-[#efdcd2] bg-white p-6 shadow-[0_28px_80px_rgba(75,45,30,0.18)] sm:p-7">
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
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#efe0d7] text-slate-500 hover:bg-[#faf6f3]"
            aria-label="Close edit modal"
          >
            ✕
          </button>
        </div>

        <div className="mt-6">
          <HintFormFields
            form={editForm}
            setForm={setEditForm}
            prefix="edit"
            showReviewCopy={false}
            showToggles={false}
            imageHelpText="No image yet. Add or replace a photo here if you want."
          />
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-12 items-center justify-center rounded-full border border-[#f1c9bb] bg-[#fff4ef] px-5 text-sm font-semibold text-[#d56949] hover:bg-[#ffe9df]"
          >
            Delete hint
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onRefreshFromLink}
              disabled={isRefreshing}
              className="inline-flex h-12 items-center justify-center rounded-full border border-[#efe0d7] bg-[#f7f2ee] px-5 text-sm font-semibold text-slate-700 hover:bg-[#f1ebe6] disabled:opacity-60"
            >
              {isRefreshing ? "Refreshing..." : "Refresh from link"}
            </button>

            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="inline-flex h-12 items-center justify-center rounded-full border border-[#ee8d69] bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-6 text-sm font-semibold text-white shadow-lg disabled:opacity-70"
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
  onEdit,
  onToggleStarred,
  onTogglePrivate,
  isDragging,
  dragHandleListeners,
  dragHandleAttributes,
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(hint.image) && !imageFailed;

  return (
    <article
      className={`group relative w-full overflow-hidden rounded-[30px] border border-[#efe1d8] bg-white transition-all duration-300 ${
        isDragging
          ? "scale-[1.02] shadow-[0_26px_70px_rgba(113,74,49,0.22)]"
          : "shadow-[0_10px_30px_rgba(176,118,86,0.10)] hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(176,118,86,0.14)]"
      }`}
      style={{ aspectRatio: getAspectRatio(hint.size) }}
    >
      <div className="absolute inset-0">
        {showImage ? (
          <>
            <img
              src={hint.image}
              alt={hint.title}
              className={`h-full w-full object-cover transition-transform duration-500 ${
                isDragging ? "scale-[1.02]" : "group-hover:scale-[1.03]"
              } ${hint.private ? "opacity-80" : ""}`}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImageFailed(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(22,18,16,0.82)] via-[rgba(22,18,16,0.20)] to-[rgba(255,255,255,0.02)]" />
          </>
        ) : (
          <>
            <div
              className={`absolute inset-0 bg-gradient-to-br ${hint.fallbackGradient} ${
                hint.private ? "opacity-80" : ""
              }`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(22,18,16,0.70)] via-[rgba(22,18,16,0.16)] to-transparent" />
          </>
        )}
      </div>

      <div className="absolute left-4 right-4 top-4 z-10 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="flex cursor-grab active:cursor-grabbing items-center gap-1 rounded-full border border-white/60 bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-700 backdrop-blur-sm"
            {...dragHandleAttributes}
            {...dragHandleListeners}
          >
            ⋮⋮ Drag
          </button>

          {hint.starred && (
            <div className="rounded-full border border-[#ffd8c9] bg-[#fff2ea] px-3 py-1 text-[11px] font-semibold text-[#e27956]">
              Top pick
            </div>
          )}

          {hint.private && (
            <div className="rounded-full border border-white/60 bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-700 backdrop-blur-sm">
              Private
            </div>
          )}

          {hint.needsReview && (
            <div className="rounded-full border border-[#f6d2c2] bg-[#fff6f1] px-3 py-1 text-[11px] font-semibold text-[#c46545]">
              Needs review
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(hint)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/78 text-[15px] text-slate-500 backdrop-blur-sm hover:text-slate-800"
            aria-label="Edit hint"
          >
            ✎
          </button>

          <button
            onClick={() => onToggleStarred(hint)}
            className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/78 text-[16px] backdrop-blur-sm ${
              hint.starred ? "text-[#f36f64]" : "text-slate-400 hover:text-[#f36f64]"
            }`}
            aria-label={hint.starred ? "Unhighlight hint" : "Highlight hint"}
            type="button"
          >
            ★
          </button>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
              hint.size === "large"
                ? "border-[#445541] bg-[#2f3b2d] text-white"
                : hint.size === "medium"
                  ? "border-[#ffd8c9] bg-[#fff1e9] text-[#df7c59]"
                  : "border-[#d7e4ce] bg-[#f1f5ec] text-[#627f53]"
            }`}
          >
            {hint.priceLabel}
          </span>
        </div>

        <h2
          className="mt-3 overflow-hidden text-[22px] font-semibold tracking-[-0.05em] text-white"
          style={{
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            lineClamp: 2,
          }}
        >
          {hint.title}
        </h2>

        <p className="mt-1 truncate text-[13px] text-white/78">{hint.retailer}</p>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onTogglePrivate(hint)}
            className="rounded-full border border-white/60 bg-white/85 px-3 py-1.5 text-[12px] font-medium text-slate-700 backdrop-blur-sm hover:bg-white"
          >
            {hint.private ? "🔒 Private" : "🔓 Public"}
          </button>

          <a
            href={hint.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-white/60 bg-white/85 px-3 py-1.5 text-[12px] font-medium text-slate-700 backdrop-blur-sm hover:bg-white"
          >
            Open
          </a>
        </div>
      </div>
    </article>
  );
}

function SortableHintCard({ hint, onEdit, onToggleStarred, onTogglePrivate }) {
  const animateLayoutChanges = (args) => {
    if (args.isSorting || args.wasDragging) return defaultAnimateLayoutChanges(args);
    return true;
  };

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: hint.id,
    animateLayoutChanges,
    transition: {
      duration: 240,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 1,
    position: "relative",
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-6 break-inside-avoid">
      <HintCard
        hint={hint}
        onEdit={onEdit}
        onToggleStarred={onToggleStarred}
        onTogglePrivate={onTogglePrivate}
        isDragging={isDragging}
        dragHandleAttributes={attributes}
        dragHandleListeners={listeners}
      />
    </div>
  );
}

export default function HintsClient() {
  const [hints, setHints] = useState([]);
  const [link, setLink] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");
  const [editingHintId, setEditingHintId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [isRefreshingEdit, setIsRefreshingEdit] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmittingNewHint, setIsSubmittingNewHint] = useState(false);
  const [pendingHint, setPendingHint] = useState(null);
  const [newHintForm, setNewHintForm] = useState(EMPTY_NEW_HINT_FORM);

  const [previewStage, setPreviewStage] = useState(PREVIEW_STAGE.IDLE);
  const [previewMessage, setPreviewMessage] = useState("");

  const localPreviewControllerRef = useRef(null);
  const remotePreviewControllerRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const measuring = {
    droppable: { strategy: MeasuringStrategy.Always },
  };

  useEffect(() => {
    const supabase = createClient();

    async function loadSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user || null);
    }

    loadSession();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setHints([]);
      setIsLoading(false);
      return;
    }

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
        setError(errorToMessage(error));
        setHints([]);
        setIsLoading(false);
        return;
      }

      setHints(
        (data || []).map((row, index) => ({
          id: row.id,
          title: row.title || "Saved hint",
          retailer: row.retailer || normaliseRetailer(row.url || ""),
          priceLabel: row.price_text || formatPriceLabel(row.numeric_price, null, ACTIVE_CURRENCY),
          numericPrice: row.numeric_price,
          image: row.image_url || "",
          fallbackGradient: buildFallbackGradient(index),
          starred: Boolean(row.starred),
          private: Boolean(row.is_private),
          size: getSizeFromPrice(row.numeric_price),
          url: row.url || "",
          position: row.position ?? index,
          needsReview: false,
        }))
      );

      setIsLoading(false);
    }

    loadHints();
  }, [currentUser]);

  useEffect(() => {
    return () => {
      localPreviewControllerRef.current?.abort?.();
      remotePreviewControllerRef.current?.abort?.();
    };
  }, []);

  const visibleHints = hints.length > 0 ? hints : demoHints;
  const activeHint = visibleHints.find((hint) => hint.id === activeId) || null;
  const columns = useMemo(() => splitIntoColumns(visibleHints, 3), [visibleHints]);

  async function persistOrder(nextHints) {
    if (!currentUser) return;
    const supabase = createClient();
    await Promise.all(
      nextHints.map((hint, index) => supabase.from("hints").update({ position: index }).eq("id", hint.id))
    );
  }

  function rebuildFromColumns(nextColumns) {
    return nextColumns.flat().map((hint, index) => ({ ...hint, position: index }));
  }

  function openEditModal(hint) {
    setEditingHintId(hint.id);
    setEditForm({
      title: hint.title || "",
      url: hint.url || "",
      retailer: hint.retailer || "",
      image: hint.image || "",
      uploadedImage: null,
      priceInput: hint.numericPrice != null ? String(hint.numericPrice) : "",
    });
  }

  function closeEditModal() {
    setEditingHintId(null);
    setEditForm(EMPTY_EDIT_FORM);
    setIsRefreshingEdit(false);
    setIsSavingEdit(false);
    setPreviewStage(PREVIEW_STAGE.IDLE);
    setPreviewMessage("");
  }

  function closeAddModal() {
    setIsAddModalOpen(false);
    setPendingHint(null);
    setIsSubmittingNewHint(false);
    setNewHintForm(EMPTY_NEW_HINT_FORM);
    setPreviewStage(PREVIEW_STAGE.IDLE);
    setPreviewMessage("");
  }

  async function runStagedPreview(rawUrl) {
    const url = normaliseInputUrl(rawUrl);

    localPreviewControllerRef.current?.abort?.();
    remotePreviewControllerRef.current?.abort?.();

    const localController = new AbortController();
    const remoteController = new AbortController();

    localPreviewControllerRef.current = localController;
    remotePreviewControllerRef.current = remoteController;

    setPreviewStage(PREVIEW_STAGE.LOCAL);
    setPreviewMessage("Looking for title, image, and price from the page itself...");

    try {
      const localData = await fetchPreviewWithTimeout(
        url,
        LOCAL_PREVIEW_TIMEOUT_MS,
        localController
      );

      setPreviewStage(PREVIEW_STAGE.IDLE);
      setPreviewMessage("");
      return localData;
    } catch (localError) {
      setPreviewStage(PREVIEW_STAGE.REMOTE);
      setPreviewMessage("This is taking a little longer than expected. Trying a deeper fetch now...");

      try {
        const remoteData = await fetchPreviewWithTimeout(
          url,
          REMOTE_PREVIEW_TIMEOUT_MS,
          remoteController
        );

        setPreviewStage(PREVIEW_STAGE.IDLE);
        setPreviewMessage("");
        return remoteData;
      } catch {
        setPreviewStage(PREVIEW_STAGE.MANUAL);
        setPreviewMessage("");
        throw localError;
      }
    }
  }

  async function saveEditChanges() {
    if (!currentUser || editingHintId == null) return;

    const trimmedTitle = editForm.title.trim() || "Saved hint";
    const trimmedUrl = editForm.url.trim();
    const trimmedRetailer = editForm.retailer?.trim() || normaliseRetailer(trimmedUrl);
    const parsedNumericPrice = extractNumericPrice(editForm.priceInput);
    const priceMeta = sanitisePrice(editForm.priceInput, parsedNumericPrice);
    const finalImage = editForm.uploadedImage || editForm.image || "";

    setIsSavingEdit(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("hints")
      .update({
        title: trimmedTitle,
        url: trimmedUrl,
        retailer: trimmedRetailer,
        image_url: finalImage,
        price_text: priceMeta.priceLabel,
        numeric_price: priceMeta.numericPrice,
        size: getSizeFromPrice(priceMeta.numericPrice),
      })
      .eq("id", editingHintId);

    if (error) {
      setError(errorToMessage(error));
      setIsSavingEdit(false);
      return;
    }

    setHints((current) =>
      current.map((hint) =>
        hint.id === editingHintId
          ? {
              ...hint,
              title: trimmedTitle,
              url: trimmedUrl || hint.url,
              retailer: trimmedRetailer,
              image: finalImage,
              priceLabel: priceMeta.priceLabel,
              numericPrice: priceMeta.numericPrice,
              size: getSizeFromPrice(priceMeta.numericPrice),
              needsReview: false,
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
      setError(errorToMessage(error));
      return;
    }
    setHints((current) => current.filter((hint) => hint.id !== editingHintId));
    closeEditModal();
  }

  async function toggleStarred(hint) {
    if (!currentUser) return;
    const supabase = createClient();
    const newStarred = !hint.starred;

    setHints((current) => current.map((h) => (h.id === hint.id ? { ...h, starred: newStarred } : h)));

    const { error } = await supabase.from("hints").update({ starred: newStarred }).eq("id", hint.id);
    if (error) {
      setHints((current) => current.map((h) => (h.id === hint.id ? { ...h, starred: hint.starred } : h)));
      setError(errorToMessage(error));
    }
  }

  async function togglePrivate(hint) {
    if (!currentUser) return;
    const supabase = createClient();
    const newPrivate = !hint.private;

    setHints((current) => current.map((h) => (h.id === hint.id ? { ...h, private: newPrivate } : h)));

    const { error } = await supabase.from("hints").update({ is_private: newPrivate }).eq("id", hint.id);
    if (error) {
      setHints((current) => current.map((h) => (h.id === hint.id ? { ...h, private: hint.private } : h)));
      setError(errorToMessage(error));
    }
  }

  async function refreshHintFromLink() {
    const trimmed = editForm.url.trim();
    if (!trimmed || editingHintId == null) return;

    if (!isValidHttpUrl(trimmed)) {
      setError("Please enter a valid URL.");
      return;
    }

    setIsRefreshingEdit(true);
    setError("");

    try {
      const data = await runStagedPreview(trimmed);
      const draft = buildDraftFromPreview(data, trimmed);

      setHints((current) =>
        current.map((hint) =>
          hint.id === editingHintId
            ? {
                ...hint,
                title: draft.title,
                retailer: draft.retailer,
                priceLabel: draft.priceLabel,
                numericPrice: draft.numericPrice,
                size: getSizeFromPrice(draft.numericPrice),
                image: draft.image || hint.image,
                url: draft.url,
                needsReview: draft.needsReview,
              }
            : hint
        )
      );

      setEditForm((current) => ({
        ...current,
        title: draft.title,
        url: draft.url,
        retailer: draft.retailer,
        image: draft.image || current.image,
        priceInput: draft.priceInput,
      }));
    } catch {
      setError("We tried, but couldn’t refresh this right now. You can update the details manually here.");
    } finally {
      setIsRefreshingEdit(false);
      setPreviewStage(PREVIEW_STAGE.IDLE);
      setPreviewMessage("");
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

    if (!isValidHttpUrl(trimmed)) {
      setError("Please paste a valid product or experience URL.");
      return;
    }

    setIsAdding(true);
    setError("");

    try {
      const data = await runStagedPreview(trimmed);
      const draft = buildDraftFromPreview(data, trimmed);

      setPendingHint(draft);
      setNewHintForm({ ...EMPTY_NEW_HINT_FORM, ...draft });
      setIsAddModalOpen(true);
      setLink("");
    } catch {
      const manualDraft = buildManualDraft(trimmed);
      setPendingHint(manualDraft);
      setNewHintForm(manualDraft);
      setIsAddModalOpen(true);
      setError("We tried, but we couldn’t fetch the info you need right now. You can enter it manually here.");
    } finally {
      setIsAdding(false);
      setPreviewStage(PREVIEW_STAGE.IDLE);
      setPreviewMessage("");
    }
  }

  async function submitNewHint() {
    if (!currentUser || !pendingHint) return;

    setIsSubmittingNewHint(true);
    setError("");

    try {
      const title = newHintForm.title.trim() || pendingHint.title || "Saved hint";
      const url = newHintForm.url.trim() || pendingHint.url;
      const retailer = newHintForm.retailer?.trim() || normaliseRetailer(url);
      const numericPrice = extractNumericPrice(newHintForm.priceInput);
      const priceMeta = sanitisePrice(newHintForm.priceInput, numericPrice);
      const size = getSizeFromPrice(priceMeta.numericPrice);
      const image = newHintForm.uploadedImage || newHintForm.image || "";

      const newHint = {
        id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `hint-${Date.now()}`,
        title,
        retailer,
        priceLabel: priceMeta.priceLabel,
        numericPrice: priceMeta.numericPrice,
        image,
        fallbackGradient: buildFallbackGradient(hints.length),
        starred: Boolean(newHintForm.starred),
        private: Boolean(newHintForm.private),
        size,
        url,
        position: 0,
        needsReview: false,
      };

      const supabase = createClient();
      const { error } = await supabase.from("hints").insert({
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
        source: newHintForm.source || "user",
      });

      if (error) throw new Error(errorToMessage(error));

      setHints((current) => [newHint, ...current].map((item, index) => ({ ...item, position: index })));
      closeAddModal();
    } catch (err) {
      setError(errorToMessage(err));
      setIsSubmittingNewHint(false);
    }
  }

  function handleDragStart(event) {
    setActiveId(event.active.id);
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id || hints.length === 0) return;

    const nextColumns = splitIntoColumns(hints, 3);
    const fromColumnIndex = nextColumns.findIndex((col) => col.some((item) => item.id === active.id));
    const toColumnIndex = nextColumns.findIndex((col) => col.some((item) => item.id === over.id));
    if (fromColumnIndex === -1 || toColumnIndex === -1) return;

    const fromItems = [...nextColumns[fromColumnIndex]];
    const toItems = fromColumnIndex === toColumnIndex ? fromItems : [...nextColumns[toColumnIndex]];
    const oldIndex = fromItems.findIndex((item) => item.id === active.id);
    const newIndex = toItems.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    if (fromColumnIndex === toColumnIndex) {
      nextColumns[fromColumnIndex] = arrayMove(fromItems, oldIndex, newIndex);
    } else {
      const [moved] = fromItems.splice(oldIndex, 1);
      toItems.splice(newIndex, 0, moved);
      nextColumns[fromColumnIndex] = fromItems;
      nextColumns[toColumnIndex] = toItems;
    }

    const nextHints = rebuildFromColumns(nextColumns);
    setHints(nextHints);
    await persistOrder(nextHints);
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  const editingHint = visibleHints.find((hint) => hint.id === editingHintId) || null;

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
              <Link href="/feed" className="inline-flex h-11 items-center justify-center rounded-full border border-[#efe0d7] bg-white px-4 text-[14px] font-semibold text-slate-700 hover:bg-[#fff5f0] sm:px-5">Feed</Link>
              <Link href="/hints" className="inline-flex h-11 items-center justify-center rounded-full border border-[#3c4d39] bg-[#2f3b2d] px-4 text-[14px] font-semibold text-white sm:px-5">Hints</Link>
              <Link href="/circles" className="inline-flex h-11 items-center justify-center rounded-full border border-[#efe0d7] bg-white px-4 text-[14px] font-semibold text-slate-700 hover:bg-[#fff5f0] sm:px-5">Circles</Link>
              <Link href="/shop" className="inline-flex h-11 items-center justify-center rounded-full border border-[#efe0d7] bg-white px-4 text-[14px] font-semibold text-slate-700 hover:bg-[#fff5f0] sm:px-5">Shop</Link>
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
                placeholder="Paste a link here..."
                className="h-[72px] w-full rounded-full border border-[#eadcd3] bg-white px-8 text-[16px] text-slate-700 outline-none focus:ring-2 focus:ring-[#f19a78]/50"
              />
              <button
                type="button"
                onClick={handleAddHint}
                disabled={isAdding || isLoading}
                className="inline-flex h-[72px] shrink-0 items-center justify-center rounded-full border border-[#ee8d69] bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-8 text-sm font-semibold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-70 sm:min-w-[170px]"
              >
                {isAdding
                  ? previewStage === PREVIEW_STAGE.REMOTE
                    ? "Trying harder..."
                    : "Checking..."
                  : isLoading
                    ? "Loading..."
                    : "Add hint"}
              </button>
            </div>

            {error ? (
              <p className="mt-3 text-sm font-medium text-[#c45c42]">{error}</p>
            ) : previewStage === PREVIEW_STAGE.LOCAL ? (
              <p className="mt-3 text-sm font-medium text-slate-500">{previewMessage}</p>
            ) : previewStage === PREVIEW_STAGE.REMOTE ? (
              <p className="mt-3 text-sm font-medium text-[#c4704d]">{previewMessage}</p>
            ) : (
              <div className="mt-3 space-y-1 text-sm text-slate-500">
                <p>We’ll try the page first, then a deeper fetch only if needed.</p>
                <p>If it still can’t load, you can enter the details manually and save anyway.</p>
              </div>
            )}
          </div>
        </section>

        <section className="mt-12">
          <div className="relative rounded-[36px] border border-[#efe0d7] bg-[#fffdfb] p-3 sm:p-5 shadow-[0_12px_32px_rgba(176,118,86,0.08)]">
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
              <div className="columns-1 gap-6 md:columns-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="mb-6 break-inside-avoid">
                    <div
                      className="w-full overflow-hidden rounded-[30px] border border-[#efe1d8] bg-[#f9f8f5]"
                      style={{ aspectRatio: i === 1 ? "1 / 1.35" : "1 / 1" }}
                    >
                      <div className="skeleton h-full w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : hints.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                measuring={measuring}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {columns.map((columnHints, columnIndex) => (
                    <SortableContext
                      key={`column-${columnIndex}`}
                      items={columnHints.map((hint) => hint.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-0">
                        {columnHints.map((hint) => (
                          <SortableHintCard
                            key={hint.id}
                            hint={hint}
                            onEdit={openEditModal}
                            onToggleStarred={toggleStarred}
                            onTogglePrivate={togglePrivate}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  ))}
                </div>

                <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.25, 1, 0.5, 1)" }}>
                  {activeHint ? (
                    <div className="w-full max-w-[420px]">
                      <HintCard
                        hint={activeHint}
                        onEdit={() => {}}
                        onToggleStarred={() => {}}
                        onTogglePrivate={() => {}}
                        isDragging
                      />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            ) : (
              <div className="columns-1 gap-6 md:columns-3">
                {demoHints.map((hint) => (
                  <div key={hint.id} className="mb-6 break-inside-avoid">
                    <HintCard hint={hint} onEdit={() => {}} onToggleStarred={() => {}} onTogglePrivate={() => {}} isDragging={false} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <AddHintModal
        isOpen={isAddModalOpen}
        form={newHintForm}
        setForm={setNewHintForm}
        onClose={closeAddModal}
        onSubmit={submitNewHint}
        isSaving={isSubmittingNewHint}
      />

      <EditHintModal
        isOpen={editingHintId !== null}
        editForm={editForm}
        setEditForm={setEditForm}
        onClose={closeEditModal}
        onSave={saveEditChanges}
        onRefreshFromLink={refreshHintFromLink}
        onDelete={deleteHint}
        isRefreshing={isRefreshingEdit}
        isSaving={isSavingEdit}
        hint={editingHint}
      />
    </main>
  );
}
