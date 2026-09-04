"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import { shuffleProducts } from "../../lib/products";
import BoardPreviewGrid from "../components/BoardPreviewGrid";
import { useCurrencyFormatter } from "../../lib/useCurrencyFormatter";
import HintImage from "../components/HintImage";

const CARD_MIN_HEIGHT = "220px";

const INTEREST_OPTIONS = [
  "Home",
  "Food",
  "Beauty",
  "Tech",
  "Travel",
  "Wellness",
  "Books",
  "Fashion",
  "Experiences",
  "Music",
  "Gaming",
  "Kids",
  "Hobbies",
  "Other",
];

const OCCASION_OPTIONS = [
  "Birthday",
  "Christmas",
  "Anniversary",
  "Valentine's Day",
  "Mother's Day",
  "Father's Day",
  "Thank you",
  "New baby",
  "Housewarming",
  "Wedding",
  "Graduation",
  "Just because",
];

const RELATIONSHIP_OPTIONS = [
  "Partner",
  "Boyfriend",
  "Girlfriend",
  "Husband",
  "Wife",
  "Father",
  "Mother",
  "Parent",
  "Brother",
  "Sister",
  "Sibling",
  "Son",
  "Child",
  "Friend",
  "Colleague",
  "Family",
  "For him",
  "For her",
];

const PRICE_BAND_OPTIONS = [
  { label: "Up to £25", max: 25 },
  { label: "Up to £50", max: 50 },
  { label: "Up to £100", max: 100 },
  { label: "Up to £250", max: 250 },
  { label: "Up to £500", max: 500 },
  { label: "Up to £1000", max: 1000 },
  { label: "£1000+", max: Infinity, min: 1000 },
];

function errorToMessage(value) {
  if (!value) return "Something went wrong.";
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message || "Something went wrong.";
  if (typeof value === "object") {
    if (typeof value.message === "string" && value.message.trim()) return value.message;
    if (typeof value.error === "string" && value.error.trim()) return value.error;
  }
  return String(value);
}

function getTagArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);

  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function getProfileInterestTags(profile) {
  const candidates = [
    profile?.interests,
    profile?.interest_tags,
    profile?.onboarding_interests,
    profile?.gift_interests,
  ];

  for (const candidate of candidates) {
    const parsed = getTagArray(candidate);
    if (parsed.length) return parsed;
  }

  return [];
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
  if (!value) return null;

  const cleaned = String(value).replace(/,/g, "");
  const match = cleaned.match(/(\d+(\.\d{1,2})?)/);

  if (!match) return null;

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function getOutboundUrl(product) {
  const affiliate = String(product?.affiliate_url || "").trim();
  const productUrl = String(product?.product_url || "").trim();
  return affiliate || productUrl || "";
}

function buildHintInsertPayload(product, userId, boardId) {
  const outboundUrl = getOutboundUrl(product);
  const parsedNumericPrice =
    typeof product?.numeric_price === "number"
      ? product.numeric_price
      : extractNumericPrice(product?.price_text);

  return {
    user_id: userId,
    board_id: boardId || null,
    title: product?.title?.trim() || "Saved from shop",
    url: outboundUrl,
    image_url: product?.image_url || "",
    source: "shop",
    is_private: false,
    retailer: product?.retailer || normaliseRetailer(outboundUrl),
    price_text: product?.price_text || "",
    numeric_price: parsedNumericPrice,
    starred: false,
    position: 0,
  };
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

function getDisplayPrice(product, formatCurrency) {
  const numericPrice =
    typeof product?.numeric_price === "number"
      ? Number(product.numeric_price)
      : extractNumericPrice(product?.price_text);

  if (typeof numericPrice === "number" && Number.isFinite(numericPrice)) {
    return formatCurrency(numericPrice, product?.currency || "GBP");
  }

  return product?.price_text || "Price unavailable";
}

function ShopCard({
  product,
  imageRatios,
  onAddToHints,
  onViewItem,
  isSavingHint,
  isOpeningLink,
  formatCurrency,
  onImageError,
}) {
  const [showModal, setShowModal] = useState(false);
  const [justShared, setJustShared] = useState(false);
  const interestTags = getTagArray(product.interest_tags);
  const occasionTags = getTagArray(product.occasion_tags);
  const displayTags = [...interestTags.slice(0, 1), ...occasionTags.slice(0, 1)].slice(0, 2);
  const displayPrice = getDisplayPrice(product, formatCurrency);
  const retailerLabel = product.retailer || normaliseRetailer(getOutboundUrl(product));

  const rawRatio = imageRatios[product.id];
  const cardAspectRatio = rawRatio && Number.isFinite(rawRatio) ? Math.min(0.85, rawRatio) : 0.85;

  async function handleShare(e) {
    e.stopPropagation();
    const url = getOutboundUrl(product);
    const shareData = { title: product.title || "Gift idea", text: displayPrice ? `${product.title} — ${displayPrice}` : product.title, url };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch {}
      return;
    }
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        setJustShared(true);
        setTimeout(() => setJustShared(false), 1500);
      } catch {}
    }
  }

  return (
    <>
      <article
        className="group relative flex w-full flex-col overflow-hidden rounded-[22px] border border-[#f0dfd6] bg-white cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
        style={{ aspectRatio: cardAspectRatio }}
        onClick={() => setShowModal(true)}
      >
        <div className="relative w-full flex-1 overflow-hidden bg-[#fdf5f0]">
          {product.image_url ? (
            <HintImage
              src={product.image_url}
              alt={product.title || "Gift idea"}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              fallbackClassName="hidden"
              onError={() => onImageError?.(product.id)}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#ead8ca] via-[#dbc0a8] to-[#c4a17f]" />
          )}
          <button
            type="button"
            onClick={handleShare}
            aria-label="Share"
            title="Share"
            className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-slate-600 shadow-sm backdrop-blur-md transition hover:bg-white"
          >
            {justShared ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            )}
          </button>
        </div>

        <div className="shrink-0 p-3">
          <h3 className="text-[13px] font-semibold tracking-[-0.02em] text-slate-900 leading-tight line-clamp-1">
            {product.title || "Gift idea"}
          </h3>

          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-[11px] text-slate-400">{retailerLabel}</p>
            <div className="shrink-0 rounded-full border border-[#f0a384] bg-[#fff4ee] px-2.5 py-0.5 text-[10px] font-semibold text-[#df7b59]">
              {displayPrice}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddToHints(product);
              }}
              disabled={isSavingHint}
              className="flex-1 h-8 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-2 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSavingHint ? "Adding..." : "Add to hints"}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onViewItem(product);
              }}
              disabled={isOpeningLink}
              className="flex-1 h-8 rounded-full border border-[#ead8ce] px-2 text-[11px] font-semibold text-slate-600 hover:bg-[#fff5f0] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isOpeningLink ? "Opening..." : "View item"}
            </button>
          </div>
        </div>
      </article>

      {showModal && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 backdrop-blur-sm min-[480px]:items-center min-[480px]:px-4"
          style={{ animation: "fadeIn 0.15s ease" }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-[480px] rounded-t-[28px] min-[480px]:rounded-[28px] bg-[#fffaf7] border border-[#efdcd2] shadow-xl overflow-y-auto"
            style={{ maxHeight: "92dvh", animation: "slideUp 0.2s ease" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end px-4 pt-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="h-8 w-8 flex items-center justify-center rounded-full border border-[#ead8ce] text-slate-400 text-lg"
              >
                ✕
              </button>
            </div>
            <div className="relative">
              {product.image_url ? (
                <HintImage src={product.image_url} alt={product.title || "Gift idea"} width={480} height={360} className="w-full h-auto" style={{ objectFit: "contain" }} />
              ) : (
                <div className="w-full bg-gradient-to-br from-[#ead8ca] via-[#dbc0a8] to-[#c4a17f] flex items-center justify-center text-6xl" style={{ height: "200px" }}>🎁</div>
              )}
            </div>
            <div className="p-5">
              <p className="text-[18px] font-semibold text-slate-900 leading-tight mb-1">{product.title || "Gift idea"}</p>
              {retailerLabel && <p className="text-[13px] text-slate-400 mb-1">{retailerLabel}</p>}
              <p className="text-[15px] font-bold text-[#df7b59] mb-4">{displayPrice}</p>
              {displayTags.length > 0 && (
                <div className="flex gap-1 flex-wrap mb-4">
                  {displayTags.map((tag) => (
                    <span
                      key={`${product.id}-modal-${tag}`}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#fff4ee] text-[#df7b59]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onAddToHints(product);
                  }}
                  disabled={isSavingHint}
                  className="flex-1 h-11 rounded-full border border-[#ead8ce] bg-white text-[13px] font-semibold text-slate-700 disabled:opacity-70"
                >
                  {isSavingHint ? "Adding..." : "Add to hints"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onViewItem(product);
                  }}
                  disabled={isOpeningLink}
                  className="flex-1 h-11 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[13px] font-semibold text-white flex items-center justify-center shadow-lg disabled:opacity-70"
                >
                  {isOpeningLink ? "Opening..." : "View item →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ShopSkeleton() {
  return (
    <div className="columns-1 gap-6 md:columns-2 xl:columns-3">
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div key={item} className="mb-6 break-inside-avoid">
          <div
            className="w-full overflow-hidden rounded-[30px] border border-[rgba(255,255,255,0.14)] bg-[#f9f8f5]"
            style={{ aspectRatio: item % 2 ? 0.82 : 1.02, maxHeight: "min(540px, 68vh)" }}
          >
            <div className="h-full w-full animate-pulse bg-[#f2ebe5]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ selectedOccasion, selectedInterests, onClear }) {
  const occasionLabel = selectedOccasion || "all occasions";

  return (
    <div className="rounded-[30px] border border-dashed border-[#e6d7cd] bg-white px-6 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fff1e9] text-xl text-[#df7c59]">
        ✦
      </div>

      <h3 className="mt-4 text-[22px] font-semibold tracking-[-0.04em] text-slate-900">
        Nothing matched just yet
      </h3>

      <p className="mx-auto mt-3 max-w-[40ch] text-[14px] leading-7 text-slate-500">
        We could not find anything for {occasionLabel}
        {selectedInterests.length ? ` with ${selectedInterests.join(", ")}` : ""}. Try clearing one
        of the filters and the gift picks will widen again.
      </p>

      <button
        type="button"
        onClick={onClear}
        className="mt-5 inline-flex h-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-[#fff5f0]"
      >
        Clear filters
      </button>
    </div>
  );
}


function ShopGuide() {
  const [open, setOpen] = useState(false);
  const steps = [
    { label: "1. Browse", color: "bg-[#fff4ee] text-[#df7b59]", text: "Gifts are filtered by the interests you choose and the occasion you are shopping for." },
    { label: "2. Save", color: "bg-[#eef4ff] text-[#5676b3]", text: "Add good finds into hints so they can be used later across personal planning and circle gifting flows." },
    { label: "3. View item", color: "bg-[#edf6eb] text-[#4a7a3a]", text: "View item opens the retailer in a new tab using the affiliate link when one is available." },
  ];
  return (
    <div>
      <button type="button" onClick={() => setOpen(p => !p)}
        className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#df7b59] hover:text-[#b14f43] transition">
        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#f0a384] text-[11px]">?</span>
        How Shop works
        <span className="text-[10px]">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-[12px] font-semibold text-slate-700">Curated first, off-site second</p>
          {steps.map(s => (
            <div key={s.label} className="rounded-[18px] bg-[#faf7f4] p-4">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.color}`}>{s.label}</span>
              <p className="mt-2 text-[13px] leading-6 text-slate-600">{s.text}</p>
            </div>
          ))}
          <div className="rounded-[18px] bg-[#fffaf7] p-4">
            <p className="text-[12px] font-semibold text-slate-900">Built to stay aligned</p>
            <p className="mt-1 text-[13px] leading-6 text-slate-500">Shop keeps the same gifting language as the rest of the app, so saved items can move naturally into hints and later into a shared pot flow.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ShopPage() {
  const supabase = createClient();
  const { formatCurrency } = useCurrencyFormatter();

  const [currentUser, setCurrentUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [savingHintId, setSavingHintId] = useState("");
  const [openingLinkId, setOpeningLinkId] = useState("");
  // Board picker for Add to hints - hints now live in boards (separate
  // lists), and a hint saved with no board_id doesn't show up under any
  // of them (confirmed: /hints/[boardId] queries filter .eq("board_id",
  // boardId), which a NULL board_id never matches). Shop's Add to hints
  // previously inserted with no board_id at all, so the hint "worked"
  // (real row, real success toast) but was then genuinely invisible
  // everywhere in the Hints UI - not a bug in the insert itself, a gap
  // left over from before boards existed.
  const [boardPickerProduct, setBoardPickerProduct] = useState(null);
  const [userBoards, setUserBoards] = useState([]);
  const [boardsLoading, setBoardsLoading] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const toastTimerRef = useRef(null);
  const [selectedOccasion, setSelectedOccasion] = useState("");
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [selectedRelationship, setSelectedRelationship] = useState("");
  const [selectedPriceBand, setSelectedPriceBand] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  // Mobile-only - same reasoning as GiftShopClient.jsx's identical state:
  // defaults collapsed so search + this toggle is all that sits above the
  // product grid on narrow screens, instead of the full filter panel.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount =
    (selectedOccasion ? 1 : 0) +
    (selectedRelationship ? 1 : 0) +
    (selectedPriceBand ? 1 : 0) +
    selectedInterests.length;
  const [imageRatios, setImageRatios] = useState({});
  const [brokenImageIds, setBrokenImageIds] = useState(() => new Set());

  const handleImageError = useCallback((productId) => {
    setBrokenImageIds((current) => {
      if (current.has(productId)) return current;
      const next = new Set(current);
      next.add(productId);
      return next;
    });
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        setIsLoading(true);
        setPageError("");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!active) return;

        setCurrentUser(user || null);

        if (user) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

          if (!active) return;

          const profileInterests = getProfileInterestTags(profileData);
          if (profileInterests.length) {
            setSelectedInterests(profileInterests.slice(0, 4));
          }
        }

        const response = await fetch("/api/products", { cache: "no-store" });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load shop products.");
        }

        if (!active) return;

        setProducts(shuffleProducts(Array.isArray(data?.products) ? data.products : []));
        setIsLoading(false);
      } catch (error) {
        if (!active) return;
        setPageError(errorToMessage(error));
        setProducts([]);
        setIsLoading(false);
      }
    }

    bootstrap();

    return () => {
      active = false;
    };
  }, [supabase]);

  const measuredIdsRef = useRef(new Set());

  useEffect(() => {
    let cancelled = false;

    async function measureRatios() {
      const itemsWithImages = products.filter(
        (product) => product.image_url && !measuredIdsRef.current.has(product.id)
      );

      if (!itemsWithImages.length) return;

      for (const product of itemsWithImages) {
        measuredIdsRef.current.add(product.id);
      }

      const nextEntries = await Promise.all(
        itemsWithImages.map(async (product) => {
          const ratio = await loadImageAspectRatio(product.image_url);
          return [product.id, ratio];
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
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return [...products]
      .filter((product) => {
        const interestTags = getTagArray(product.interest_tags);
        const occasionTags = getTagArray(product.occasion_tags);
        const relationshipTags = getTagArray(product.relationship_tags);

        const matchesInterest =
          selectedInterests.length === 0 ||
          selectedInterests.some((interest) => interestTags.includes(interest));

        const matchesOccasion = !selectedOccasion || occasionTags.includes(selectedOccasion);

        const matchesRelationship =
          !selectedRelationship || relationshipTags.includes(selectedRelationship);

        const productPrice =
          typeof product.numeric_price === "number"
            ? product.numeric_price
            : extractNumericPrice(product.price_text);

        const priceBand = PRICE_BAND_OPTIONS.find((band) => band.label === selectedPriceBand);
        const matchesPrice =
          !priceBand ||
          (typeof productPrice === "number" &&
            productPrice <= priceBand.max &&
            (priceBand.min === undefined || productPrice > priceBand.min));

        const searchable = [
          product.title,
          product.retailer,
          product.short_note,
          product.primary_category,
          product.subcategory,
          ...interestTags,
          ...occasionTags,
          ...relationshipTags,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesQuery = !query || searchable.includes(query);

        return matchesInterest && matchesOccasion && matchesRelationship && matchesPrice && matchesQuery;
      })
      .sort((a, b) => {
        const interestCountA = getTagArray(a.interest_tags).filter((tag) =>
          selectedInterests.includes(tag)
        ).length;

        const interestCountB = getTagArray(b.interest_tags).filter((tag) =>
          selectedInterests.includes(tag)
        ).length;

        // Was priceA - priceB as a tiebreaker, which meant every visit
        // (interests selected or not - with none selected every item
        // ties on interest count) collapsed straight back to price-
        // ascending order, undoing the shuffle above and clustering
        // similarly-priced items (games, in practice) together every
        // single time. Returning 0 here relies on Array.prototype.sort
        // being a stable sort (guaranteed by spec since ES2019) to
        // preserve the already-shuffled order among ties, instead of
        // re-imposing a fixed price order.
        return interestCountB - interestCountA;
      });
  }, [products, searchQuery, selectedInterests, selectedOccasion, selectedRelationship, selectedPriceBand]);

  const visibleProducts = useMemo(
    () => filteredProducts.filter((product) => !brokenImageIds.has(product.id)),
    [filteredProducts, brokenImageIds]
  );

  function toggleInterest(interest) {
    setSelectedInterests((current) => {
      if (current.includes(interest)) {
        return current.filter((item) => item !== interest);
      }

      return [...current, interest].slice(0, 5);
    });
  }

  function clearFilters() {
    setSelectedInterests([]);
    setSelectedOccasion("");
    setSelectedRelationship("");
    setSelectedPriceBand("");
    setSearchQuery("");
  }

  async function loadUserBoards(userId) {
    setBoardsLoading(true);
    const { data: boardRows } = await supabase
      .from("hint_boards")
      .select("id, title, is_default, is_private")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });

    const boardsWithPreviews = await Promise.all(
      (boardRows || []).map(async (board) => {
        const [{ count }, { data: previewHints }] = await Promise.all([
          supabase.from("hints").select("id", { count: "exact", head: true }).eq("board_id", board.id),
          supabase.from("hints").select("image_url").eq("board_id", board.id).order("position", { ascending: true }).limit(4),
        ]);
        return { ...board, hintCount: count || 0, previewHints: previewHints || [] };
      })
    );

    setUserBoards(boardsWithPreviews);
    setBoardsLoading(false);
  }

  async function handleAddToHints(product) {
    if (!currentUser?.id) {
      setPageError("You must be signed in to save something from Shop.");
      return;
    }

    setBoardPickerProduct(product);
    // Boards rarely change mid-session, but re-fetching on each open (
    // rather than once and caching) means a board created a moment ago
    // in another tab, or via the inline "New list" field just below,
    // always shows up without needing extra invalidation logic.
    loadUserBoards(currentUser.id);
  }

  async function confirmAddToBoard(boardId) {
    const product = boardPickerProduct;
    if (!product || !currentUser?.id) return;

    setSavingHintId(product.id);
    setPageError("");
    setSuccessMessage("");
    setBoardPickerProduct(null);

    try {
      // Shop product images are sourced at whatever the original catalog
      // ingestion happened to grab - confirmed directly some of these are
      // genuinely poor (one PlayStation product's stored "image" is
      // literally a favicon, not a product photo at all; others use a
      // deliberately small CDN preset intended for a grid thumbnail, not
      // a larger hint card). Try a live refetch from the retailer's own
      // page using the same scraping logic already proven for pasted
      // URLs (JSON-LD extraction, generic-asset filtering) before
      // falling back to whatever the shop already has stored - bounded
      // to 18s so a slow or blocked retailer never holds up the save -
      // widened from an initial 8s once the server-side scraper also
      // started checking each candidate image's actual pixel dimensions
      // (up to ~5s per candidate, occasionally checking more than one),
      // which needed more headroom than the original budget allowed.
      let refetchedImage = null;
      const scrapeUrl = String(product?.product_url || "").trim() || getOutboundUrl(product);
      try {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 18000);
        const res = await fetch("/api/link-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: scrapeUrl }),
          signal: controller.signal,
        });
        window.clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          if (data?.image && typeof data.image === "string" && data.image.startsWith("http")) {
            refetchedImage = data.image;
          }
        }
      } catch {
        // Refetch failed or timed out - fall through and use the shop's
        // own stored image below, same as before this change existed.
      }

      const productForInsert = refetchedImage ? { ...product, image_url: refetchedImage } : product;
      const payload = buildHintInsertPayload(productForInsert, currentUser.id, boardId);
      const { error } = await supabase.from("hints").insert(payload);

      if (error) throw error;

      setSuccessMessage(`Added "${product.title || "item"}" to your hints.`);
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setSuccessMessage(""), 3200);
    } catch (error) {
      setPageError(errorToMessage(error));
    } finally {
      setSavingHintId("");
    }
  }

  async function createBoardAndAdd() {
    const title = newBoardTitle.trim();
    if (!title || !currentUser?.id) return;

    setIsCreatingBoard(true);
    try {
      const { data: newBoard, error } = await supabase
        .from("hint_boards")
        .insert({ user_id: currentUser.id, title, is_default: false, is_private: false })
        .select("id")
        .single();

      if (error) throw error;

      setNewBoardTitle("");
      await confirmAddToBoard(newBoard.id);
    } catch (error) {
      setPageError(errorToMessage(error));
    } finally {
      setIsCreatingBoard(false);
    }
  }

  async function handleViewItem(product) {
    const existingAffiliateUrl = String(product?.affiliate_url || "").trim();
    const destinationUrl = String(product?.product_url || "").trim();

    if (existingAffiliateUrl) {
      window.open(existingAffiliateUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (!destinationUrl) {
      setPageError("No product URL is available for this item.");
      return;
    }

    setOpeningLinkId(product.id);
    setPageError("");

    try {
      const response = await fetch("/api/affiliate-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destinationUrl,
          network: product?.network || "manual",
          campaignId: product?.campaign_id || null,
          product: {
            id: product?.id,
            network: product?.network,
            campaign_id: product?.campaign_id,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to create affiliate link.");
      }

      const finalUrl = data?.url || destinationUrl;
      window.open(finalUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setPageError(errorToMessage(error));
    } finally {
      setOpeningLinkId("");
    }
  }

  return (
    <main className="min-h-screen bg-[#fffaf7] text-slate-800">

      <div className="mx-auto max-w-[1380px] px-5 py-8 md:px-8">
        {pageError ? (
          <div className="mb-5 rounded-[22px] border border-[#efc0ba] bg-[#fff4f2] px-4 py-3 text-sm text-[#b14f43]">
            {pageError}
          </div>
        ) : null}

        {successMessage ? (
          <div
            className="fixed inset-x-0 bottom-6 z-[120] flex justify-center px-4"
            style={{ animation: "slideUp 0.2s ease" }}
          >
            <div className="flex items-center gap-2 rounded-full border border-[#d8e8d3] bg-[#f3fbf1] px-5 py-3 text-sm font-semibold text-[#3a7d55] shadow-[0_12px_32px_rgba(58,125,85,0.2)]">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#4a7a3a] text-[11px] text-white">✓</span>
              {successMessage}
            </div>
          </div>
        ) : null}

        <section className="rounded-[34px] border border-[#eeddd3] bg-[#fff7f2] p-4 shadow-[0_18px_60px_rgba(173,101,72,0.10)] sm:p-5">
          <div className="rounded-[28px] border border-[#f1dfd6] bg-white p-5 sm:p-6">
            <div className="min-w-0">
                <div className="inline-flex rounded-full bg-[#fff4ee] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#e37b57]">
                  Curated gifting
                </div>

                <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.06em] text-slate-900 sm:text-[40px]">
                  Shop thoughtful gift ideas, then save the good ones to hints.
                </h1>

                <p className="mt-3 hidden max-w-[760px] text-[15px] leading-7 text-slate-600 sm:block">
                  Curated around the people and occasions that matter most. When you find something right, open it on the retailer's site or save it straight to your hints for later.
                </p>

                <p className="mt-2 text-[12px] text-slate-400">
                  Some links may be affiliate links. If you buy through them, HintDrop may earn a commission at no extra cost to you.
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search gifts, retailers, interests, or occasions"
                    className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
                  />

                  <button
                    type="button"
                    onClick={() => setFiltersOpen((v) => !v)}
                    className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm font-semibold text-slate-700 sm:hidden"
                  >
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#ff875d] px-1 text-[11px] font-bold text-white">
                        {activeFilterCount}
                      </span>
                    )}
                    <span className="text-[10px]">{filtersOpen ? "▲" : "▼"}</span>
                  </button>

                  <select
                    value={selectedOccasion}
                    onChange={(event) => setSelectedOccasion(event.target.value)}
                    className={`${filtersOpen ? "flex" : "hidden"} h-12 min-w-[190px] rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e] sm:flex`}
                  >
                    <option value="">All occasions</option>
                    {OCCASION_OPTIONS.map((occasion) => (
                      <option key={occasion} value={occasion}>
                        {occasion}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedRelationship}
                    onChange={(event) => setSelectedRelationship(event.target.value)}
                    className={`${filtersOpen ? "flex" : "hidden"} h-12 min-w-[190px] rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e] sm:flex`}
                  >
                    <option value="">Who's it for?</option>
                    {RELATIONSHIP_OPTIONS.map((relationship) => (
                      <option key={relationship} value={relationship}>
                        {relationship}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedPriceBand}
                    onChange={(event) => setSelectedPriceBand(event.target.value)}
                    className={`${filtersOpen ? "flex" : "hidden"} h-12 min-w-[150px] rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e] sm:flex`}
                  >
                    <option value="">Any price</option>
                    {PRICE_BAND_OPTIONS.map((band) => (
                      <option key={band.label} value={band.label}>
                        {band.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={`${filtersOpen ? "flex" : "hidden"} mt-5 flex-wrap gap-2 sm:flex`}>
                  {INTEREST_OPTIONS.map((interest) => {
                    const selected = selectedInterests.includes(interest);

                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`inline-flex h-11 items-center justify-center rounded-full border px-4 text-sm font-semibold transition ${
                          selected
                            ? "border-[#bfe4cf] bg-[#e3f5ea] text-[#2f8a5f]"
                            : "border-[#ead8ce] bg-white text-slate-700 hover:bg-[#fff5f0]"
                        }`}
                      >
                        {interest}
                      </button>
                    );
                  })}
                </div>
              <div className="mt-5">
                <ShopGuide />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <div className="relative rounded-[36px] border border-[#efe0d7] bg-[#fffdfb] p-3 shadow-[0_12px_32px_rgba(176,118,86,0.08)] sm:p-5">
            <div className="relative">
              {isLoading ? (
                <ShopSkeleton />
              ) : visibleProducts.length ? (
                <div className="columns-2 gap-4 md:columns-3 md:gap-6 xl:columns-4">
                  {visibleProducts.map((product) => (
                    <div key={product.id} className="mb-4 break-inside-avoid md:mb-6">
                      <ShopCard
                        product={product}
                        imageRatios={imageRatios}
                        onAddToHints={handleAddToHints}
                        onViewItem={handleViewItem}
                        isSavingHint={savingHintId === product.id}
                        isOpeningLink={openingLinkId === product.id}
                        formatCurrency={formatCurrency}
                        onImageError={handleImageError}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  selectedOccasion={selectedOccasion}
                  selectedInterests={selectedInterests}
                  onClear={clearFilters}
                />
              )}
            </div>
          </div>
        </section>
      </div>

      {boardPickerProduct && (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 backdrop-blur-sm min-[480px]:items-center min-[480px]:px-4"
          style={{ animation: "fadeIn 0.15s ease" }}
          onClick={() => setBoardPickerProduct(null)}
        >
          <div
            className="w-full max-w-[480px] rounded-t-[28px] min-[480px]:rounded-[28px] bg-[#fffaf7] border border-[#efdcd2] shadow-xl overflow-hidden"
            style={{ maxHeight: "80dvh", animation: "slideUp 0.2s ease" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#f2e5de]">
              <p className="text-[15px] font-semibold text-slate-900">Add to which list?</p>
              <button
                type="button"
                onClick={() => setBoardPickerProduct(null)}
                className="h-8 w-8 flex items-center justify-center rounded-full border border-[#ead8ce] text-slate-400"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto p-4 space-y-2" style={{ maxHeight: "calc(80dvh - 130px)" }}>
              {boardsLoading ? (
                <p className="text-sm text-slate-400 text-center py-6">Loading your lists...</p>
              ) : userBoards.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">You don&apos;t have any hint lists yet — create one below.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {userBoards.map((board) => (
                    <button
                      key={board.id}
                      type="button"
                      onClick={() => confirmAddToBoard(board.id)}
                      className="text-left"
                    >
                      <div className="aspect-square overflow-hidden rounded-[16px] border border-[#f0dfd6] bg-[#fdf5f0] p-0.5 transition hover:border-[#e8c9bc]">
                        <BoardPreviewGrid previewHints={board.previewHints} />
                      </div>
                      <p className="mt-1.5 truncate text-[13px] font-semibold text-slate-800">
                        {board.is_private && <span title="Private">🔒 </span>}
                        {board.title}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-[#f2e5de] p-4">
              <input
                type="text"
                value={newBoardTitle}
                onChange={(e) => setNewBoardTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && newBoardTitle.trim()) createBoardAndAdd(); }}
                placeholder="New list name"
                className="h-11 flex-1 min-w-0 rounded-[16px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
              />
              <button
                type="button"
                onClick={createBoardAndAdd}
                disabled={!newBoardTitle.trim() || isCreatingBoard}
                className="h-11 shrink-0 rounded-[16px] bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isCreatingBoard ? "Creating..." : "Create & add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
