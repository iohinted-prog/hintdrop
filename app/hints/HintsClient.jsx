"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";

const initialHints = [
  {
    id: 1,
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
  },
  {
    id: 2,
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
  },
  {
    id: 3,
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
  },
  {
    id: 4,
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
  },
  {
    id: 5,
    title: "Kindle reader",
    retailer: "amazon.co.uk",
    priceLabel: "About £159",
    numericPrice: 159,
    priceBand: "premium",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80",
    fallbackGradient: "from-[#d5dbee] via-[#b3c0df] to-[#8f9fc9]",
    tags: ["Books", "Everyday"],
    starred: false,
    private: false,
    size: "portrait",
    url: "https://www.amazon.co.uk/",
  },
  {
    id: 6,
    title: "Art print",
    retailer: "etsy.com",
    priceLabel: "About £38",
    numericPrice: 38,
    priceBand: "small",
    image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=80",
    fallbackGradient: "from-[#eadce8] via-[#d8bfd1] to-[#bb9ab6]",
    tags: ["Home", "Art"],
    starred: false,
    private: false,
    size: "square",
    url: "https://www.etsy.com/",
  },
  {
    id: 7,
    title: "Casserole dish",
    retailer: "johnlewis.com",
    priceLabel: "About £89",
    numericPrice: 89,
    priceBand: "mid",
    image: "https://images.unsplash.com/photo-1584990347449-ae7ad4ee2d62?auto=format&fit=crop&w=1200&q=80",
    fallbackGradient: "from-[#d9d1cb] via-[#bcaea1] to-[#8a7566]",
    tags: ["Cooking", "Home"],
    starred: false,
    private: false,
    size: "portrait",
    url: "https://www.johnlewis.com/",
  },
  {
    id: 8,
    title: "Coffee set",
    retailer: "hasbean.co.uk",
    priceLabel: "About £62",
    numericPrice: 62,
    priceBand: "mid",
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
    fallbackGradient: "from-[#d6e7eb] via-[#b5ced7] to-[#8fb3c5]",
    tags: ["Coffee", "Home"],
    starred: false,
    private: true,
    size: "square",
    url: "https://www.hasbean.co.uk/",
  },
];

function LogoMark() {
  return (
    <div className="relative flex h-11 w-11 items-center justify-center rounded-[16px] bg-gradient-to-b from-[#ffa47f] to-[#ff875d] text-white shadow-lg">
      <span className="text-lg">🎁</span>
    </div>
  );
}

function AvatarMenu() {
  const supabase = createClient();
  const [avatarUrl, setAvatarUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadAvatar() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user || !isActive) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (!isActive) return;

      const resolvedName =
        profile?.full_name ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email ||
        "";

      const resolvedAvatar =
        profile?.avatar_url ||
        user?.user_metadata?.avatar_url ||
        user?.user_metadata?.picture ||
        "";

      setDisplayName(resolvedName);
      setEmail(user.email || "");
      setAvatarUrl(resolvedAvatar);
    }

    loadAvatar();

    return () => {
      isActive = false;
    };
  }, [supabase]);

  const initials =
    (displayName || email)
      .split(/\s+|@|[._-]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U";

  return (
    <div className="relative group">
      <button
        className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-[#efcdbf] to-[#bb8168] text-sm font-bold text-white ring-4 ring-white/70"
        aria-label="Open account menu"
        type="button"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName ? `${displayName}'s profile` : "Profile"}
            className="h-full w-full object-cover"
          />
        ) : (
          initials
        )}
      </button>

      <div className="invisible absolute right-0 top-[calc(100%+10px)] z-20 w-56 translate-y-1 rounded-[22px] border border-[#ecdcd2] bg-white p-2 opacity-0 shadow-[0_18px_45px_rgba(123,84,64,0.14)] transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        <Link
          href="/account"
          className="block rounded-[16px] px-4 py-3 text-sm text-slate-700 hover:bg-[#faf6f3]"
        >
          Accounts
        </Link>
        <Link
          href="/billing"
          className="block rounded-[16px] px-4 py-3 text-sm text-slate-700 hover:bg-[#faf6f3]"
        >
          Billing
        </Link>
        <Link
          href="/settings"
          className="block rounded-[16px] px-4 py-3 text-sm text-slate-700 hover:bg-[#faf6f3]"
        >
          Settings
        </Link>
      </div>
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
  isRefreshing,
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
              className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-6 text-sm font-semibold text-white shadow-lg"
            >
              Save changes
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
      draggable
      onDragStart={() => setDraggedIndex(index)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        moveHint(draggedIndex, index);
      }}
      onDragEnd={() => setDraggedIndex(null)}
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
              <div className="rounded-full bg-white/78 px-3 py-1 text-[11px] font-semibold text-slate-700 backdrop-blur-sm">
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
              <div className="flex items-center justify-end">
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
  const [hints, setHints] = useState(initialHints);
  const [link, setLink] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [editingHintId, setEditingHintId] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", url: "" });
  const [isRefreshingEdit, setIsRefreshingEdit] = useState(false);

  const numericPrices = useMemo(
    () => hints.map((hint) => hint.numericPrice).filter((value) => typeof value === "number"),
    [hints]
  );

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
  }

  function saveEditChanges() {
    const trimmedTitle = editForm.title.trim();
    const trimmedUrl = editForm.url.trim();

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

    closeEditModal();
  }

  function deleteHint() {
    setHints((current) => current.filter((hint) => hint.id !== editingHintId));
    closeEditModal();
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

      setHints((current) =>
        current.map((hint) => {
          if (hint.id !== editingHintId) return hint;

          const numericPrice = extractNumericPrice(data.price);
          const refreshedTitle = shortenTitle(
            data.title || editForm.title || hint.title,
            data.siteName || normaliseRetailer(trimmed)
          );

          return {
            ...hint,
            title: refreshedTitle,
            retailer: data.siteName || normaliseRetailer(trimmed),
            priceLabel: formatPriceLabel(numericPrice, data.price),
            numericPrice,
            priceBand: getPriceBand(numericPrice),
            image: typeof data.image === "string" && data.image.startsWith("http") ? data.image : hint.image,
            url: data.url || trimmed,
          };
        })
      );

      setEditForm((current) => ({
        ...current,
        title: shortenTitle(data.title || current.title, data.siteName || normaliseRetailer(trimmed)),
        url: data.url || trimmed,
      }));
    } catch (err) {
      setError(err.message || "Could not refresh this link.");
    } finally {
      setIsRefreshingEdit(false);
    }
  }

  async function handleAddHint() {
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

      const numericPrice = extractNumericPrice(data.price);
      const size = getSizeFromPrice(
        numericPrice,
        [...numericPrices, ...(numericPrice != null ? [numericPrice] : [])]
      );

      const retailer = data.siteName || normaliseRetailer(trimmed);
      const shortTitle = shortenTitle(data.title || "Saved hint", retailer);

      const newHint = {
        id: Date.now(),
        title: shortTitle,
        retailer,
        priceLabel: formatPriceLabel(numericPrice, data.price),
        numericPrice,
        priceBand: getPriceBand(numericPrice),
        image: typeof data.image === "string" && data.image.startsWith("http") ? data.image : "",
        fallbackGradient: buildFallbackGradient(hints.length),
        tags: ["Added from link"],
        starred: false,
        private: false,
        size: size === "square" ? "portrait" : size,
        url: data.url || trimmed,
      };

      setHints((current) => [newHint, ...current]);
      setLink("");
    } catch (err) {
      setError(err.message || "Could not extract this link.");
    } finally {
      setIsAdding(false);
    }
  }

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
            Paste a hint to begin...
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
                disabled={isAdding}
                className="inline-flex h-[72px] shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-8 text-sm font-semibold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-70 sm:min-w-[170px]"
              >
                {isAdding ? "Adding..." : "Add hint"}
              </button>
            </div>

            {error ? (
              <p className="mt-3 text-sm font-medium text-[#c45c42]">{error}</p>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                We’ll pull the title, image, and price from the link, then you can edit it any time.
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

            <div className="relative grid auto-rows-[46px] grid-cols-1 gap-6 md:grid-cols-12">
              {hints.map((hint, index) => (
                <HintTile
                  key={hint.id}
                  hint={hint}
                  index={index}
                  draggedIndex={draggedIndex}
                  setDraggedIndex={setDraggedIndex}
                  moveHint={moveHint}
                  onEdit={openEditModal}
                />
              ))}
            </div>
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
        isRefreshing={isRefreshingEdit}
      />
    </main>
  );
}
