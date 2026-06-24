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
  useDroppable,
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
import { useCurrencyFormatter } from "../../lib/useCurrencyFormatter";
import AvatarMenu from "../components/AvatarMenu";

const BASE_CURRENCY = "GBP";
const PREVIEW_TIMEOUT_MS = 18000;
const CARD_MAX_HEIGHT = "min(620px, 74vh)";
const TIMEOUT_MODAL_MESSAGE =
  "We tried to get the title, image, and price, but this shop asked you to add them instead.";

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
    numericPrice: 320,
    currency: "GBP",
    image:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    fallbackGradient: "from-[#d9dfcf] via-[#b9c7aa] to-[#90a27e]",
    starred: true,
    private: false,
    url: "https://www.airbnb.co.uk/",
    position: 0,
    needsReview: false,
    demoRatio: 0.74,
  },
  {
    id: "demo-2",
    title: "Sony headphones",
    retailer: "amazon.co.uk",
    numericPrice: 249,
    currency: "GBP",
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80",
    fallbackGradient: "from-[#ead8ca] via-[#dbc0a8] to-[#c4a17f]",
    starred: false,
    private: false,
    url: "https://www.amazon.co.uk/",
    position: 1,
    needsReview: false,
    demoRatio: 1.2,
  },
  {
    id: "demo-3",
    title: "Silk pillowcases",
    retailer: "johnlewis.com",
    numericPrice: 45,
    currency: "GBP",
    image:
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
    fallbackGradient: "from-[#efe5de] via-[#e5d2c8] to-[#d1b2a4]",
    starred: false,
    private: true,
    url: "https://www.johnlewis.com/",
    position: 2,
    needsReview: false,
    demoRatio: 0.9,
  },
  {
    id: "demo-4",
    title: "Hotel voucher",
    retailer: "booking.com",
    numericPrice: 1290,
    currency: "GBP",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    fallbackGradient: "from-[#d5dbee] via-[#b3c0df] to-[#8f9fc9]",
    starred: true,
    private: false,
    url: "https://www.booking.com/",
    position: 3,
    needsReview: false,
    demoRatio: 0.68,
  },
  {
    id: "demo-5",
    title: "Espresso machine",
    retailer: "sageappliances.com",
    numericPrice: 399,
    currency: "GBP",
    image:
      "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=1200&q=80",
    fallbackGradient: "from-[#d6e7eb] via-[#b5ced7] to-[#8fb3c5]",
    starred: false,
    private: false,
    url: "https://www.sageappliances.com/",
    position: 4,
    needsReview: false,
    demoRatio: 1.26,
  },
  {
    id: "demo-6",
    title: "Spa day",
    retailer: "spabreaks.com",
    numericPrice: 180,
    currency: "GBP",
    image:
      "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80",
    fallbackGradient: "from-[#f3d5cc] via-[#e9b39f] to-[#d98c76]",
    starred: true,
    private: false,
    url: "https://www.spabreaks.com/",
    position: 5,
    needsReview: false,
    demoRatio: 0.82,
  },
  {
    id: "demo-7",
    title: "Cashmere throw",
    retailer: "thewhitecompany.com",
    numericPrice: 110,
    currency: "GBP",
    image:
      "https://images.unsplash.com/photo-1517705008128-361805f42e86?auto=format&fit=crop&w=1200&q=80",
    fallbackGradient: "from-[#eadce8] via-[#d8bfd1] to-[#bb9ab6]",
    starred: false,
    private: false,
    url: "https://www.thewhitecompany.com/",
    position: 6,
    needsReview: false,
    demoRatio: 0.94,
  },
  {
    id: "demo-8",
    title: "City break",
    retailer: "eurostar.com",
    numericPrice: 210,
    currency: "GBP",
    image:
      "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
    fallbackGradient: "from-[#d5dbee] via-[#b3c0df] to-[#8f9fc9]",
    starred: false,
    private: false,
    url: "https://www.eurostar.com/",
    position: 7,
    needsReview: false,
    demoRatio: 0.72,
  },
  {
    id: "demo-9",
    title: "Gold hoops",
    retailer: "missoma.com",
    numericPrice: 89,
    currency: "GBP",
    image:
      "https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=1200&q=80",
    fallbackGradient: "from-[#ead8ca] via-[#dbc0a8] to-[#c4a17f]",
    starred: false,
    private: false,
    url: "https://www.missoma.com/",
    position: 8,
    needsReview: false,
    demoRatio: 1.1,
  },
];

const COLUMN_IDS = ["column-0", "column-1", "column-2"];

function LogoMark() {
  return (
    <div className="relative flex h-11 w-11 items-center justify-center rounded-[16px] border border-[#efc4b2] bg-gradient-to-b from-[#ffa47f] to-[#ff875d] text-white shadow-lg">
      <span className="text-lg">🎁</span>
    </div>
  );
}

function BusyOverlay({ open, title, message }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(33,24,20,0.32)] px-4 backdrop-blur-sm">
      <div className="w-full max-w-[420px] rounded-[28px] border border-[#efdcd2] bg-white px-6 py-6 shadow-[0_28px_80px_rgba(75,45,30,0.18)]">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff1e9]">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#f1c4b2] border-t-[#f36f64]" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-slate-900">{title}</p>
            <p className="mt-1 text-sm text-slate-500">{message}</p>
          </div>
        </div>
      </div>
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
  if (text.includes("$") && !text.includes("A$") && !text.includes("C$") && !text.includes("NZ$"))
    return "USD";
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

function sanitisePrice(rawPrice, numericPrice) {
  const detectedCurrency = detectCurrency(rawPrice) || BASE_CURRENCY;

  return {
    numericPrice: typeof numericPrice === "number" && Number.isFinite(numericPrice) ? numericPrice : null,
    originalCurrency: detectedCurrency,
    rawPrice: rawPrice || "",
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

function flattenColumns(columns) {
  return columns.flat().map((hint, index) => ({ ...hint, position: index }));
}

function buildColumnMap(items) {
  const split = splitIntoColumns(items, 3);
  return {
    "column-0": split[0],
    "column-1": split[1],
    "column-2": split[2],
  };
}

function flattenColumnMap(columnMap) {
  return flattenColumns(COLUMN_IDS.map((id) => columnMap[id] || []));
}

function findContainerForId(columnMap, id) {
  if (!id) return null;
  if (COLUMN_IDS.includes(id)) return id;

  for (const columnId of COLUMN_IDS) {
    if ((columnMap[columnId] || []).some((item) => item.id === id)) {
      return columnId;
    }
  }

  return null;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });
}

function loadImageAspectRatio(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        resolve(img.naturalWidth / img.naturalHeight);
      } else {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function fallbackCardRatio(hint) {
  if (hint?.demoRatio && Number.isFinite(hint.demoRatio)) return hint.demoRatio;
  if (hint?.image) return 0.82;
  return 1;
}

function getCardAspectRatio(hint, imageRatios) {
  const imageRatio = imageRatios[hint.id];
  if (imageRatio && Number.isFinite(imageRatio)) {
    return imageRatio;
  }
  return fallbackCardRatio(hint);
}

function buildDraftFromPreview(data, rawUrl) {
  const extractedNumericPrice =
    typeof data?.numericPrice === "number" ? data.numericPrice : extractNumericPrice(data?.priceText);
  const priceMeta = sanitisePrice(data?.priceText, extractedNumericPrice);
  const retailer = data?.siteName || normaliseRetailer(rawUrl);
  const title = shortenTitle(data?.title || "Saved hint", retailer);
  const image = typeof data?.image === "string" && data.image.startsWith("http") ? data.image : "";
  const finalUrl = data?.url || normaliseInputUrl(rawUrl);
  const needsReview = Boolean(data?.needsReview) || !image || !title;

  return {
    title,
    retailer,
    image,
    uploadedImage: null,
    url: finalUrl,
    priceInput: priceMeta.numericPrice != null ? String(priceMeta.numericPrice) : "",
    numericPrice: priceMeta.numericPrice,
    rawPrice: priceMeta.rawPrice,
    currency: priceMeta.originalCurrency || BASE_CURRENCY,
    starred: false,
    private: false,
    needsReview,
    source: data?.source || "preview",
  };
}

function buildManualDraft(rawUrl) {
  const normalisedUrl = normaliseInputUrl(rawUrl);
  const retailer = normaliseRetailer(normalisedUrl);

  return {
    title: "",
    retailer,
    image: "",
    uploadedImage: null,
    url: normalisedUrl,
    priceInput: "",
    numericPrice: null,
    rawPrice: "",
    currency: BASE_CURRENCY,
    starred: false,
    private: false,
    needsReview: true,
    source: "manual-timeout",
  };
}

function createPreviewTimeoutError() {
  const error = new Error("PREVIEW_TIMEOUT");
  error.code = "PREVIEW_TIMEOUT";
  return error;
}

async function fetchPreviewWithTimeout(url, timeoutMs = PREVIEW_TIMEOUT_MS) {
  const controller = new AbortController();

  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch("/api/link-preview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ url, currency: BASE_CURRENCY }),
      signal: controller.signal,
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
  } catch (err) {
    if (err?.name === "AbortError") {
      throw createPreviewTimeoutError();
    }
    throw err;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function ModalShell({ isOpen, onClose, eyebrow, title, children, footer }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(33,24,20,0.42)] px-4 py-4 backdrop-blur-sm sm:px-6 sm:py-6">
      <div className="flex min-h-full items-start justify-center">
        <div className="flex w-full max-w-[620px] flex-col overflow-hidden rounded-[30px] border border-[#efdcd2] bg-white shadow-[0_28px_80px_rgba(75,45,30,0.18)] max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)]">
          <div className="shrink-0 border-b border-[#f2e5de] bg-white px-6 py-5 sm:px-7">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#e08a67]">
                  {eyebrow}
                </p>
                <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.05em] text-slate-900">
                  {title}
                </h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#efe0d7] text-slate-500 hover:bg-[#faf6f3]"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 sm:px-7">
            {children}
          </div>

          <div className="shrink-0 border-t border-[#f2e5de] bg-white px-6 py-4 sm:px-7">
            {footer}
          </div>
        </div>
      </div>
    </div>
  );
}

function HintFormFields({
  form,
  setForm,
  prefix = "new",
  showToggles = true,
  imageHelpText = "No image yet. Upload one here if you want to add a photo.",
}) {
  const previewImage = form.uploadedImage || form.image;

  return (
    <div className="space-y-4">
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
              className="max-h-[320px] w-full object-cover"
            />
          </div>
        ) : (
          <div className="mt-3 rounded-[20px] border border-dashed border-[#efe0d7] bg-[#faf6f3] px-4 py-8 text-center text-sm text-slate-500">
            {imageHelpText}
          </div>
        )}
      </div>

      {showToggles ? (
        <div className="flex flex-wrap items-center gap-4">
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

function AddHintModal({
  isOpen,
  form,
  setForm,
  onClose,
  onSubmit,
  isSaving,
  notice,
}) {
  const helperCopy = notice
    ? "We tried to get your info, but this shop asked you to put it in instead."
    : "We found what we could. Check the details and fix anything before saving.";

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      eyebrow="New hint"
      title="Review before saving"
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSaving}
            className="inline-flex h-12 items-center justify-center rounded-full border border-[#ee8d69] bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-6 text-sm font-semibold text-white shadow-lg disabled:opacity-70"
          >
            {isSaving ? "Saving..." : "Save hint"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {notice ? (
          <div className="rounded-[22px] border border-[#f4cdbd] bg-[#fff6f1] p-4 text-sm text-[#9b553d]">
            {notice}
          </div>
        ) : null}

        <p className="text-sm text-slate-500">{helperCopy}</p>

        <HintFormFields
          form={form}
          setForm={setForm}
          prefix="new"
          showToggles
          imageHelpText="No image yet. Upload one if you want to add a photo now."
        />
      </div>
    </ModalShell>
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
  return (
    <ModalShell
      isOpen={isOpen && !!hint}
      onClose={onClose}
      eyebrow="Edit hint"
      title="Update this card"
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
      }
    >
      <HintFormFields
        form={editForm}
        setForm={setEditForm}
        prefix="edit"
        showToggles={false}
        imageHelpText="No image yet. Add or replace a photo here if you want."
      />
    </ModalShell>
  );
}

function HintCard({
  hint,
  imageRatios,
  onEdit,
  onToggleStarred,
  onTogglePrivate,
  isDragging,
  dragHandleListeners,
  dragHandleAttributes,
  formatCurrency,
}) {
  const ratio = getCardAspectRatio(hint, imageRatios);

  const displayPrice =
    typeof hint.numericPrice === "number" && Number.isFinite(hint.numericPrice)
      ? formatCurrency(hint.numericPrice, hint.currency || BASE_CURRENCY)
      : "Price unavailable";

  return (
    <article
      className={`group relative w-full overflow-hidden rounded-[30px] border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.60)] transition-all duration-300 ${
        isDragging ? "scale-[1.02]" : "hover:-translate-y-1"
      }`}
      style={{
        aspectRatio: `${ratio}`,
        maxHeight: CARD_MAX_HEIGHT,
        boxShadow: isDragging
          ? "0 26px 70px rgba(113,74,49,0.22), inset 0 1px 0 rgba(255,255,255,0.24)"
          : "0 10px 30px rgba(176,118,86,0.10), inset 0 1px 0 rgba(255,255,255,0.24)",
      }}
    >
      <div className="absolute inset-0">
        {hint.image ? (
          <>
            <img
              src={hint.image}
              alt={hint.title}
              className={`h-full w-full object-cover transition-transform duration-500 ${
                isDragging ? "scale-[1.01]" : "group-hover:scale-[1.03]"
              } ${hint.private ? "opacity-84" : ""}`}
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(16,12,10,0.84)_0%,rgba(16,12,10,0.42)_26%,rgba(16,12,10,0.10)_50%,rgba(255,255,255,0)_72%)]" />
          </>
        ) : (
          <>
            <div
              className={`absolute inset-0 bg-gradient-to-br ${hint.fallbackGradient} ${
                hint.private ? "opacity-80" : ""
              }`}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(22,18,16,0.72)] via-[rgba(22,18,16,0.18)] to-transparent" />
          </>
        )}
      </div>

      <div className="absolute left-4 right-4 top-4 z-30 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="pointer-events-auto flex min-h-[40px] cursor-grab items-center gap-1 rounded-full border border-white/45 bg-white/72 px-3 py-2 text-[11px] font-semibold text-slate-700 backdrop-blur-md active:cursor-grabbing"
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
            <div className="rounded-full border border-white/45 bg-white/72 px-3 py-1 text-[11px] font-semibold text-slate-700 backdrop-blur-md">
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
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/45 bg-white/72 text-[15px] text-slate-500 backdrop-blur-md hover:text-slate-800"
            aria-label="Edit hint"
          >
            ✎
          </button>

          <button
            onClick={() => onToggleStarred(hint)}
            className={`pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/45 bg-white/72 text-[16px] backdrop-blur-md ${
              hint.starred ? "text-[#f36f64]" : "text-slate-400 hover:text-[#f36f64]"
            }`}
            aria-label={hint.starred ? "Unhighlight hint" : "Highlight hint"}
            type="button"
          >
            ★
          </button>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-4 sm:p-5">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2
              className="overflow-hidden text-[22px] font-semibold tracking-[-0.05em] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.24)]"
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

            <div className="mt-3">
              <span className="inline-flex rounded-full border border-[#ffd8c9] bg-[#fff1e9] px-2.5 py-1 text-[11px] font-semibold text-[#df7c59]">
                {displayPrice}
              </span>
            </div>
          </div>

          <div className="pointer-events-auto flex shrink-0 items-center gap-2 self-end">
            <button
              type="button"
              onClick={() => onTogglePrivate(hint)}
              className="rounded-full border border-white/45 bg-white/76 px-3 py-1.5 text-[12px] font-medium text-slate-700 backdrop-blur-md hover:bg-white"
            >
              {hint.private ? "🔒 Private" : "🔓 Public"}
            </button>

            <a
              href={hint.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/45 bg-white/76 px-3 py-1.5 text-[12px] font-medium text-slate-700 backdrop-blur-md hover:bg-white"
            >
              Open
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

function SortableHintCard({
  hint,
  imageRatios,
  onEdit,
  onToggleStarred,
  onTogglePrivate,
  formatCurrency,
}) {
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
        imageRatios={imageRatios}
        onEdit={onEdit}
        onToggleStarred={onToggleStarred}
        onTogglePrivate={onTogglePrivate}
        isDragging={isDragging}
        dragHandleAttributes={attributes}
        dragHandleListeners={listeners}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}

function HintColumn({ id, items, children }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[240px] rounded-[28px] transition-colors ${
        isOver ? "bg-[rgba(255,241,233,0.45)]" : "bg-transparent"
      }`}
    >
      <SortableContext items={items.map((hint) => hint.id)} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </div>
  );
}

export default function HintsClient() {
  const { formatCurrency } = useCurrencyFormatter();

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
  const [imageRatios, setImageRatios] = useState({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmittingNewHint, setIsSubmittingNewHint] = useState(false);
  const [pendingHint, setPendingHint] = useState(null);
  const [newHintForm, setNewHintForm] = useState(EMPTY_NEW_HINT_FORM);
  const [addModalNotice, setAddModalNotice] = useState("");
  const [busyState, setBusyState] = useState({ open: false, title: "", message: "" });
  const [columnMap, setColumnMap] = useState(buildColumnMap([]));
  const busyLongTimerRef = useRef(null);
  const lastOverId = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const measuring = {
    droppable: { strategy: MeasuringStrategy.Always },
  };

  function clearBusyTimers() {
    if (busyLongTimerRef.current) {
      window.clearTimeout(busyLongTimerRef.current);
      busyLongTimerRef.current = null;
    }
  }

  function closeBusy() {
    clearBusyTimers();
    setBusyState({ open: false, title: "", message: "" });
  }

  function beginFetchBusy() {
    clearBusyTimers();

    setBusyState({
      open: true,
      title: "Fetching your item...",
      message: "Pulling the title, image, and price from the link...",
    });

    busyLongTimerRef.current = window.setTimeout(() => {
      setBusyState((current) =>
        current.open
          ? {
              ...current,
              title: "Still fetching...",
              message:
                "This is taking a little longer than expected. Some retailers are slower to respond.",
            }
          : current
      );
    }, 5000);
  }

  function beginSaveBusy() {
    clearBusyTimers();
    setBusyState({
      open: true,
      title: "Saving hint",
      message: "Adding this card to your board...",
    });
  }

  function beginEditSaveBusy() {
    clearBusyTimers();
    setBusyState({
      open: true,
      title: "Saving changes",
      message: "Updating this hint...",
    });
  }

  useEffect(() => {
    return () => clearBusyTimers();
  }, []);

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
      setColumnMap(buildColumnMap([]));
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
        setColumnMap(buildColumnMap([]));
        setIsLoading(false);
        return;
      }

      const loadedHints = (data || []).map((row, index) => ({
        id: row.id,
        title: row.title || "Saved hint",
        retailer: row.retailer || normaliseRetailer(row.url || ""),
        numericPrice: row.numeric_price,
        rawPrice: row.price_text || "",
        currency: row.currency || detectCurrency(row.price_text) || BASE_CURRENCY,
        image: row.image_url || "",
        fallbackGradient: buildFallbackGradient(index),
        starred: Boolean(row.starred),
        private: Boolean(row.is_private),
        url: row.url || "",
        position: row.position ?? index,
        needsReview: false,
      }));

      setHints(loadedHints);
      setColumnMap(buildColumnMap(loadedHints));
      setIsLoading(false);
    }

    loadHints();
  }, [currentUser]);

  useEffect(() => {
    let cancelled = false;

    async function measureRatios() {
      const combinedVisible = [...hints, ...demoHints];
      const itemsWithImages = combinedVisible.filter((hint) => hint.image && !imageRatios[hint.id]);
      if (!itemsWithImages.length) return;

      const nextEntries = await Promise.all(
        itemsWithImages.map(async (hint) => {
          const ratio = await loadImageAspectRatio(hint.image);
          return [hint.id, ratio];
        })
      );

      if (cancelled) return;

      setImageRatios((current) => {
        const next = { ...current };
        for (const [id, ratio] of nextEntries) {
          if (ratio && Number.isFinite(ratio)) next[id] = ratio;
        }
        return next;
      });
    }

    measureRatios();

    return () => {
      cancelled = true;
    };
  }, [hints, imageRatios]);

  async function persistOrder(nextHints) {
    if (!currentUser) return;
    const supabase = createClient();

    await Promise.all(
      nextHints.map((hint, index) => supabase.from("hints").update({ position: index }).eq("id", hint.id))
    );
  }

  function syncHintsFromColumns(nextColumnMap) {
    const flat = flattenColumnMap(nextColumnMap);
    setColumnMap(nextColumnMap);
    setHints(flat);
    return flat;
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
  }

  function closeAddModal() {
    setIsAddModalOpen(false);
    setPendingHint(null);
    setIsSubmittingNewHint(false);
    setNewHintForm(EMPTY_NEW_HINT_FORM);
    setAddModalNotice("");
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
    setError("");
    beginEditSaveBusy();

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("hints")
        .update({
          title: trimmedTitle,
          url: trimmedUrl,
          retailer: trimmedRetailer,
          image_url: finalImage,
          price_text: editForm.priceInput || "",
          numeric_price: priceMeta.numericPrice,
          currency: priceMeta.originalCurrency || BASE_CURRENCY,
        })
        .eq("id", editingHintId);

      if (error) {
        setError(errorToMessage(error));
        setIsSavingEdit(false);
        closeBusy();
        return;
      }

      if (finalImage) {
        const ratio = await loadImageAspectRatio(finalImage);
        if (ratio) {
          setImageRatios((current) => ({ ...current, [editingHintId]: ratio }));
        }
      }

      setColumnMap((currentMap) => {
        const nextMap = Object.fromEntries(
          COLUMN_IDS.map((columnId) => [
            columnId,
            (currentMap[columnId] || []).map((hint) =>
              hint.id === editingHintId
                ? {
                    ...hint,
                    title: trimmedTitle,
                    url: trimmedUrl || hint.url,
                    retailer: trimmedRetailer,
                    image: finalImage,
                    rawPrice: editForm.priceInput || "",
                    numericPrice: priceMeta.numericPrice,
                    currency: priceMeta.originalCurrency || BASE_CURRENCY,
                    needsReview: false,
                  }
                : hint
            ),
          ])
        );

        setHints(flattenColumnMap(nextMap));
        return nextMap;
      });

      setIsSavingEdit(false);
      closeBusy();
      closeEditModal();
    } catch (err) {
      setError(errorToMessage(err));
      setIsSavingEdit(false);
      closeBusy();
    }
  }

  async function deleteHint() {
    if (!currentUser) return;
    const supabase = createClient();
    const { error } = await supabase.from("hints").delete().eq("id", editingHintId);

    if (error) {
      setError(errorToMessage(error));
      return;
    }

    setColumnMap((currentMap) => {
      const nextMap = Object.fromEntries(
        COLUMN_IDS.map((columnId) => [
          columnId,
          (currentMap[columnId] || []).filter((hint) => hint.id !== editingHintId),
        ])
      );
      setHints(flattenColumnMap(nextMap));
      return nextMap;
    });

    closeEditModal();
  }

  async function toggleStarred(hint) {
    if (!currentUser) return;
    const supabase = createClient();
    const newStarred = !hint.starred;

    setColumnMap((currentMap) => {
      const nextMap = Object.fromEntries(
        COLUMN_IDS.map((columnId) => [
          columnId,
          (currentMap[columnId] || []).map((h) => (h.id === hint.id ? { ...h, starred: newStarred } : h)),
        ])
      );
      setHints(flattenColumnMap(nextMap));
      return nextMap;
    });

    const { error } = await supabase.from("hints").update({ starred: newStarred }).eq("id", hint.id);

    if (error) {
      setColumnMap((currentMap) => {
        const nextMap = Object.fromEntries(
          COLUMN_IDS.map((columnId) => [
            columnId,
            (currentMap[columnId] || []).map((h) => (h.id === hint.id ? { ...h, starred: hint.starred } : h)),
          ])
        );
        setHints(flattenColumnMap(nextMap));
        return nextMap;
      });
      setError(errorToMessage(error));
    }
  }

  async function togglePrivate(hint) {
    if (!currentUser) return;
    const supabase = createClient();
    const newPrivate = !hint.private;

    setColumnMap((currentMap) => {
      const nextMap = Object.fromEntries(
        COLUMN_IDS.map((columnId) => [
          columnId,
          (currentMap[columnId] || []).map((h) => (h.id === hint.id ? { ...h, private: newPrivate } : h)),
        ])
      );
      setHints(flattenColumnMap(nextMap));
      return nextMap;
    });

    const { error } = await supabase.from("hints").update({ is_private: newPrivate }).eq("id", hint.id);

    if (error) {
      setColumnMap((currentMap) => {
        const nextMap = Object.fromEntries(
          COLUMN_IDS.map((columnId) => [
            columnId,
            (currentMap[columnId] || []).map((h) => (h.id === hint.id ? { ...h, private: hint.private } : h)),
          ])
        );
        setHints(flattenColumnMap(nextMap));
        return nextMap;
      });
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
    beginFetchBusy();

    try {
      const data = await fetchPreviewWithTimeout(normaliseInputUrl(trimmed), PREVIEW_TIMEOUT_MS);
      const draft = buildDraftFromPreview(data, trimmed);

      if (draft.image) {
        const ratio = await loadImageAspectRatio(draft.image);
        if (ratio) {
          setImageRatios((current) => ({ ...current, [editingHintId]: ratio }));
        }
      }

      setColumnMap((currentMap) => {
        const nextMap = Object.fromEntries(
          COLUMN_IDS.map((columnId) => [
            columnId,
            (currentMap[columnId] || []).map((hint) =>
              hint.id === editingHintId
                ? {
                    ...hint,
                    title: draft.title,
                    retailer: draft.retailer,
                    numericPrice: draft.numericPrice,
                    rawPrice: draft.rawPrice,
                    currency: draft.currency || BASE_CURRENCY,
                    image: draft.image || hint.image,
                    url: draft.url,
                    needsReview: draft.needsReview,
                  }
                : hint
            ),
          ])
        );
        setHints(flattenColumnMap(nextMap));
        return nextMap;
      });

      setEditForm((current) => ({
        ...current,
        title: draft.title,
        url: draft.url,
        retailer: draft.retailer,
        image: draft.image || current.image,
        priceInput: draft.priceInput,
      }));
    } catch (err) {
      if (err?.code === "PREVIEW_TIMEOUT" || err?.message === "PREVIEW_TIMEOUT") {
        setError(
          "We couldn’t fetch that item in time. You can still edit it here and add the photo manually."
        );
      } else {
        setError(errorToMessage(err));
      }
    } finally {
      setIsRefreshingEdit(false);
      closeBusy();
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
    setAddModalNotice("");
    beginFetchBusy();

    try {
      const normalisedUrl = normaliseInputUrl(trimmed);
      const data = await fetchPreviewWithTimeout(normalisedUrl, PREVIEW_TIMEOUT_MS);
      const draft = buildDraftFromPreview(data, trimmed);

      setPendingHint(draft);
      setNewHintForm({ ...EMPTY_NEW_HINT_FORM, ...draft });
      setIsAddModalOpen(true);
      setLink("");
    } catch (err) {
      const manualDraft = buildManualDraft(trimmed);

      setPendingHint(manualDraft);
      setNewHintForm({ ...EMPTY_NEW_HINT_FORM, ...manualDraft });
      setAddModalNotice(TIMEOUT_MODAL_MESSAGE);
      setIsAddModalOpen(true);
      setLink("");
    } finally {
      setIsAdding(false);
      closeBusy();
    }
  }

  async function submitNewHint() {
    if (!currentUser || !pendingHint) return;

    setIsSubmittingNewHint(true);
    setError("");
    beginSaveBusy();

    try {
      const title = newHintForm.title.trim() || pendingHint.title || "Saved hint";
      const url = newHintForm.url.trim() || pendingHint.url;
      const retailer = newHintForm.retailer?.trim() || normaliseRetailer(url);
      const numericPrice = extractNumericPrice(newHintForm.priceInput);
      const priceMeta = sanitisePrice(newHintForm.priceInput, numericPrice);
      const image = newHintForm.uploadedImage || newHintForm.image || "";

      const newHint = {
        id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `hint-${Date.now()}`,
        title,
        retailer,
        numericPrice: priceMeta.numericPrice,
        rawPrice: newHintForm.priceInput || "",
        currency: priceMeta.originalCurrency || BASE_CURRENCY,
        image,
        fallbackGradient: buildFallbackGradient(hints.length),
        starred: Boolean(newHintForm.starred),
        private: Boolean(newHintForm.private),
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
        price_text: newHint.rawPrice,
        numeric_price: newHint.numericPrice,
        currency: newHint.currency,
        starred: newHint.starred,
        is_private: newHint.private,
        position: 0,
        source: newHintForm.source || "user",
      });

      if (error) throw new Error(errorToMessage(error));

      if (image) {
        const ratio = await loadImageAspectRatio(image);
        if (ratio) {
          setImageRatios((current) => ({ ...current, [newHint.id]: ratio }));
        }
      }

      setColumnMap((currentMap) => {
        const firstColumn = currentMap["column-0"] || [];
        const nextMap = {
          ...currentMap,
          "column-0": [newHint, ...firstColumn],
        };
        const flat = flattenColumnMap(nextMap);
        const rebuilt = buildColumnMap(flat);
        setHints(flattenColumnMap(rebuilt));
        return rebuilt;
      });

      closeAddModal();
    } catch (err) {
      setError(errorToMessage(err));
      setIsSubmittingNewHint(false);
      closeBusy();
      return;
    }

    setIsSubmittingNewHint(false);
    closeBusy();
  }

  function handleDragStart(event) {
    setActiveId(event.active.id);
    lastOverId.current = event.active.id;
  }

  function handleDragOver(event) {
    const { active, over } = event;
    const overId = over?.id;

    if (!overId) return;

    lastOverId.current = overId;

    setColumnMap((currentMap) => {
      const activeContainer = findContainerForId(currentMap, active.id);
      const overContainer = findContainerForId(currentMap, overId);

      if (!activeContainer || !overContainer) return currentMap;
      if (activeContainer === overContainer) return currentMap;

      const activeItems = [...currentMap[activeContainer]];
      const overItems = [...currentMap[overContainer]];
      const activeIndex = activeItems.findIndex((item) => item.id === active.id);

      if (activeIndex === -1) return currentMap;

      const [movedItem] = activeItems.splice(activeIndex, 1);

      const overIndex = overItems.findIndex((item) => item.id === overId);
      const isOverColumn = COLUMN_IDS.includes(overId);
      const insertAt = isOverColumn || overIndex === -1 ? overItems.length : overIndex;

      overItems.splice(insertAt, 0, movedItem);

      const nextMap = {
        ...currentMap,
        [activeContainer]: activeItems,
        [overContainer]: overItems,
      };

      setHints(flattenColumnMap(nextMap));
      return nextMap;
    });
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    setActiveId(null);

    const overId = over?.id || lastOverId.current;
    if (!overId) return;

    let nextFlat = null;

    setColumnMap((currentMap) => {
      const activeContainer = findContainerForId(currentMap, active.id);
      const overContainer = findContainerForId(currentMap, overId);

      if (!activeContainer || !overContainer) return currentMap;

      const activeItems = [...currentMap[activeContainer]];
      const overItems = [...currentMap[overContainer]];
      const oldIndex = activeItems.findIndex((item) => item.id === active.id);

      if (oldIndex === -1) return currentMap;

      let nextMap = currentMap;

      if (activeContainer === overContainer) {
        const overIndex =
          COLUMN_IDS.includes(overId)
            ? activeItems.length - 1
            : activeItems.findIndex((item) => item.id === overId);

        if (overIndex !== -1 && oldIndex !== overIndex) {
          nextMap = {
            ...currentMap,
            [activeContainer]: arrayMove(activeItems, oldIndex, overIndex),
          };
        }
      } else {
        nextMap = currentMap;
      }

      nextFlat = flattenColumnMap(nextMap);
      setHints(nextFlat);
      return nextMap;
    });

    if (nextFlat) {
      await persistOrder(nextFlat);
    }
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  const activeHint = hints.find((hint) => hint.id === activeId) || null;
  const editingHint = hints.find((hint) => hint.id === editingHintId) || null;
  const demoColumns = useMemo(() => splitIntoColumns(demoHints, 3), []);

  return (
    <main className="min-h-screen bg-[#fffaf7] text-slate-800">
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
                {isAdding ? "Checking..." : isLoading ? "Loading..." : "Add hint"}
              </button>
            </div>

            {error ? (
              <p className="mt-3 text-sm font-medium text-[#c45c42]">{error}</p>
            ) : (
              <div className="mt-3 space-y-1 text-sm text-slate-500">
                <p>
                  We’ll try our best to pull the title, image, and price before you review it.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="mt-12">
          <div className="relative rounded-[36px] border border-[#efe0d7] bg-[#fffdfb] p-3 shadow-[0_12px_32px_rgba(176,118,86,0.08)] sm:p-5">
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
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="mb-6 break-inside-avoid">
                    <div
                      className="w-full overflow-hidden rounded-[30px] border border-[rgba(255,255,255,0.14)] bg-[#f9f8f5]"
                      style={{
                        aspectRatio:
                          i === 1 ? "0.74" : i === 2 ? "1.2" : i === 3 ? "0.9" : i === 4 ? "0.68" : i === 5 ? "1.26" : "0.82",
                        maxHeight: CARD_MAX_HEIGHT,
                      }}
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
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {COLUMN_IDS.map((columnId) => {
                    const items = columnMap[columnId] || [];
                    return (
                      <HintColumn key={columnId} id={columnId} items={items}>
                        <div className="space-y-0">
                          {items.map((hint) => (
                            <SortableHintCard
                              key={hint.id}
                              hint={hint}
                              imageRatios={imageRatios}
                              onEdit={openEditModal}
                              onToggleStarred={toggleStarred}
                              onTogglePrivate={togglePrivate}
                              formatCurrency={formatCurrency}
                            />
                          ))}
                        </div>
                      </HintColumn>
                    );
                  })}
                </div>

                <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.25, 1, 0.5, 1)" }}>
                  {activeHint ? (
                    <div className="w-full max-w-[420px]">
                      <HintCard
                        hint={activeHint}
                        imageRatios={imageRatios}
                        onEdit={() => {}}
                        onToggleStarred={() => {}}
                        onTogglePrivate={() => {}}
                        isDragging
                        dragHandleAttributes={{}}
                        dragHandleListeners={{}}
                        formatCurrency={formatCurrency}
                      />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {demoColumns.map((columnHints, columnIndex) => (
                  <div key={`demo-column-${columnIndex}`} className="space-y-0">
                    {columnHints.map((hint) => (
                      <div key={hint.id} className="mb-6 break-inside-avoid">
                        <HintCard
                          hint={hint}
                          imageRatios={imageRatios}
                          onEdit={() => {}}
                          onToggleStarred={() => {}}
                          onTogglePrivate={() => {}}
                          isDragging={false}
                          dragHandleAttributes={{}}
                          dragHandleListeners={{}}
                          formatCurrency={formatCurrency}
                        />
                      </div>
                    ))}
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
        notice={addModalNotice}
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

      <BusyOverlay open={busyState.open} title={busyState.title} message={busyState.message} />
    </main>
  );
}
