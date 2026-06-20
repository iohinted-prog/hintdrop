"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
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
    priceBand: "medium",
    image:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    fallbackGradient: "from-[#d9dfcf] via-[#b9c7aa] to-[#90a27e]",
    tags: [],
    starred: true,
    private: false,
    size: "medium",
    url: "https://www.airbnb.co.uk/",
    position: 0,
  },
  {
    id: "demo-2",
    title: "Sony headphones",
    retailer: "amazon.co.uk",
    priceLabel: "About £249",
    numericPrice: 249,
    priceBand: "medium",
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80",
    fallbackGradient: "from-[#ead8ca] via-[#dbc0a8] to-[#c4a17f]",
    tags: [],
    starred: false,
    private: false,
    size: "medium",
    url: "https://www.amazon.co.uk/",
    position: 1,
  },
  {
    id: "demo-3",
    title: "Silk pillowcases",
    retailer: "johnlewis.com",
    priceLabel: "About £45",
    numericPrice: 45,
    priceBand: "small",
    image:
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
    fallbackGradient: "from-[#efe5de] via-[#e5d2c8] to-[#d1b2a4]",
    tags: [],
    starred: false,
    private: true,
    size: "small",
    url: "https://www.johnlewis.com/",
    position: 2,
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

function isValidHttpUrl(value = "") {
  try {
    const withProtocol =
      value.startsWith("http://") || value.startsWith("https://")
        ? value
        : `https://${value}`;
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

function getSizeFromPrice(price) {
  if (price == null || price <= 100) return "small";
  if (price <= 1000) return "medium";
  return "large";
}

function getPriceBand(price) {
  return getSizeFromPrice(price);
}

function getAspectRatio(size) {
  if (size === "large") return "1 / 1.7";
  if (size === "medium") return "1 / 1.35";
  return "1 / 1";
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
      <div className="w-full max-w-[560px] rounded-[30px] bg-white p-6 shadow-[0_28px_80px_rgba(75,45,30,0.18)] sm:p-7">
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
            className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 hover:bg-[#faf6f3]"
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
              className="h-14 w-full rounded-[18px] bg-[#fcfaf8] px-5 text-[15px] text-slate-700 outline-none ring-1 ring-[#eadcd3] focus:ring-2 focus:ring-[#f19a78]/50"
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
              className="h-14 w-full rounded-[18px] bg-[#fcfaf8] px-5 text-[15px] text-slate-700 outline-none ring-1 ring-[#eadcd3] focus:ring-2 focus:ring-[#f19a78]/50"
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onToggleStarred}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                hint.starred
                  ? "bg-[#fff2ea] text-[#e27956]"
                  : "bg-[#f7f2ee] text-slate-700 hover:bg-[#f1ebe6]"
              }`}
            >
              {hint.starred ? "★ Starred" : "★ Star"}
            </button>

            <button
              type="button"
              onClick={onTogglePrivate}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                hint.private
                  ? "bg-[#fffaf7] text-[#e08a67]"
                  : "bg-[#f7f2ee] text-slate-700 hover:bg-[#f1ebe6]"
              }`}
            >
              {hint.private ? "🔒 Private" : "🔓 Public"}
            </button>
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-12 items-center justify-center rounded-full bg-[#fff4ef] px-5 text-sm font-semibold text-[#d56949] hover:bg-[#ffe9df]"
          >
            Delete hint
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onRefreshFromLink}
              disabled={isRefreshing}
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#f7f2ee] px-5 text-sm font-semibold text-slate-700 hover:bg-[#f1ebe6] disabled:opacity-60"
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
      className={`group relative w-full overflow-hidden rounded-[30px] bg-white transition-all duration-300 ${
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
            <div className={`absolute inset-0 bg-gradient-to-br ${hint.fallbackGradient} ${hint.private ? "opacity-80" : ""}`} />
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(22,18,16,0.70)] via-[rgba(22,18,16,0.16)] to-transparent" />
          </>
        )}
      </div>

      <div className="absolute left-4 right-4 top-4 z-10 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="flex cursor-grab active:cursor-grabbing items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-700 backdrop-blur-sm"
            title="Drag to reorder"
            {...dragHandleAttributes}
            {...dragHandleListeners}
          >
            ⋮⋮ Drag
          </button>

          {hint.starred && (
            <div className="rounded-full bg-[#fff2ea] px-3 py-1 text-[11px] font-semibold text-[#e27956]">
              Top pick
            </div>
          )}

          {hint.private && (
            <div className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-700 backdrop-blur-sm">
              Private
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(hint)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/78 text-[15px] text-slate-500 backdrop-blur-sm hover:text-slate-800"
            aria-label="Edit hint"
          >
            ✎
          </button>

          <button
            onClick={() => onToggleStarred(hint)}
            className={`flex h-10 w-10 items-center justify-center rounded-full bg-white/78 text-[16px] backdrop-blur-sm ${
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
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              hint.priceBand === "large"
                ? "bg-[#2f3b2d] text-white"
                : hint.priceBand === "medium"
                ? "bg-[#fff1e9] text-[#df7c59]"
                : "bg-[#f1f5ec] text-[#627f53]"
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
            className="rounded-full bg-white/85 px-3 py-1.5 text-[12px] font-medium text-slate-700 backdrop-blur-sm hover:bg-white"
          >
            {hint.private ? "🔒 Private" : "🔓 Public"}
          </button>
          <a
            href={hint.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-white/85 px-3 py-1.5 text-[12px] font-medium text-slate-700 backdrop-blur-sm hover:bg-white"
          >
            Open
          </a>
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
  } = useSortable({
    id: hint.id,
    transition: {
      duration: 220,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="w-full">
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
  const [editForm, setEditForm] = useState({ title: "", url: "" });
  const [isRefreshingEdit, setIsRefreshingEdit] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
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
          priceBand: getPriceBand(row.numeric_price),
          image: row.image_url || "",
          fallbackGradient: buildFallbackGradient(index),
          tags: [],
          starred: Boolean(row.starred),
          private: Boolean(row.is_private),
          size: getSizeFromPrice(row.numeric_price),
          url: row.url || "",
          position: row.position ?? index,
        }))
      );

      setIsLoading(false);
    }

    loadHints();
  }, [currentUser]);

  async function persistOrder(nextHints) {
    if (!currentUser) return;

    const supabase = createClient();

    await Promise.all(
      nextHints.map((hint, index) =>
        supabase
          .from("hints")
          .update({
            position: index,
            size: hint.size,
          })
          .eq("id", hint.id)
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
    if (!isValidHttpUrl(trimmed)) {
      setError("Please enter a valid URL.");
      return;
    }

    setIsRefreshingEdit(true);
    setError("");

    try {
      const response = await fetch("/api/link-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: normaliseInputUrl(trimmed) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data && data.error ? data.error : "Could not refresh this link.");
      }

      const numericPrice =
        typeof data.numericPrice === "number"
          ? data.numericPrice
          : extractNumericPrice(data.priceText);

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
            size: getSizeFromPrice(numericPrice),
            image:
              typeof data.image === "string" && data.image.startsWith("http")
                ? data.image
                : hint.image,
            url: data.url || normaliseInputUrl(trimmed),
          };
        })
      );

      setEditForm((current) => ({
        ...current,
        title: refreshedTitle,
        url: data.url || normaliseInputUrl(trimmed),
      }));
    } catch (err) {
      setError(err && err.message ? err.message : "Could not refresh this link.");
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

    if (!isValidHttpUrl(trimmed)) {
      setError("Please paste a valid product or experience URL.");
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
        body: JSON.stringify({ url: normaliseInputUrl(trimmed) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data && data.error ? data.error : "Could not extract this link.");
      }

      const numericPrice =
        typeof data.numericPrice === "number"
          ? data.numericPrice
          : extractNumericPrice(data.priceText);

      const retailer = data.siteName || normaliseRetailer(trimmed);
      const shortTitle = shortenTitle(data.title || "Saved hint", retailer);

      const tempId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `hint-${Date.now()}`;

      const newHint = {
        id: tempId,
        title: shortTitle,
        retailer,
        priceLabel: formatPriceLabel(numericPrice, data.priceText),
        numericPrice,
        priceBand: getPriceBand(numericPrice),
        image:
          typeof data.image === "string" && data.image.startsWith("http")
            ? data.image
            : "",
        fallbackGradient: buildFallbackGradient(hints.length),
        tags: [],
        starred: false,
        private: false,
        size: getSizeFromPrice(numericPrice),
        url: data.url || normaliseInputUrl(trimmed),
        position: hints.length,
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
        position: newHint.position,
        size: newHint.size,
        source: "user",
      });

      if (error) {
        throw new Error(error.message || "Could not save this hint.");
      }

      setHints((current) => [newHint, ...current]);
      setLink("");
    } catch (err) {
      setError(err && err.message ? err.message : "Could not extract this link.");
    } finally {
      setIsAdding(false);
    }
  }

  function handleDragStart(event) {
    setActiveId(event.active.id);
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = hints.findIndex((hint) => hint.id === active.id);
    const newIndex = hints.findIndex((hint) => hint.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const nextHints = arrayMove(hints, oldIndex, newIndex).map((hint, index) => ({
      ...hint,
      position: index,
    }));

    setHints(nextHints);
    await persistOrder(nextHints);
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  const hasRealHints = hints.length > 0;
  const visibleHints = hasRealHints ? hints : demoHints;
  const editingHint = visibleHints.find((h) => h.id === editingHintId) || null;
  const activeHint = visibleHints.find((h) => h.id === activeId) || null;

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
              <Link href="/feed" className="inline-flex h-11 items-center justify-center rounded-full bg-white px-4 text-[14px] font-semibold text-slate-700 hover:bg-[#fff5f0] sm:px-5">Feed</Link>
              <Link href="/hints" className="inline-flex h-11 items-center justify-center rounded-full bg-[#2f3b2d] px-4 text-[14px] font-semibold text-white sm:px-5">Hints</Link>
              <Link href="/circles" className="inline-flex h-11 items-center justify-center rounded-full bg-white px-4 text-[14px] font-semibold text-slate-700 hover:bg-[#fff5f0] sm:px-5">Circles</Link>
              <Link href="/shop" className="inline-flex h-11 items-center justify-center rounded-full bg-white px-4 text-[14px] font-semibold text-slate-700 hover:bg-[#fff5f0] sm:px-5">Shop</Link>
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
                className="h-[72px] w-full rounded-full bg-white px-8 text-[16px] text-slate-700 outline-none ring-1 ring-[#eadcd3] focus:ring-2 focus:ring-[#f19a78]/50"
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
                We’ll pull the title, image, and price from the link, then you can edit it any time.
              </p>
            )}
          </div>
        </section>

        <section className="mt-12">
          <div className="relative rounded-[36px] bg-[#fffdfb] p-3 sm:p-5">
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
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-full overflow-hidden rounded-[30px] bg-[#f9f8f5]"
                    style={{ aspectRatio: i === 1 ? "1 / 1.35" : "1 / 1" }}
                  >
                    <div className="skeleton h-full w-full" />
                  </div>
                ))}
              </div>
            ) : hasRealHints ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <SortableContext
                  items={hints.map((hint) => hint.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="relative grid grid-cols-1 gap-6 md:grid-cols-3">
                    {hints.map((hint) => (
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
                    <div className="w-[min(92vw,420px)]">
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
              <div className="relative grid grid-cols-1 gap-6 md:grid-cols-3">
                {demoHints.map((hint) => (
                  <div key={hint.id} className="w-full">
                    <HintCard
                      hint={hint}
                      onEdit={() => {}}
                      onToggleStarred={() => {}}
                      onTogglePrivate={() => {}}
                      isDragging={false}
                    />
                  </div>
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
          if (editingHint) togglePrivate(editingHint);
        }}
        onToggleStarred={() => {
          if (editingHint) toggleStarred(editingHint);
        }}
        isRefreshing={isRefreshingEdit}
        isSaving={isSavingEdit}
        hint={editingHint}
      />
    </main>
  );
}
