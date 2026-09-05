"use client";

import { useEffect, useMemo, useCallback, useRef, useState, memo } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
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
import { createClient } from "../../../lib/supabase/client";
import { trackRetailerClick } from "../../../lib/trackRetailerClick";
import HintImage from "../../components/HintImage";
import ShareButton from "../../components/ShareButton";
import { useCurrencyFormatter } from "../../../lib/useCurrencyFormatter";
import { usePreferences } from "../../providers/PreferencesProvider";
import AvatarMenu from "../../components/AvatarMenu";
import BackLink from "../../components/BackLink";
import { recordBoardVisit } from "../../../lib/recentActivity";

const BASE_CURRENCY = "GBP";
const PREVIEW_TIMEOUT_MS = 18000;
const CARD_MAX_HEIGHT = "min(540px, 68vh)";
const CARD_MIN_HEIGHT = "220px";
// Deliberately lower than the desktop value above - mobile's 2-column
// grid gives each card a much narrower width (~169px on a typical
// phone) than desktop's 3-column grid does, so reusing the same 220px
// floor made mobile cards noticeably taller than wide (an elongated,
// too-tall look). 160px sits close to that column's own width - a
// near-square floor that still stops extreme wide/short images from
// looking broken, without flattening the natural variation for
// everything else the way 220px did.
const MOBILE_CARD_MIN_HEIGHT = "160px";
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
  occasions: ["Birthday", "Christmas"],
};

const EMPTY_EDIT_FORM = {
  title: "",
  url: "",
  retailer: "",
  image: "",
  uploadedImage: null,
  priceInput: "",
  occasions: ["Birthday", "Christmas"],
  size: "",
  size_type: "",
  colour: "",
  private: false,
};

// Wraps demo/placeholder content with a reduced-opacity look plus a
// diagonal light sweep animating across it on a loop - a visual cue
// that this is illustrative example content, not real data, without
// needing extra text or a badge on every card.
function DemoFadeOverlay({ children }) {
  return (
    <div
      className="relative overflow-hidden rounded-[18px]"
      style={{ animation: "demoFadeBreathe 4s ease-in-out infinite" }}
    >
      {children}
      <style jsx>{`
        @keyframes demoFadeBreathe {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}

function SortableDemoHintCard({ hint, imageRatios, formatCurrency, useMobileCard }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: hint.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 1,
    position: "relative",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-6 break-inside-avoid">
      <DemoFadeOverlay>
        {useMobileCard ? (
          <MobileHintCard
            hint={hint}
            imageRatios={imageRatios}
            onEdit={() => {}}
            onToggleStarred={() => {}}
            onTogglePrivate={() => {}}
            formatCurrency={formatCurrency}
          />
        ) : (
          <HintCard
            hint={hint}
            imageRatios={imageRatios}
            onEdit={() => {}}
            onToggleStarred={() => {}}
            onTogglePrivate={() => {}}
            isDragging={isDragging}
            formatCurrency={formatCurrency}
          />
        )}
      </DemoFadeOverlay>
    </div>
  );
}

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
  },
  {
    id: "demo-5",
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
    position: 4,
    needsReview: false,
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
  },
  {
    id: "demo-7",
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
    position: 6,
    needsReview: false,
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
  },
  {
    id: "demo-9",
    title: "Fine jewellery",
    retailer: "libertylondon.com",
    numericPrice: 275,
    currency: "GBP",
    image:
      "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=1200&q=80",
    fallbackGradient: "from-[#efe5de] via-[#e5d2c8] to-[#d1b2a4]",
    starred: false,
    private: false,
    url: "https://www.libertylondon.com/",
    position: 8,
    needsReview: false,
  },
  {
    id: "demo-10",
    title: "Luxury fragrance",
    retailer: "selfridges.com",
    numericPrice: 98,
    currency: "GBP",
    image:
      "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&q=80",
    fallbackGradient: "from-[#eadce8] via-[#d8bfd1] to-[#bb9ab6]",
    starred: false,
    private: true,
    url: "https://www.selfridges.com/",
    position: 9,
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
  const trimmed = String(value || "").trim();
  if (!trimmed || /\s/.test(trimmed)) return false;
  try {
    const withProtocol =
      trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    return (
      ["http:", "https:"].includes(parsed.protocol) &&
      /\.[a-z]{2,}$/i.test(parsed.hostname)
    );
  } catch {
    return false;
  }
}

function buildDropHeadline(count, title) {
  if (count > 1) return `Dropped ${count} Hints`;
  return "Dropped a Hint" + (title && title !== "Hint" ? ": " + title : "");
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

function sanitisePrice(rawPrice, numericPrice, fallbackCurrency = BASE_CURRENCY) {
  const detectedCurrency = detectCurrency(rawPrice) || fallbackCurrency;

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
  if (!source) return "Hint";

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

  if (!words.length) return "Hint";
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

// Exact pixel crop amounts for known iPhone screenshot resolutions -
// portrait only (screenshots of product pages are essentially always
// portrait in practice). Sourced from Apple's own published safe-area
// insets (in points) for each device class, converted to pixels at each
// device's real @2x/@3x scale factor - not a guess, actual documented
// values. Two families:
// - Dynamic Island devices (iPhone 14 Pro onward, and 15/16 regular -
//   Dynamic Island came to all models from the 15 on): 59pt top safe
//   area, 34pt bottom (home indicator), both @3x = 177px top, 102px
//   bottom
// - Notch-only devices (iPhone X through 14 non-Pro): 47pt top, 34pt
//   bottom, @3x = 141px top, 102px bottom
// - Home-button devices (SE, 8 and earlier): plain 20pt/60px or 40px
//   status bar depending on @2x vs @3x, no gesture bar to crop at the
//   bottom at all (physical button, not a swipe gesture)
const IOS_SCREENSHOT_CROPS = {
  "1179x2556": { top: 177, bottom: 102 }, // 14 Pro, 15, 15 Pro, 16 (6.1")
  "1206x2622": { top: 177, bottom: 102 }, // iPhone 16 (6.1", alternate reported resolution)
  "1290x2796": { top: 177, bottom: 102 }, // 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus (6.7")
  "1320x2868": { top: 177, bottom: 102 }, // 16 Pro Max, 17 Pro Max (6.9")
  "1260x2736": { top: 177, bottom: 102 }, // iPhone Air (6.9")
  "1170x2532": { top: 141, bottom: 102 }, // 12, 13, 14 (6.1")
  "1284x2778": { top: 141, bottom: 102 }, // 12 Pro Max, 13 Pro Max (6.7")
  "1125x2436": { top: 141, bottom: 102 }, // X, XS, 11 Pro (5.8")
  "1242x2688": { top: 141, bottom: 102 }, // XS Max, 11 Pro Max (6.5")
  "750x1334": { top: 40, bottom: 0 },     // SE 2nd/3rd gen, 6/6s/7/8 (4.7"), @2x
  "1242x2208": { top: 60, bottom: 0 },    // 6/7/8 Plus (5.5"), @3x
};

// Fallback for anything not in the table above - most commonly Android
// (too fragmented across manufacturers/densities to build a reliable
// per-model table the way iPhone's small, Apple-controlled device list
// allows), but also covers any future/unrecognized iPhone resolution.
// ~4% top / ~3% bottom approximates a standard Android status bar +
// gesture nav bar as a proportion of a typical tall phone screenshot.
const FALLBACK_TOP_PERCENT = 0.04;
const FALLBACK_BOTTOM_PERCENT = 0.03;

// Only screenshot-shaped images should ever get cropped - a normal
// uploaded product photo is usually closer to square or landscape, and
// applying this to one would cut off real content for no reason. Modern
// phone screenshots run roughly 1.78-2.2 height-to-width (the older
// home-button iPhone resolutions - SE, 8 Plus - sit right at 1.78, which
// a stricter 1.8 threshold would have wrongly excluded despite being in
// the lookup table above; confirmed by testing against those exact
// resolutions before settling on 1.75 as a safe floor).
const SCREENSHOT_ASPECT_RATIO_THRESHOLD = 1.75;

function getImageDimensions(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Could not read image dimensions."));
    img.src = dataUrl;
  });
}

function cropDataUrl(dataUrl, width, height, top, bottom) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const cropHeight = height - top - bottom;
      if (cropHeight <= 0) {
        resolve(dataUrl); // crop would remove everything - bail out safely
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = cropHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, top, width, cropHeight, 0, 0, width, cropHeight);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => reject(new Error("Could not crop image."));
    img.src = dataUrl;
  });
}

// Detects whether an uploaded image looks like a phone screenshot and,
// if so, crops out the status bar and home-indicator/gesture-bar area so
// a saved hint's photo doesn't visibly read as "someone's phone screen."
// Returns the original dataUrl unchanged for anything that doesn't look
// like a screenshot, or if anything goes wrong - cropping is a nice-to-
// have, never something that should block a photo from being saved.
async function autoCropScreenshot(dataUrl) {
  try {
    const { width, height } = await getImageDimensions(dataUrl);
    if (!width || !height || height / width < SCREENSHOT_ASPECT_RATIO_THRESHOLD) {
      return dataUrl;
    }

    const known = IOS_SCREENSHOT_CROPS[`${width}x${height}`];
    const top = known ? known.top : Math.round(height * FALLBACK_TOP_PERCENT);
    const bottom = known ? known.bottom : Math.round(height * FALLBACK_BOTTOM_PERCENT);

    return await cropDataUrl(dataUrl, width, height, top, bottom);
  } catch {
    return dataUrl; // never block the upload over a cropping failure
  }
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
  const ratioMap = {
    "demo-1": 0.74,
    "demo-2": 1.18,
    "demo-3": 0.9,
    "demo-4": 1.28,
    "demo-5": 0.82,
    "demo-6": 0.7,
    "demo-7": 1.1,
    "demo-8": 0.86,
    "demo-9": 0.76,
    "demo-10": 1.22,
  };

  if (ratioMap[hint?.id]) return ratioMap[hint.id];
  if (hint?.image) { const fb = [0.55,1.2,0.65,1.4,0.5,1.1,0.7,1.5,0.6,1.3]; return fb[hint.id ? hint.id.charCodeAt(0) % fb.length : 0]; }
  return 1;
}

function getCardAspectRatio(hint, imageRatios) {
  const imageRatio = imageRatios[hint.id];
  if (imageRatio && Number.isFinite(imageRatio)) {
    return imageRatio;
  }
  return fallbackCardRatio(hint);
}

// When scraping finds nothing at all (title comes back empty), the old
// fallback was a bare "Hint" - unhelpful when it happens repeatedly for
// the same handful of stubborn retailers (eBay, Trader Joe's, Office
// all hit this in practice). Many product URLs carry a real descriptive
// slug in the path even when the page itself can't be scraped (e.g.
// endclothing.com/us/nike-dunk-low-hf0106-100.html,
// traderjoes.com/.../fuyu-persimmons-095578) - try to turn that into a
// readable guess first, and only fall back to "Item from {retailer}"
// (still far better than bare "Hint") when the URL has no usable slug
// at all (eBay's /itm/800588156476 is just a numeric ID, nothing to
// extract).
function guessTitleFromUrl(rawUrl, retailer) {
  try {
    const { pathname } = new URL(String(rawUrl || ""));
    const segments = pathname.split("/").filter(Boolean);
    const slugSegment = segments
      .filter((seg) => seg.includes("-") && /[a-zA-Z]/.test(seg))
      .sort((a, b) => b.length - a.length)[0];

    if (slugSegment) {
      const words = slugSegment
        .replace(/\.(html?|php|aspx?)$/i, "")
        .split(/[-_]+/)
        .filter(Boolean);
      // Prefer dropping numeric/SKU-looking tokens (e.g. "hf0106",
      // "095578") for a cleaner guess, but only if enough real words
      // remain - otherwise keep everything rather than end up empty.
      const wordyTokens = words.filter((w) => /[a-zA-Z]{2,}/.test(w) && !/^\d+$/.test(w));
      const useTokens = wordyTokens.length >= 2 ? wordyTokens : words;
      const guess = useTokens
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
        .trim();
      if (guess.length >= 4) return guess;
    }
  } catch {
    // fall through to the retailer-based guess below
  }
  return retailer ? `Item from ${retailer}` : "";
}

// Same 6 gradients used for the homepage's demo preview cards
// (HomePageClient.jsx) - reused here as a fallback so a hint that
// scraped no real image at all (eBay, Trader Joe's, Office all hit
// this in practice - some retailers are blocked at the network level,
// no amount of parsing fixes that) still gets something visually
// consistent with the rest of the app, instead of a blank/broken
// image. These are real static files (public/gradients/*.svg), so
// they slot straight into the existing imageOptions picker without
// needing any new rendering logic anywhere else in the app - a
// gradient chosen this way is functionally just another image URL.
const FALLBACK_GRADIENT_OPTIONS = [
  "/gradients/1.png",
  "/gradients/2.png",
  "/gradients/3.png",
  "/gradients/4.png",
  "/gradients/5.png",
  "/gradients/6.png",
];

function buildDraftFromPreview(data, rawUrl) {
  const extractedNumericPrice =
    typeof data?.numericPrice === "number" ? data.numericPrice : extractNumericPrice(data?.priceText);
  const priceMeta = sanitisePrice(data?.priceText, extractedNumericPrice);
  const retailer = data?.siteName || normaliseRetailer(rawUrl);
  const title = shortenTitle(data?.title || guessTitleFromUrl(rawUrl, retailer) || "Hint", retailer);
  const scrapedImage = typeof data?.image === "string" && data.image.startsWith("http") ? data.image : "";
  // Same imageOptions field the AI-experience-idea flow already
  // populates below (buildDraftFromAiIdea) - reusing the existing
  // picker UI in AddHintModal rather than building something new.
  // Real product links can genuinely have multiple image candidates
  // too now that lib/linkPreview.js gathers more than just one - most
  // often this'll just be a single-item array (nothing to pick between,
  // same as before), but when a page's default og:image is a logo
  // rather than the actual product, this is what lets someone choose
  // the real photo instead of silently keeping whatever was scraped.
  const scrapedImageOptions = Array.isArray(data?.imageCandidates)
    ? data.imageCandidates.filter((u) => typeof u === "string" && u.startsWith("http"))
    : [];
  // Nothing real found at all - offer the gradients instead of leaving
  // the person with a blank/broken image and no way to save something
  // that looks intentional.
  const usingFallbackGradients = !scrapedImage && scrapedImageOptions.length === 0;
  // No auto-selected big preview for a gradient - just offer the small
  // swatches in the picker (capped to 3, matching the picker's own
  // display limit - no point generating/offering 6 when only 3 ever
  // show) and let the person choose. image stays empty until they
  // actually pick one, so the large photo-preview area shows the
  // normal "no image yet" state instead of a gradient blown up full
  // size by default.
  const image = scrapedImage;
  const imageOptions = usingFallbackGradients
    ? FALLBACK_GRADIENT_OPTIONS.slice(0, 3)
    : scrapedImageOptions;
  const finalUrl = data?.url || normaliseInputUrl(rawUrl);
  const needsReview = Boolean(data?.needsReview) || usingFallbackGradients || !title;

  return {
    title,
    retailer,
    image,
    imageOptions,
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

function buildDraftFromAiIdea(data, prompt) {
  const title = String(data?.title || prompt || "Hint").trim();
  const images = Array.isArray(data?.images) ? data.images.filter((u) => typeof u === "string" && u.startsWith("http")) : [];

  return {
    title,
    retailer: data?.retailer || "Experience idea",
    image: images[0] || "",
    imageOptions: images,
    uploadedImage: null,
    url: "",
    priceInput: "",
    numericPrice: null,
    rawPrice: "",
    currency: BASE_CURRENCY,
    starred: false,
    private: false,
    needsReview: true,
    source: "stock-photo",
  };
}

// The Chrome extension only works in Chrome (and other Chromium-based
// browsers, which can install Chrome Web Store extensions the same way -
// Edge, Brave, Opera, Vivaldi all included deliberately rather than
// narrowing to literal Chrome only) - Safari and Firefox can't use it at
// all, so the suggestion to try it should never show there, where it'd
// just be a dead end.
function isChromeFamilyBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // Chromium-based browsers all include "Chrome" in their UA string (even
  // when they also identify themselves, e.g. Edge adds "Edg/", Opera adds
  // "OPR/") - excluding UAs that specifically indicate a non-Chromium
  // engine (Safari without Chrome, Firefox) is what actually matters here.
  return /Chrome|Chromium|CriOS|Edg\/|OPR\//.test(ua) && !/Firefox/.test(ua);
}

// The extension's own content script (detectInstalled.js) marks the page
// with this attribute, running at document_start on hintdrop.app -
// before this component even mounts if the extension is installed, so
// checking for it here (no need for a useEffect/async check) reliably
// tells us whether to bother suggesting an install someone already has.
function hasExtensionInstalled() {
  if (typeof document === "undefined") return false;
  return document.documentElement.hasAttribute("data-hintdrop-extension");
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
    <div className="fixed inset-0 z-[110] overflow-y-auto bg-[rgba(33,24,20,0.42)] px-4 py-4 backdrop-blur-sm sm:px-6 sm:py-6">
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
  showPrivateToggle = showToggles,
  imageOptions,
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
            const rawImageUrl = await fileToDataUrl(file);
            const imageUrl = await autoCropScreenshot(rawImageUrl);
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

        {Array.isArray(imageOptions) && imageOptions.length > 1 && (
          <div className="mt-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Choose a photo</p>
              {imageOptions[0]?.startsWith("/gradients/") && imageOptions.length > 3 && (
                <button
                  type="button"
                  onClick={() => setGradientBatch((b) => Math.min(b + 1, Math.floor(imageOptions.length / 3) - 1))}
                  disabled={gradientBatch >= Math.floor(imageOptions.length / 3) - 1}
                  className="text-[13px] font-semibold text-[#df7b59] disabled:cursor-not-allowed disabled:text-slate-300"
                >
                  {gradientBatch >= Math.floor(imageOptions.length / 3) - 1 ? "No more options" : "Don't like these? Show 3 more"}
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {imageOptions.slice(gradientBatch * 3, gradientBatch * 3 + 3).map((url, i) => (
                <button
                  key={url + i}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, image: url, uploadedImage: null }))}
                  className={`relative aspect-square overflow-hidden rounded-[16px] border-2 transition ${
                    form.image === url ? "border-[#ff946d]" : "border-transparent hover:border-[#f0dfd6]"
                  }`}
                >
                  <HintImage src={url} alt="" fill className="object-cover" sizes="120px" />
                  {form.image === url && (
                    <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#ff946d] text-white text-[11px]">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
        {imageOptions?.[0]?.startsWith("/gradients/") && (
          <div className="mt-3">
            <p className="mb-2 text-sm font-semibold text-slate-700">What kind of idea is this?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, ideaType: "gift" }))}
                className={`flex-1 h-11 rounded-[14px] text-sm font-semibold transition ${
                  form.ideaType !== "experience" ? "bg-[#e3f5ea] text-[#2f8a5f]" : "border border-[#ead8ce] bg-white text-slate-600"
                }`}
              >
                🎁 Gift idea
              </button>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, ideaType: "experience" }))}
                className={`flex-1 h-11 rounded-[14px] text-sm font-semibold transition ${
                  form.ideaType === "experience" ? "bg-[#e3f5ea] text-[#2f8a5f]" : "border border-[#ead8ce] bg-white text-slate-600"
                }`}
              >
                🎟️ Experience idea
              </button>
            </div>
          </div>
        )}

      </div>
      <div>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Occasions (optional)</label>
        <div className="flex flex-wrap gap-2.5">
          {["Birthday", "Christmas", "Valentine's Day", "Anniversary", "Wedding", "Graduation", "Just because", "Mother's Day", "Father's Day", "Housewarming"].map(occasion => {
            const selected = form.occasions?.includes(occasion);
            const atMax = (form.occasions?.length || 0) >= 2 && !selected;
            return (
              <button
                key={occasion}
                type="button"
                disabled={atMax}
                onClick={() => setForm(current => {
                  const sel = current.occasions || [];
                  const isSel = sel.includes(occasion);
                  if (false) return current;
                  return { ...current, occasions: isSel ? sel.filter(o => o !== occasion) : [...sel, occasion] };
                })}
                className={"rounded-full px-4 py-2.5 text-sm font-medium transition " + (selected ? "bg-[#e3f5ea] text-[#2f8a5f]" : atMax ? "border border-slate-200 bg-white text-slate-300 cursor-not-allowed" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}
              >
                {occasion}
              </button>
            );
          })}
        </div>
      </div>
      </div>
      {(showToggles || showPrivateToggle) ? (
        <div className="flex flex-wrap items-center gap-4">
          {showToggles && (
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
          )}

          {showPrivateToggle && (
            <button
              type="button"
              onClick={() => setForm((current) => ({ ...current, private: !current.private }))}
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                form.private
                  ? "border-[#ffd8c9] bg-[#fffaf7] text-[#e08a67]"
                  : "border-[#efe0d7] bg-[#f7f2ee] text-slate-700 hover:bg-[#f1ebe6]"
              }`}
            >
              {form.private ? "🔒 Private" : "Public"}
            </button>
          )}
        </div>
      ) : null}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Size (optional)</label>
              <input type="text" value={form.size || ""} onChange={e => setForm(f => ({ ...f, size: e.target.value }))}
                placeholder="e.g. M, 10, EU 42"
                className="h-11 w-full rounded-[14px] border border-[#eadcd3] bg-[#fcfaf8] px-4 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#f19a78]/50" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Size type</label>
              <select value={form.size_type || ""} onChange={e => setForm(f => ({ ...f, size_type: e.target.value }))}
                className="h-11 w-full rounded-[14px] border border-[#eadcd3] bg-[#fcfaf8] px-4 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#f19a78]/50">
                <option value="">Select type</option>
                <option value="Clothing">Clothing</option>
                <option value="Shoes">Shoes</option>
                <option value="Dress">Dress</option>
                <option value="Ring">Ring</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Colour (optional)</label>
              <input type="text" value={form.colour || ""} onChange={e => setForm(f => ({ ...f, colour: e.target.value }))}
                placeholder="e.g. Navy, Rose gold"
                className="h-11 w-full rounded-[14px] border border-[#eadcd3] bg-[#fcfaf8] px-4 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#f19a78]/50" />
            </div>
          </div>
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
  imageOptions,
  suggestExtension,
}) {
  const [gradientBatch, setGradientBatch] = useState(0);

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
      <div
        className="space-y-4"
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && !isSaving) {
            e.preventDefault();
            onSubmit();
          }
        }}
      >
        {notice ? (
          <div className="rounded-[22px] border border-[#f4cdbd] bg-[#fff6f1] p-4 text-sm text-[#9b553d]">
            {notice}
          </div>
        ) : null}

        <p className="text-sm text-slate-500">{helperCopy}</p>

        {suggestExtension && (
          <div className="rounded-[22px] border border-[#e8dfd3] bg-[#f7f4ee] p-4 text-sm text-[#5c5647]">
            <p className="font-semibold text-[#3a362b]">Having trouble with this one?</p>
            <p className="mt-1">
              Our browser extension reads the page directly while you&apos;re on it, so it can
              grab details some shops won&apos;t hand over otherwise. Or, take a screenshot of
              the page and upload it below — we&apos;ll tidy it up automatically.
            </p>
            <a
              href="/extension"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex h-9 items-center justify-center rounded-full border border-[#d8cdb8] bg-white px-4 text-[13px] font-semibold text-[#3a362b]"
            >
              Get the extension →
            </a>
          </div>
        )}

        <HintFormFields
          form={form}
          setForm={setForm}
          prefix="new"
          showToggles
          imageOptions={imageOptions}
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
        showPrivateToggle
        imageHelpText="No image yet. Add or replace a photo here if you want."
      />
    </ModalShell>
  );
}


const MOBILE_CARD_GRADIENTS = [
  "from-[#d9dfcf] via-[#b9c7aa] to-[#90a27e]",
  "from-[#ead8ca] via-[#dbc0a8] to-[#c4a17f]",
  "from-[#efe5de] via-[#e5d2c8] to-[#d1b2a4]",
  "from-[#d5dbee] via-[#b3c0df] to-[#8f9fc9]",
  "from-[#eadce8] via-[#d8bfd1] to-[#bb9ab6]",
];

const MobileHintCard = memo(function MobileHintCard({ hint, imageRatios, onEdit, onToggleStarred, onTogglePrivate, formatCurrency, sharerName }) {
  const [imgError, setImgError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const pointerDownRef = useRef(null);
  const ratio = getCardAspectRatio(hint, imageRatios || {});
  const gradient = MOBILE_CARD_GRADIENTS[hint.id ? hint.id.charCodeAt(0) % MOBILE_CARD_GRADIENTS.length : 0];

  function handleTapDown(e) {
    pointerDownRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
  }

  function handleTapUp(e) {
    const down = pointerDownRef.current;
    pointerDownRef.current = null;
    if (!down) return;
    const dx = Math.abs(e.clientX - down.x);
    const dy = Math.abs(e.clientY - down.y);
    const dt = Date.now() - down.time;
    // A quick tap with minimal movement opens the modal, even when this
    // card is also wrapped in a drag-and-drop sortable (native click can
    // get suppressed by the drag sensor's touch handling, so we detect
    // taps directly from raw pointer events instead).
    if (dx < 8 && dy < 8 && dt < 250) {
      setShowModal(true);
    }
  }

  return (
    <>
      <article
        className="rounded-[22px] overflow-hidden shadow-sm cursor-pointer"
        onPointerDown={handleTapDown}
        onPointerUp={handleTapUp}
      >
        <div className="relative w-full" style={{ aspectRatio: `${ratio}`, minHeight: MOBILE_CARD_MIN_HEIGHT }}>
          <HintImage src={hint.image} alt={hint.title} fill className="object-cover" sizes="(max-width: 768px) 50vw, 300px" fallbackClassName="text-4xl" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute top-2 left-2 text-[13px]">{hint.private ? "🔒" : ""}</div>
          {hint.starred && <div className="absolute top-2 right-2 text-[13px]" >⭐</div>}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="text-[19px] font-extrabold text-white leading-tight line-clamp-1 mb-1" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.6)" }}>{hint.title || "Hint"}</p>
            {(hint.rawPrice || hint.numericPrice > 0) && <span className="inline-block text-[12px] font-bold text-white rounded-full px-2.5 py-0.5" style={{ background: "#ff875d" }}>{hint.rawPrice || new Intl.NumberFormat("en-GB", { style: "currency", currency: hint.currency || "GBP" }).format(hint.numericPrice)}</span>}
          </div>
        </div>
      </article>
      {showModal && createPortal(
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 backdrop-blur-sm min-[480px]:items-center min-[480px]:px-4" style={{ animation: "fadeIn 0.15s ease" }} onClick={() => setShowModal(false)}>
          <div className="w-full max-w-[480px] rounded-t-[28px] min-[480px]:rounded-[28px] bg-[#fffaf7] border border-[#efdcd2] shadow-xl overflow-y-auto" style={{ maxHeight: "92dvh", animation: "slideUp 0.2s ease" }} onClick={e => e.stopPropagation()}>
              <div className="flex justify-end px-4 pt-3"><button type="button" onClick={() => setShowModal(false)} className="h-8 w-8 flex items-center justify-center rounded-full border border-[#ead8ce] text-slate-400 text-lg">✕</button></div>
            <div className="relative">
              {hint.image && !imgError
                ? <HintImage src={hint.image} alt={hint.title} width={800} height={600} className="w-full h-auto" />
                : <div className={`w-full bg-gradient-to-br ${gradient} flex items-center justify-center text-6xl`} style={{ height: "200px" }}>🎁</div>
              }
            </div>
            <div className="p-5">
              <p className="text-[18px] font-semibold text-slate-900 leading-tight mb-1">{hint.private ? "🔒 " : ""}{hint.title || "Hint"}</p>
              {hint.retailer && <p className="text-[13px] text-slate-400 mb-1">{hint.retailer}</p>}
              {(hint.size || hint.colour) && (
                <p className="text-[13px] text-slate-600 mb-1">
                  {hint.size && <>📏 Size: <strong>{hint.size}</strong>{hint.sizeType ? ` (${hint.sizeType})` : ""}</>}
                  {hint.size && hint.colour && "  ·  "}
                  {hint.colour && <>🎨 Colour: <strong>{hint.colour}</strong></>}
                </p>
              )}
              {hint.rawPrice && <p className="text-[15px] font-bold text-[#df7b59] mb-4">{hint.rawPrice}</p>}
              <div className="flex gap-3 mb-3">
                <button type="button" onClick={() => { onTogglePrivate(hint); }}
                  className="flex-1 h-10 rounded-full border border-[#ead8ce] bg-white text-[13px] font-semibold text-slate-600">
                  {hint.private ? "🔒 Private" : "Public"}
                </button>
                <button type="button" onClick={() => { onToggleStarred(hint); }}
                  className={`flex-1 h-10 rounded-full border text-[13px] font-semibold ${hint.starred ? "border-[#ffd8c9] bg-[#fff2ea] text-[#e27956]" : "border-[#ead8ce] bg-white text-slate-600"}`}>
                  {hint.starred ? "★ Top pick" : "☆ Star"}
                </button>
              </div>
              {!hint.private && !hint.id?.startsWith("demo-") && (
                <div className="mb-3">
                  <ShareButton
                    supabase={createClient()}
                    subjectType="hint"
                    subjectId={hint.id}
                    path={`/h/${hint.id}`}
                    title={hint.title}
                    sharerName={sharerName}
                    label="Share this hint"
                    className="w-full h-11 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[13px] font-semibold text-white flex items-center justify-center gap-1.5 shadow-md hover:brightness-105"
                  />
                </div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowModal(false); onEdit(hint); }}
                  className="flex-1 h-11 rounded-full border border-[#ead8ce] bg-white text-[13px] font-semibold text-slate-700">
                  Edit
                </button>
                {hint.url && !hint.id?.startsWith("demo-") && (
                  <a href={hint.url} target="_blank" rel="noopener noreferrer"
                    onClick={() => {
                      const supabase = createClient();
                      supabase.auth.getUser().then(({ data }) => {
                        trackRetailerClick(supabase, { userId: data?.user?.id, hintId: hint.id, url: hint.url, retailer: hint.retailer, source: "hints_page" });
                      });
                    }}
                    className="flex-1 h-11 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[13px] font-semibold text-white flex items-center justify-center shadow-lg">
                    Open →
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
});

const HintCard = memo(function HintCard({
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
      className={`group relative w-full overflow-hidden rounded-[30px] border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.60)] transition-transform duration-300 ${
        isDragging ? "scale-[1.02]" : "hover:-translate-y-1"
      }`}
      style={{
        aspectRatio: `${ratio}`,
        maxHeight: CARD_MAX_HEIGHT,
        minHeight: CARD_MIN_HEIGHT,
        boxShadow: isDragging
          ? "0 26px 70px rgba(113,74,49,0.22), inset 0 1px 0 rgba(255,255,255,0.24)"
          : "0 10px 30px rgba(176,118,86,0.10), inset 0 1px 0 rgba(255,255,255,0.24)",
      }}
    >
      <div className="absolute inset-0">
        {hint.image ? (
          <>
            <HintImage
              src={hint.image}
              alt={hint.title}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className={`object-cover transition-transform duration-500 ${
                isDragging ? "scale-[1.01]" : "group-hover:scale-[1.03]"
              } ${hint.private ? "opacity-84" : ""}`}
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
            <div className="absolute inset-0 flex items-center justify-center text-[56px] opacity-30">🎁</div>
          </>
        )}
      </div>

      <div className="absolute left-4 right-4 top-4 z-30 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="pointer-events-auto hidden sm:flex min-h-[40px] cursor-grab items-center gap-1 rounded-full border border-white/45 bg-white/90 px-3 py-2 text-[11px] font-semibold text-slate-700 active:cursor-grabbing"
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
            <div className="rounded-full border border-white/45 bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-700">
              Private
            </div>
          )}

          {hint.needsReview && hint.image && (
            <div className="rounded-full border border-[#f6d2c2] bg-[#fff6f1] px-3 py-1 text-[11px] font-semibold text-[#c46545]">
              Needs review
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(hint)}
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/45 bg-white/90 text-[15px] text-slate-500 hover:text-slate-800"
            aria-label="Edit hint"
          >
            ✎
          </button>

          <button
            onClick={() => onToggleStarred(hint)}
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/45 bg-white/90 text-[16px]"
            aria-label={hint.starred ? "Unhighlight hint" : "Highlight hint"}
            type="button"
          >
            {hint.starred ? "⭐" : "☆"}
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
              {hint.private ? "🔒 " : ""}{hint.title}
            </h2>

            <p className="mt-1 truncate text-[13px] text-white/78">{hint.retailer}</p>

            <div className="mt-3 flex flex-wrap gap-1.5 items-center">
              <span className="inline-flex rounded-full border border-[#ffd8c9] bg-[#fff1e9] px-2.5 py-1 text-[11px] font-semibold text-[#df7c59]">
                {displayPrice}
              </span>
              {(hint.occasions || []).slice(0, 2).map(occasion => (
                <span key={occasion} className="inline-flex rounded-full border border-white/45 bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                  {occasion}
                </span>
              ))}
            </div>
          </div>

          <div className="pointer-events-auto flex shrink-0 items-center gap-2 self-end">
            {hint.private && (
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/45 bg-white/92 text-[14px]"
                aria-label="Private hint"
                title="Private — change this in Edit"
              >
                🔒
              </span>
            )}

            <a
              href={hint.id?.startsWith("demo-") ? undefined : hint.url}
              target={hint.id?.startsWith("demo-") ? undefined : "_blank"}
              rel={hint.id?.startsWith("demo-") ? undefined : "noopener noreferrer"}
              aria-disabled={hint.id?.startsWith("demo-") || undefined}
              onClick={(e) => {
                if (hint.id?.startsWith("demo-")) { e.preventDefault(); return; }
                const supabase = createClient();
                supabase.auth.getUser().then(({ data }) => {
                  trackRetailerClick(supabase, { userId: data?.user?.id, hintId: hint.id, url: hint.url, retailer: hint.retailer, source: "hints_page" });
                });
              }}
              className={`rounded-full border border-white/45 bg-white/92 px-3 py-1.5 text-[12px] font-medium text-slate-700 ${hint.id?.startsWith("demo-") ? "cursor-default opacity-50" : "hover:bg-white"}`}
            >
              Open
            </a>
          </div>
        </div>
      </div>
    </article>
  );
});

const SortableHintCard = memo(function SortableHintCard({
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
});

const SortableMobileHintCard = memo(function SortableMobileHintCard({
  hint,
  imageRatios,
  onEdit,
  onToggleStarred,
  onTogglePrivate,
  formatCurrency,
  sharerName,
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
    touchAction: "pan-y",
    WebkitTouchCallout: "none",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <MobileHintCard
        hint={hint}
        imageRatios={imageRatios}
        onEdit={onEdit}
        onToggleStarred={onToggleStarred}
        onTogglePrivate={onTogglePrivate}
        sharerName={sharerName}
        formatCurrency={formatCurrency}
      />
    </div>
  );
});

function LoadingHintCard({ ratio = "0.92" }) {
  return (
    <div
      className="w-full overflow-hidden rounded-[30px] border border-[rgba(255,255,255,0.14)] bg-[#f9f8f5]"
      style={{
        aspectRatio: ratio,
        maxHeight: CARD_MAX_HEIGHT,
        boxShadow: "0 10px 30px rgba(176,118,86,0.08), inset 0 1px 0 rgba(255,255,255,0.24)",
      }}
    >
      <div className="relative h-full w-full overflow-hidden">
        <div className="skeleton absolute inset-0" />
        <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
          <div className="h-10 w-[78px] rounded-full bg-white/70" />
          <div className="h-10 w-10 rounded-full bg-white/70" />
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
          <div className="space-y-3">
            <div className="h-6 w-2/3 rounded-full bg-white/70" />
            <div className="h-3 w-1/3 rounded-full bg-white/50" />
            <div className="h-6 w-[88px] rounded-full bg-[#fff1e9]/80" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HintsClient({ boardId }) {
  const router = useRouter();
  const { formatCurrency } = useCurrencyFormatter();
  const { currency: userCurrency } = usePreferences();
  const [board, setBoard] = useState(null);
  const [boardLoading, setBoardLoading] = useState(true);
  const [togglingBoardPrivacy, setTogglingBoardPrivacy] = useState(false);

  const [hints, setHints] = useState([]);
  // Demo hints (shown on an empty board) are draggable for
  // demonstration purposes - reordering them only ever changes this
  // local state, never persisted anywhere, since there's no real
  // board content yet to save an order for.
  const [demoHintsOrder, setDemoHintsOrder] = useState(demoHints);
  // Caps how many hints actually render into the DOM at once — with no
  // limit, a board with a large number of hints meant every card (each
  // with its own set of overlay buttons) rendered simultaneously
  // regardless of count, which compounds into real scroll jank. 60 covers
  // the vast majority of boards without ever showing "Load more" at all.
  const [visibleCount, setVisibleCount] = useState(60);
  const [link, setLink] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");
  const [editingHintId, setEditingHintId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [isRefreshingEdit, setIsRefreshingEdit] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserName, setCurrentUserName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [imageRatios, setImageRatios] = useState({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmittingNewHint, setIsSubmittingNewHint] = useState(false);
  const [pendingHint, setPendingHint] = useState(null);
  const [newHintForm, setNewHintForm] = useState(EMPTY_NEW_HINT_FORM);
  const [addModalNotice, setAddModalNotice] = useState("");
  const [busyState, setBusyState] = useState({ open: false, title: "", message: "" });
  const busyLongTimerRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const mobileSensors = useSensors(
    // TouchSensor (not PointerSensor) specifically for mobile — it
    // listens on native touchmove events, which support preventDefault()
    // to actually block the browser's own gesture handling (like pull-
    // to-refresh) once the activation delay is met. PointerSensor uses
    // the Pointer Events API instead, which doesn't suppress native touch
    // gestures the same way — that gap was very likely why the
    // overscroll-behavior CSS fix alone wasn't fully reliable.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
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
    let cancelled = false;

    async function loadSessionAndHints() {
      setIsLoading(true);
      setBoardLoading(true);
      setVisibleCount(60);
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;

      setCurrentUser(user || null);

      if (!user) {
        setHints([]);
        setIsLoading(false);
        setBoardLoading(false);
        return;
      }

      // The name set during onboarding is saved to profiles.full_name, not
      // to auth user_metadata — that field only gets auto-populated for
      // Google-authenticated accounts (from the OAuth profile), so relying
      // on it alone silently showed "Someone" for anyone who signed up
      // with email/password and set their name during onboarding instead.
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
        .then(({ data }) => setCurrentUserName(data?.full_name || user.user_metadata?.full_name || ""));

      if (boardId) {
        const { data: boardRow } = await supabase
          .from("hint_boards")
          .select("id, title, user_id, is_default, is_private")
          .eq("id", boardId)
          .maybeSingle();
        if (cancelled) return;
        // Boards are owner-only workspaces (sharing is via the separate
        // public /b/[boardId] page) — if this board isn't ours, or doesn't
        // exist, don't fall through to loading unscoped hints
        if (!boardRow || boardRow.user_id !== user.id) {
          setBoard(null);
          setHints([]);
          setIsLoading(false);
          setBoardLoading(false);
          return;
        }
        setBoard(boardRow);
        recordBoardVisit(supabase, user.id, boardId);
      }
      setBoardLoading(false);

      let hintsQuery = supabase
        .from("hints")
        .select("id, title, url, image_url, retailer, price_text, numeric_price, currency, starred, is_private, position, created_at, occasions, size, size_type, colour")
        .eq("user_id", user.id);
      if (boardId) hintsQuery = hintsQuery.eq("board_id", boardId);
      const { data, error } = await hintsQuery
        .order("position", { ascending: true })
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        setError(errorToMessage(error));
        setHints([]);
        setIsLoading(false);
        return;
      }

      setHints(
        (data || []).map((row, index) => ({
          id: row.id,
          title: row.title || "Hint",
          retailer: row.retailer || normaliseRetailer(row.url || ""),
          numericPrice: row.numeric_price,
          rawPrice: row.price_text || "",
          currency: row.currency || detectCurrency(row.price_text) || BASE_CURRENCY,
          occasions: row.occasions || [],
          size: row.size || "",
          sizeType: row.size_type || "",
          colour: row.colour || "",
          image: row.image_url || "",
          fallbackGradient: buildFallbackGradient(index),
          starred: Boolean(row.starred),
          private: Boolean(row.is_private),
          url: row.url || "",
          position: row.position ?? index,
          needsReview: false,
        }))
      );

      setIsLoading(false);
    }

    loadSessionAndHints();
    return () => { cancelled = true; };
  }, [boardId]);

  // Live-update: a hint saved elsewhere (the Chrome extension is the
  // motivating case - someone adds a hint from a product page while this
  // tab is already open on /hints) now appears here immediately, no
  // refresh needed. hints wasn't in the supabase_realtime publication at
  // all before this - confirmed via pg_publication_tables and added via
  // ALTER PUBLICATION. RLS's own "auth.uid() = user_id" read policy on
  // hints (confirmed via pg_policy) already scopes Realtime delivery to
  // the current user's own rows, so the user_id filter below is a second,
  // belt-and-suspenders layer, not the only thing standing between users.
  useEffect(() => {
    if (!currentUser) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`hints-live-${currentUser.id}-${boardId || "all"}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "hints", filter: `user_id=eq.${currentUser.id}` },
        (payload) => {
          const row = payload.new;
          if (boardId && row.board_id !== boardId) return;

          setHints((current) => {
            // Already have it - either this same tab's own Add Hint flow
            // already added it locally (that path updates state directly,
            // without waiting on Realtime), or a duplicate delivery.
            if (current.some((h) => h.id === row.id)) return current;

            const newHint = {
              id: row.id,
              title: row.title || "Hint",
              retailer: row.retailer || normaliseRetailer(row.url || ""),
              numericPrice: row.numeric_price,
              rawPrice: row.price_text || "",
              currency: row.currency || detectCurrency(row.price_text) || BASE_CURRENCY,
              occasions: row.occasions || [],
              size: row.size || "",
              sizeType: row.size_type || "",
              colour: row.colour || "",
              image: row.image_url || "",
              fallbackGradient: buildFallbackGradient(current.length),
              starred: Boolean(row.starred),
              private: Boolean(row.is_private),
              url: row.url || "",
              position: row.position ?? 0,
              needsReview: false,
            };
            return [newHint, ...current];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, boardId]);

  const visibleHints = hints.slice(0, visibleCount);
  const activeHint = visibleHints.find((hint) => hint.id === activeId) || null;
  const columns = useMemo(() => splitIntoColumns(visibleHints, 3), [visibleHints]);
  const mobileColumns = useMemo(() => splitIntoColumns(visibleHints, 2), [visibleHints]);
  // Live column arrangement during an active drag — null when not
  // dragging. Each column has its own separate SortableContext, so
  // dnd-kit only auto-previews reordering within one column on its own;
  // moving an item's id into a different column's array here (via
  // onDragOver, below) is what makes dragging across columns preview
  // live too, instead of only resolving at drop.
  const [dragColumns, setDragColumns] = useState(null);
  // Same idea as dragColumns above, but for the 2-column mobile grid,
  // which is a fully separate DndContext/SortableContext set from
  // desktop's 3-column one and needs its own live cross-column state
  const [mobileDragColumns, setMobileDragColumns] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function measureRatios() {
      const itemsWithImages = visibleHints.filter((hint) => hint.image && !imageRatios[hint.id]);
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
  }, [visibleHints, imageRatios]);

  async function persistOrder(nextHints) {
    if (!currentUser) return;
    const supabase = createClient();
    // These are always existing hints being reordered, never new ones, so a
    // plain update per row (run in parallel) is correct here — an upsert
    // would validate NOT NULL columns like title against the phantom
    // insert attempt before it even checks for a conflict, and fail.
    const results = await Promise.all(
      nextHints.map((hint, index) =>
        supabase.from("hints").update({ position: index }).eq("id", hint.id).eq("user_id", currentUser.id)
      )
    );
    const failed = results.find((r) => r.error);
    if (failed) {
      console.error("persistOrder failed:", failed.error);
    }
  }

  function rebuildFromColumns(nextColumns) {
    // Interleave row-major (col0-item0, col1-item0, col2-item0, col0-item1, ...)
    // rather than flattening column-by-column — this is the order round-robin
    // column assignment expects, so re-splitting this exact array reproduces
    // the same column layout instead of scrambling it on the next render.
    const maxLen = Math.max(0, ...nextColumns.map((col) => col.length));
    const interleaved = [];
    for (let row = 0; row < maxLen; row++) {
      for (let col = 0; col < nextColumns.length; col++) {
        if (nextColumns[col][row]) interleaved.push(nextColumns[col][row]);
      }
    }
    return interleaved.map((hint, index) => ({ ...hint, position: index }));
  }

  const openEditModal = useCallback((hint) => {
    setEditingHintId(hint.id);
    setEditForm({
      title: hint.title || "",
      url: hint.url || "",
      retailer: hint.retailer || "",
      image: hint.image || "",
      uploadedImage: null,
      priceInput: hint.numericPrice != null ? String(hint.numericPrice) : "",
      occasions: hint.occasions || [],
      size: hint.size || "",
      size_type: hint.sizeType || "",
      colour: hint.colour || "",
      private: Boolean(hint.private),
    });
  }, []);

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

    const trimmedTitle = editForm.title.trim() || "Hint";
    const trimmedUrl = editForm.url.trim();
    const trimmedRetailer = editForm.retailer?.trim() || normaliseRetailer(trimmedUrl);
    const parsedNumericPrice = extractNumericPrice(editForm.priceInput);
    const priceMeta = sanitisePrice(editForm.priceInput, parsedNumericPrice, userCurrency);
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
          occasions: editForm.occasions || [],
        size: editForm.size || null,
        size_type: editForm.size_type || null,
        colour: editForm.colour || null,
        is_private: Boolean(editForm.private),
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

      setHints((current) =>
        current.map((hint) =>
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
                occasions: editForm.occasions || [],
        size: editForm.size || "",
        sizeType: editForm.size_type || "",
        colour: editForm.colour || "",
                private: Boolean(editForm.private),
                needsReview: false,
              }
            : hint
        )
      );

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

    setHints((current) => current.filter((hint) => hint.id !== editingHintId));
      const remainingHints = hints.filter(h => h.id !== editingHintId);
      const publicHints = remainingHints.filter(h => !h.private);
      const previewHints = publicHints.slice(0, 2).map(h => ({
        id: h.id,
        title: h.title,
        image_url: h.image || "",
        retailer: h.retailer || "",
        url: h.url || "",
        numeric_price: h.numericPrice,
        currency: h.currency,
        starred: h.starred,
        occasions: h.occasions || [],
        size: h.size || null,
        size_type: h.sizeType || null,
        colour: h.colour || null,
      }));
      supabase.from("feed_items").select("id").eq("owner_user_id", currentUser.id).eq("item_type", "hint_save_session").order("occurred_at", { ascending: false }).limit(1).then(({ data }) => { if (data && data[0]) supabase.from("feed_items").update({ metadata: { actor_name: currentUser.user_metadata?.full_name || "", actor_avatar_url: currentUser.user_metadata?.avatar_url || null, hint_count: publicHints.length, preview_hints: previewHints, social_enabled: true } }).eq("id", data[0].id).catch(() => {}); }).catch(() => {});
    closeEditModal();
  }

  const toggleStarred = useCallback(async (hint) => {
    if (!currentUser) return;
    const supabase = createClient();
    const newStarred = !hint.starred;

    setHints((current) => current.map((h) => (h.id === hint.id ? { ...h, starred: newStarred } : h)));

    const { error } = await supabase.from("hints").update({ starred: newStarred }).eq("id", hint.id);

    if (error) {
      setHints((current) => current.map((h) => (h.id === hint.id ? { ...h, starred: hint.starred } : h)));
      setError(errorToMessage(error));
    }
  }, [currentUser]);

  const togglePrivate = useCallback(async (hint) => {
    if (!currentUser) return;
    const supabase = createClient();
    const newPrivate = !hint.private;

    setHints((current) => current.map((h) => (h.id === hint.id ? { ...h, private: newPrivate } : h)));

    const { error } = await supabase.from("hints").update({ is_private: newPrivate }).eq("id", hint.id);

    if (error) {
      setHints((current) => current.map((h) => (h.id === hint.id ? { ...h, private: hint.private } : h)));
      setError(errorToMessage(error));
    }
  }, [currentUser]);

  async function toggleBoardPrivate() {
    if (!currentUser || !board || togglingBoardPrivacy) return;
    setTogglingBoardPrivacy(true);
    const newPrivate = !board.is_private;
    const supabase = createClient();

    setBoard((current) => ({ ...current, is_private: newPrivate }));

    const { error } = await supabase
      .from("hint_boards")
      .update({ is_private: newPrivate })
      .eq("id", boardId)
      .eq("user_id", currentUser.id);

    if (error) {
      setBoard((current) => ({ ...current, is_private: !newPrivate }));
      setError(errorToMessage(error));
    }
    setTogglingBoardPrivacy(false);
  }

  async function handleDeleteBoard() {
    if (!currentUser || !board || board.is_default) return;
    const confirmed = window.confirm(
      `Delete "${board.title}"? This removes the list and everything saved in it (${hints.length} hint${hints.length === 1 ? "" : "s"}). This can't be undone.`
    );
    if (!confirmed) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("hint_boards")
      .delete()
      .eq("id", boardId)
      .eq("user_id", currentUser.id);

    if (error) {
      setError(errorToMessage(error));
      return;
    }
    router.push("/hints");
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

      setHints((current) =>
        current.map((hint) =>
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
      setError("Paste a link or describe an experience first.");
      return;
    }

    setIsAdding(true);
    setError("");
    setAddModalNotice("");
    beginFetchBusy();

    // A description (not a URL) — e.g. "a hot air balloon ride" — gets
    // routed to a stock-photo search instead of the link scraper.
    if (!isValidHttpUrl(trimmed)) {
      try {
        const res = await fetch("/api/hint-idea", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: trimmed }),
        });
        const data = await res.json();
        if (!res.ok) {
          console.error("hint-idea error:", data?.error);
          throw new Error("Couldn't find stock photos for that description right now.");
        }

        const draft = buildDraftFromAiIdea(data, trimmed);
        setPendingHint(draft);
        setNewHintForm({ ...EMPTY_NEW_HINT_FORM, ...draft });
        setAddModalNotice("Pick a photo below, then add a price if you'd like before saving.");
        setIsAddModalOpen(true);
        setLink("");
      } catch (err) {
        console.error("hint-idea request failed:", err);
        setError("Couldn't find stock photos for that description right now — try pasting a link instead?");
      } finally {
        setIsAdding(false);
        closeBusy();
      }
      return;
    }

    try {
      const normalisedUrl = normaliseInputUrl(trimmed);
      const data = await fetchPreviewWithTimeout(normalisedUrl, PREVIEW_TIMEOUT_MS);
      const draft = buildDraftFromPreview(data, trimmed);

      setPendingHint(draft);
      setNewHintForm({ ...EMPTY_NEW_HINT_FORM, ...draft });
      setIsAddModalOpen(true);
      setLink("");
    } catch (err) {
      if (err?.code === "PREVIEW_TIMEOUT" || err?.message === "PREVIEW_TIMEOUT") {
        const manualDraft = buildManualDraft(trimmed);

        setPendingHint(manualDraft);
        setNewHintForm({ ...EMPTY_NEW_HINT_FORM, ...manualDraft });
        setAddModalNotice(TIMEOUT_MODAL_MESSAGE);
        setIsAddModalOpen(true);
        setLink("");
      } else {
        const manualDraft = buildManualDraft(trimmed);

        setPendingHint(manualDraft);
        setNewHintForm({ ...EMPTY_NEW_HINT_FORM, ...manualDraft });
        setAddModalNotice(TIMEOUT_MODAL_MESSAGE);
        setIsAddModalOpen(true);
        setLink("");
      }
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
      const title = newHintForm.title.trim() || pendingHint.title || "Hint";
      const url = newHintForm.url.trim() || pendingHint.url;
      const retailer = newHintForm.retailer?.trim() || normaliseRetailer(url);
      const numericPrice = extractNumericPrice(newHintForm.priceInput);
      const priceMeta = sanitisePrice(newHintForm.priceInput, numericPrice, userCurrency);
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
        board_id: boardId || null,
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
        occasions: newHintForm.occasions || [],
        size: newHintForm.size || null,
        size_type: newHintForm.size_type || null,
        colour: newHintForm.colour || null,
        idea_type: newHintForm.ideaType || null,
      });

      if (error) throw new Error(errorToMessage(error));

      // Only show the newly added hint in the session preview
      // Feed insert
      if (currentUser) {
      const sessionHints = newHint.private ? [] : [{
        id: newHint.id,
        title: newHint.title,
        image_url: newHint.image || "",
        retailer: newHint.retailer || "",
        url: newHint.url || "",
        numeric_price: newHint.numericPrice,
        currency: newHint.currency,
        starred: newHint.starred,
        occasions: newHintForm.occasions || [],
        size: newHintForm.size || null,
        size_type: newHintForm.size_type || null,
        colour: newHintForm.colour || null,
      }];
      const allHints = [newHint, ...hints];
      const publicHints = allHints.filter(h => !h.private);
      const previewHints = sessionHints;
      // Check for existing feed item in last hour to update instead of inserting
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      supabase.from("feed_items")
        .select("id, metadata")
        .eq("owner_user_id", currentUser.id)
        .eq("item_type", "hint_save_session")
        .gte("occurred_at", oneHourAgo)
        .order("occurred_at", { ascending: false })
        .limit(1)
        .then(({ data: existing }) => {
          if (existing && existing[0]) {
            // Update existing session feed item
            const existingMeta = existing[0].metadata || {};
            const existingPreviews = existingMeta.preview_hints || [];
            const newPreview = sessionHints[0];
            const mergedPreviews = newPreview && !existingPreviews.find(p => p.id === newPreview.id)
              ? [newPreview, ...existingPreviews]
              : existingPreviews;
            const newCount = (existingMeta.hint_count || 0) + sessionHints.length;
            supabase.from("feed_items").update({
              occurred_at: new Date().toISOString(),
              headline: buildDropHeadline(newCount, newHint.title),
              metadata: {
                ...existingMeta,
                hint_count: newCount,
                preview_hints: mergedPreviews,
              }
            }).eq("id", existing[0].id).then(r => { if (r.error) console.error("feed update error:", r.error.message); });
          } else {
            // Insert new feed item
            supabase.from("feed_items").insert({
              owner_user_id: currentUser.id,
              actor_user_id: currentUser.id,
              family: "hint",
              item_type: "hint_save_session",
              headline: buildDropHeadline(sessionHints.length, newHint.title),
              body: newHint.retailer || "",
              cta_label: "See new Hints",
              cta_href: `/hints/${boardId}`,
              visibility: "contacts",
              occurred_at: new Date().toISOString(),
              metadata: {
                actor_name: currentUser.user_metadata?.full_name || currentUser.email || "You",
                actor_avatar_url: currentUser.user_metadata?.avatar_url || null,
                hint_count: sessionHints.length,
                preview_hints: previewHints,
                social_enabled: true,
              },
            }).then(r => { if (r.error) console.error("feed insert error:", r.error.message); });
          }
        });
      } // end currentUser guard

      if (image) {
        const ratio = await loadImageAspectRatio(image);
        if (ratio) {
          setImageRatios((current) => ({ ...current, [newHint.id]: ratio }));
        }
      }

      setHints((current) => [newHint, ...current].map((item, index) => ({ ...item, position: index })));
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
    setDragColumns(splitIntoColumns(visibleHints, 3));
  }

  function handleDragOver(event) {
    const { active, over } = event;
    if (!over || !dragColumns || active.id === over.id) return;

    const fromColumnIndex = dragColumns.findIndex((col) => col.some((item) => item.id === active.id));
    const toColumnIndex = dragColumns.findIndex((col) => col.some((item) => item.id === over.id));

    // Same-column hovers are already previewed live by SortableContext
    // itself — this only needs to act when the item has actually crossed
    // into a different column's territory
    if (fromColumnIndex === -1 || toColumnIndex === -1 || fromColumnIndex === toColumnIndex) return;

    setDragColumns((prev) => {
      const next = prev.map((col) => [...col]);
      const fromItems = next[fromColumnIndex];
      const toItems = next[toColumnIndex];
      const oldIndex = fromItems.findIndex((item) => item.id === active.id);
      const overIndex = toItems.findIndex((item) => item.id === over.id);
      if (oldIndex === -1 || overIndex === -1) return prev;
      const [moved] = fromItems.splice(oldIndex, 1);
      toItems.splice(overIndex, 0, moved);
      return next;
    });
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    setActiveId(null);

    if (!dragColumns) return;
    const workingColumns = dragColumns.map((col) => [...col]);
    setDragColumns(null);

    // Any cross-column move already happened live via onDragOver above —
    // this only needs to resolve a final within-column reorder based on
    // exactly where it was dropped, since same-column position isn't
    // tracked in state during the drag (SortableContext previews that on
    // its own without needing it to be)
    if (over && active.id !== over.id) {
      const colIndex = workingColumns.findIndex((col) => col.some((item) => item.id === active.id));
      const overColIndex = workingColumns.findIndex((col) => col.some((item) => item.id === over.id));
      if (colIndex !== -1 && colIndex === overColIndex) {
        const items = workingColumns[colIndex];
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          workingColumns[colIndex] = arrayMove(items, oldIndex, newIndex);
        }
      }
    }

    const reorderedVisible = rebuildFromColumns(workingColumns);
    const hiddenRemainder = hints.slice(visibleCount);
    const nextHints = [...reorderedVisible, ...hiddenRemainder].map((h, i) => ({ ...h, position: i }));

    // A touch hold long enough to activate dnd-kit's TouchSensor (past
    // its 250ms delay) but without any actual movement afterward still
    // reaches this point with an unchanged order - confirmed this is
    // exactly what was causing a network round-trip (and its loading
    // state) on every long-press, even ones that were never really a
    // drag at all. Skip persisting when the hint ID sequence is
    // actually identical to what's already there. Same fix applied to
    // handleMobileDragEnd below.
    const orderUnchanged = nextHints.length === hints.length && nextHints.every((h, i) => h.id === hints[i]?.id);
    if (orderUnchanged) return;

    setHints(nextHints);
    await persistOrder(nextHints);
  }

  function handleDragCancel() {
    setActiveId(null);
    setDragColumns(null);
    setMobileDragColumns(null);
  }

  function handleMobileDragStart(event) {
    setActiveId(event.active.id);
    setMobileDragColumns(splitIntoColumns(visibleHints, 2));
  }

  function handleMobileDragOver(event) {
    const { active, over } = event;
    if (!over || !mobileDragColumns || active.id === over.id) return;

    const fromColumnIndex = mobileDragColumns.findIndex((col) => col.some((item) => item.id === active.id));
    const toColumnIndex = mobileDragColumns.findIndex((col) => col.some((item) => item.id === over.id));

    if (fromColumnIndex === -1 || toColumnIndex === -1 || fromColumnIndex === toColumnIndex) return;

    setMobileDragColumns((prev) => {
      const next = prev.map((col) => [...col]);
      const fromItems = next[fromColumnIndex];
      const toItems = next[toColumnIndex];
      const oldIndex = fromItems.findIndex((item) => item.id === active.id);
      const overIndex = toItems.findIndex((item) => item.id === over.id);
      if (oldIndex === -1 || overIndex === -1) return prev;
      const [moved] = fromItems.splice(oldIndex, 1);
      toItems.splice(overIndex, 0, moved);
      return next;
    });
  }

  async function handleMobileDragEnd(event) {
    const { active, over } = event;
    setActiveId(null);

    if (!mobileDragColumns) return;
    const workingColumns = mobileDragColumns.map((col) => [...col]);
    setMobileDragColumns(null);

    if (over && active.id !== over.id) {
      const colIndex = workingColumns.findIndex((col) => col.some((item) => item.id === active.id));
      const overColIndex = workingColumns.findIndex((col) => col.some((item) => item.id === over.id));
      if (colIndex !== -1 && colIndex === overColIndex) {
        const items = workingColumns[colIndex];
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          workingColumns[colIndex] = arrayMove(items, oldIndex, newIndex);
        }
      }
    }

    const reorderedVisible = rebuildFromColumns(workingColumns);
    const hiddenRemainder = hints.slice(visibleCount);
    const nextHints = [...reorderedVisible, ...hiddenRemainder].map((h, i) => ({ ...h, position: i }));

    const orderUnchanged = nextHints.length === hints.length && nextHints.every((h, i) => h.id === hints[i]?.id);
    if (orderUnchanged) return;

    setHints(nextHints);
    await persistOrder(nextHints);
  }

  const editingHint = visibleHints.find((hint) => hint.id === editingHintId) || null;

  const loadingColumns = [
    ["0.76", "1.14", "0.88"],
    ["1.22", "0.72", "1.02"],
    ["0.84", "1.18", "0.78"],
  ];

  return (
    <main className="min-h-screen bg-[#fffaf7] text-slate-800">
      <div className="mx-auto max-w-[1380px] px-5 py-10 md:px-8">
        <section className="text-center">
          {boardId && (
            <div className="mb-4 text-left">
              <BackLink href="/hints">All Hints</BackLink>
            </div>
          )}

          <div className="flex flex-col items-center gap-3">
            {boardId && !boardLoading && board && !board.is_default && (
              <div className="inline-flex rounded-full bg-[#fff4ee] px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#e37b57]">
                {board.title}
              </div>
            )}
            <h1 className="text-[32px] font-extrabold tracking-[-0.06em] text-[#f19a78] sm:text-[44px] md:text-[56px]">
              Drop a Hint here...
            </h1>
            {boardId && !boardLoading && board && currentUser && (
              <div className="flex items-center gap-2">
                <ShareButton
                  supabase={createClient()}
                  subjectType="board"
                  subjectId={boardId}
                  path={`/profile/${currentUser.id}?board=${boardId}`}
                  title={board.is_default ? null : board.title}
                  sharerName={currentUserName}
                  currentUserId={currentUser.id}
                  label={board.is_default ? "Share my Hints" : `Share "${board.title}"`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-4 py-2 text-[13px] font-semibold text-white shadow-md hover:brightness-105"
                />
                <button
                  type="button"
                  onClick={toggleBoardPrivate}
                  disabled={togglingBoardPrivacy}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#ead8ce] bg-white px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-[#fff5f0] disabled:opacity-60"
                >
                  {board.is_private ? "🔒 Private" : "Public"}
                </button>
                {!board.is_default && (
                  <button
                    type="button"
                    onClick={handleDeleteBoard}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#ead8ce] bg-white px-4 py-2 text-[13px] font-semibold text-slate-500 hover:bg-[#fff0f0] hover:text-[#b14f43]"
                  >
                    Delete list
                  </button>
                )}
              </div>
            )}
            {boardId && !boardLoading && board?.is_private && (
              <p className="max-w-[36ch] text-[12px] leading-5 text-slate-400">
                Hidden from your Hints menu and anyone browsing your profile — but still viewable by anyone you send the direct link to.
              </p>
            )}
          </div>

          <div className="mt-6">
            <div className="mx-auto flex w-full max-w-[980px] flex-col gap-3 sm:flex-row">
              <input
                id="hint-link"
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddHint();
                  }
                }}
                placeholder="Paste a URL or describe an experience..."
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
              <div className="hidden lg:grid lg:grid-cols-3 lg:gap-6">
                {loadingColumns.map((column, columnIndex) => (
                  <div key={`loading-column-${columnIndex}`} className="space-y-6">
                    {column.map((ratio, index) => (
                      <LoadingHintCard key={`${columnIndex}-${index}`} ratio={ratio} />
                    ))}
                  </div>
                ))}
              </div>
            ) : hints.length > 0 ? (
              <>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                measuring={measuring}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <div className="hidden lg:grid lg:grid-cols-3 lg:gap-6">
                  {(dragColumns || columns).map((columnHints, columnIndex) => (
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
                            imageRatios={imageRatios}
                            onEdit={openEditModal}
                            onToggleStarred={toggleStarred}
                            onTogglePrivate={togglePrivate}
                            formatCurrency={formatCurrency}
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
                        imageRatios={imageRatios}
                        onEdit={() => {}}
                        onToggleStarred={() => {}}
                        onTogglePrivate={() => {}}
                        isDragging
                        formatCurrency={formatCurrency}
                      />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
              <DndContext
                sensors={mobileSensors}
                collisionDetection={closestCenter}
                measuring={measuring}
                onDragStart={handleMobileDragStart}
                onDragOver={handleMobileDragOver}
                onDragEnd={handleMobileDragEnd}
                onDragCancel={handleDragCancel}
              >
                <div className="grid grid-cols-2 gap-3 lg:hidden">
                  {(mobileDragColumns || mobileColumns).map((col, colIndex) => (
                    <SortableContext
                      key={`mobile-column-${colIndex}`}
                      items={col.map((hint) => hint.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="flex flex-col gap-3">
                        {col.map((hint) => (
                          <SortableMobileHintCard
                            key={hint.id}
                            hint={hint}
                            imageRatios={imageRatios}
                            onEdit={openEditModal}
                            onToggleStarred={toggleStarred}
                            onTogglePrivate={togglePrivate}
                            formatCurrency={formatCurrency}
                            sharerName={currentUserName}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  ))}
                </div>
                <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.25, 1, 0.5, 1)" }}>
                  {activeHint ? (
                    <div className="w-full max-w-[220px] lg:hidden">
                      <MobileHintCard
                        hint={activeHint}
                        imageRatios={imageRatios}
                        onEdit={() => {}}
                        onToggleStarred={() => {}}
                        onTogglePrivate={() => {}}
                        formatCurrency={formatCurrency}
                      />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>

              {hints.length > visibleCount && (
                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + 60)}
                    className="h-11 rounded-full border border-[#ead8ce] bg-white px-6 text-sm font-semibold text-slate-700 hover:bg-[#fff5f0]"
                  >
                    Load more ({hints.length - visibleCount} remaining)
                  </button>
                </div>
              )}
              </>
            ) : (
              <>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event) => {
                    const { active, over } = event;
                    if (!over || active.id === over.id) return;
                    setDemoHintsOrder((current) => {
                      const oldIndex = current.findIndex((h) => h.id === active.id);
                      const newIndex = current.findIndex((h) => h.id === over.id);
                      return arrayMove(current, oldIndex, newIndex);
                    });
                  }}
                >
                  <SortableContext items={demoHintsOrder.map((h) => h.id)}>
                    <div className="hidden lg:block columns-2 gap-4 lg:columns-3">
                      {demoHintsOrder.map((hint) => (
                        <SortableDemoHintCard key={hint.id} hint={hint} imageRatios={imageRatios} formatCurrency={formatCurrency} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                <DndContext
                  sensors={mobileSensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event) => {
                    const { active, over } = event;
                    if (!over || active.id === over.id) return;
                    setDemoHintsOrder((current) => {
                      const oldIndex = current.findIndex((h) => h.id === active.id);
                      const newIndex = current.findIndex((h) => h.id === over.id);
                      return arrayMove(current, oldIndex, newIndex);
                    });
                  }}
                >
                  <SortableContext items={demoHintsOrder.map((h) => h.id)}>
                    <div className="block lg:hidden columns-2 gap-3 [&>*]:mb-3 [&>*]:break-inside-avoid">
                      {demoHintsOrder.map((hint) => (
                        <SortableDemoHintCard key={hint.id} hint={hint} imageRatios={imageRatios} formatCurrency={formatCurrency} useMobileCard />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </>
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
        imageOptions={pendingHint?.imageOptions}
        suggestExtension={
          Boolean(pendingHint?.needsReview) &&
          pendingHint?.source !== "stock-photo" &&
          isChromeFamilyBrowser() &&
          !hasExtensionInstalled()
        }
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
