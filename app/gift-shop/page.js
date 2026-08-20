"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PublicShell from "../components/PublicShell";
import AuthModal from "../components/AuthModal";
import { useCurrencyFormatter } from "../../lib/useCurrencyFormatter";
import HintImage from "../components/HintImage";

const INTEREST_OPTIONS = [
  "Home", "Food", "Beauty", "Tech", "Travel", "Wellness",
  "Books", "Fashion", "Experiences", "Music", "Gaming", "Kids", "Hobbies", "Other",
];

const OCCASION_OPTIONS = [
  "Birthday", "Christmas", "Anniversary", "Valentine's Day", "Mother's Day",
  "Father's Day", "Thank you", "New baby", "Housewarming", "Wedding",
  "Graduation", "Just because",
];

const RELATIONSHIP_OPTIONS = [
  "Partner", "Boyfriend", "Girlfriend", "Husband", "Wife", "Father", "Mother", "Parent",
  "Brother", "Sister", "Sibling", "Son", "Child", "Friend", "Colleague", "Family", "For him", "For her",
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
    return value.split(",").map((item) => item.trim()).filter(Boolean);
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

function GiftCard({ product, imageRatios, onViewItem, isOpeningLink, formatCurrency, onImageError, onRequestSignIn }) {
  const [showModal, setShowModal] = useState(false);
  const interestTags = getTagArray(product.interest_tags);
  const occasionTags = getTagArray(product.occasion_tags);
  const displayTags = [...interestTags.slice(0, 1), ...occasionTags.slice(0, 1)].slice(0, 2);
  const displayPrice = getDisplayPrice(product, formatCurrency);
  const retailerLabel = product.retailer || normaliseRetailer(getOutboundUrl(product));

  const rawRatio = imageRatios[product.id];
  const cardAspectRatio = rawRatio && Number.isFinite(rawRatio) ? Math.min(0.85, rawRatio) : 0.85;

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
              onClick={(e) => { e.stopPropagation(); onViewItem(product); }}
              disabled={isOpeningLink}
              className="flex-1 h-8 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-2 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isOpeningLink ? "Opening..." : "View item"}
            </button>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRequestSignIn(); }}
              className="flex-1 h-8 rounded-full border border-[#ead8ce] px-2 text-[11px] font-semibold text-slate-600 hover:bg-[#fff5f0]"
            >
              Sign in to save
            </button>
          </div>
        </div>
      </article>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          style={{ animation: "fadeIn 0.15s ease" }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-[480px] rounded-t-[28px] bg-[#fffaf7] border border-[#efdcd2] shadow-xl overflow-y-auto"
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
                <div className="w-full bg-gradient-to-br from-[#ead8ca] via-[#dbc0a8] to-[#c4a17f]" style={{ height: "200px" }} />
              )}
            </div>
            <div className="p-5">
              <p className="text-[18px] font-semibold text-slate-900 leading-tight mb-1">{product.title || "Gift idea"}</p>
              {retailerLabel && <p className="text-[13px] text-slate-400 mb-1">{retailerLabel}</p>}
              <p className="text-[15px] font-bold text-[#df7b59] mb-4">{displayPrice}</p>
              {displayTags.length > 0 && (
                <div className="flex gap-1 flex-wrap mb-4">
                  {displayTags.map((tag) => (
                    <span key={`${product.id}-modal-${tag}`} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#fff4ee] text-[#df7b59]">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => onRequestSignIn()}
                  className="flex-1 h-11 rounded-full border border-[#ead8ce] bg-white text-[13px] font-semibold text-slate-700"
                >
                  Sign in to save
                </button>
                <button
                  type="button"
                  onClick={() => onViewItem(product)}
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

function GiftShopSkeleton() {
  return (
    <div className="columns-2 gap-4 md:columns-3 md:gap-6 xl:columns-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
        <div key={item} className="mb-4 break-inside-avoid md:mb-6">
          <div
            className="w-full overflow-hidden rounded-[22px] border border-[#f0dfd6] bg-[#f9f8f5]"
            style={{ aspectRatio: item % 2 ? 0.82 : 1.02 }}
          >
            <div className="h-full w-full animate-pulse bg-[#f2ebe5]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onClear }) {
  return (
    <div className="rounded-[30px] border border-dashed border-[#e6d7cd] bg-white px-6 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fff1e9] text-xl text-[#df7c59]">
        ✦
      </div>
      <h3 className="mt-4 text-[22px] font-semibold tracking-[-0.04em] text-slate-900">
        Nothing matched just yet
      </h3>
      <p className="mx-auto mt-3 max-w-[40ch] text-[14px] leading-7 text-slate-500">
        Try clearing one of the filters and the gift picks will widen again.
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
    { label: "2. Sign in to save", color: "bg-[#eef4ff] text-[#5676b3]", text: "Create a free account to save good finds to your hints for later." },
    { label: "3. View item", color: "bg-[#edf6eb] text-[#4a7a3a]", text: "View item opens the retailer in a new tab using the affiliate link when one is available." },
  ];
  return (
    <div>
      <button type="button" onClick={() => setOpen(p => !p)}
        className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#df7b59] hover:text-[#b14f43] transition">
        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#f0a384] text-[11px]">?</span>
        How the Gift Shop works
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
        </div>
      )}
    </div>
  );
}

export default function GiftShopPage() {
  const { formatCurrency } = useCurrencyFormatter();
  const [authOpen, setAuthOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [openingLinkId, setOpeningLinkId] = useState("");
  const [selectedOccasion, setSelectedOccasion] = useState("");
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [selectedRelationship, setSelectedRelationship] = useState("");
  const [selectedPriceBand, setSelectedPriceBand] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
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
    fetch("/api/products", { cache: "no-store" })
      .then(r => r.json())
      .then(data => { setProducts(Array.isArray(data?.products) ? data.products : []); setIsLoading(false); })
      .catch((error) => { setPageError(errorToMessage(error)); setIsLoading(false); });
  }, []);

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

    return () => { cancelled = true; };
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
        const matchesRelationship = !selectedRelationship || relationshipTags.includes(selectedRelationship);

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
          product.title, product.retailer, product.short_note, product.primary_category, product.subcategory,
          ...interestTags, ...occasionTags, ...relationshipTags,
        ].filter(Boolean).join(" ").toLowerCase();

        const matchesQuery = !query || searchable.includes(query);

        return matchesInterest && matchesOccasion && matchesRelationship && matchesPrice && matchesQuery;
      })
      .sort((a, b) => {
        const priceA = typeof a.numeric_price === "number" ? a.numeric_price : extractNumericPrice(a.price_text) || 0;
        const priceB = typeof b.numeric_price === "number" ? b.numeric_price : extractNumericPrice(b.price_text) || 0;

        const interestCountA = getTagArray(a.interest_tags).filter((tag) => selectedInterests.includes(tag)).length;
        const interestCountB = getTagArray(b.interest_tags).filter((tag) => selectedInterests.includes(tag)).length;

        if (interestCountA !== interestCountB) return interestCountB - interestCountA;
        return priceA - priceB;
      });
  }, [products, searchQuery, selectedInterests, selectedOccasion, selectedRelationship, selectedPriceBand]);

  const visibleProducts = useMemo(
    () => filteredProducts.filter((product) => !brokenImageIds.has(product.id)),
    [filteredProducts, brokenImageIds]
  );

  function toggleInterest(interest) {
    setSelectedInterests((current) => {
      if (current.includes(interest)) return current.filter((item) => item !== interest);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationUrl,
          network: product?.network || "manual",
          campaignId: product?.campaign_id || null,
          product: { id: product?.id, network: product?.network, campaign_id: product?.campaign_id },
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to create affiliate link.");

      const finalUrl = data?.url || destinationUrl;
      window.open(finalUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setPageError(errorToMessage(error));
    } finally {
      setOpeningLinkId("");
    }
  }

  return (
    <PublicShell>
      <div className="mx-auto max-w-[1380px] px-5 py-8 md:px-8">
        {pageError ? (
          <div className="mb-5 rounded-[22px] border border-[#efc0ba] bg-[#fff4f2] px-4 py-3 text-sm text-[#b14f43]">
            {pageError}
          </div>
        ) : null}

        <section className="rounded-[34px] border border-[#eeddd3] bg-[#fff7f2] p-4 shadow-[0_18px_60px_rgba(173,101,72,0.10)] sm:p-5">
          <div className="rounded-[28px] border border-[#f1dfd6] bg-white p-5 sm:p-6">
            <div className="min-w-0">
              <div className="inline-flex rounded-full bg-[#fff4ee] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#e37b57]">
                Curated gifting
              </div>

              <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.06em] text-slate-900 sm:text-[40px]">
                The Gift Shop
              </h1>

              <p className="mt-3 max-w-[760px] text-[15px] leading-7 text-slate-600">
                Curated gifts for everyone. Create a free HintDrop account to save your favourites to a wishlist.
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

                <select
                  value={selectedOccasion}
                  onChange={(event) => setSelectedOccasion(event.target.value)}
                  className="h-12 min-w-[190px] rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
                >
                  <option value="">All occasions</option>
                  {OCCASION_OPTIONS.map((occasion) => (
                    <option key={occasion} value={occasion}>{occasion}</option>
                  ))}
                </select>

                <select
                  value={selectedRelationship}
                  onChange={(event) => setSelectedRelationship(event.target.value)}
                  className="h-12 min-w-[190px] rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
                >
                  <option value="">Who's it for?</option>
                  {RELATIONSHIP_OPTIONS.map((relationship) => (
                    <option key={relationship} value={relationship}>{relationship}</option>
                  ))}
                </select>

                <select
                  value={selectedPriceBand}
                  onChange={(event) => setSelectedPriceBand(event.target.value)}
                  className="h-12 min-w-[150px] rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
                >
                  <option value="">Any price</option>
                  {PRICE_BAND_OPTIONS.map((band) => (
                    <option key={band.label} value={band.label}>{band.label}</option>
                  ))}
                </select>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((interest) => {
                  const selected = selectedInterests.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      className={`inline-flex h-11 items-center justify-center rounded-full border px-4 text-sm font-semibold transition ${
                        selected
                          ? "border-[#3c4d39] bg-[#2f3b2d] text-white"
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
                <GiftShopSkeleton />
              ) : visibleProducts.length ? (
                <div className="columns-2 gap-4 md:columns-3 md:gap-6 xl:columns-4">
                  {visibleProducts.map((product) => (
                    <div key={product.id} className="mb-4 break-inside-avoid md:mb-6">
                      <GiftCard
                        product={product}
                        imageRatios={imageRatios}
                        onViewItem={handleViewItem}
                        isOpeningLink={openingLinkId === product.id}
                        formatCurrency={formatCurrency}
                        onImageError={handleImageError}
                        onRequestSignIn={() => setAuthOpen(true)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState onClear={clearFilters} />
              )}
            </div>
          </div>
        </section>

        {/* Sign in CTA */}
        <div className="mt-16 text-center py-10 rounded-[28px] bg-[#fff5f0] border border-[#f0dfd6]">
          <p className="text-[18px] font-semibold text-slate-900 mb-2">Save gifts to your wishlist</p>
          <p className="text-[14px] text-slate-500 mb-5">Create a free HintDrop account to save hints and share with the people who buy for you.</p>
          <button type="button" onClick={() => setAuthOpen(true)} className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-semibold bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-white shadow-sm">
            Get started free
          </button>
        </div>
      </div>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </PublicShell>
  );
}
