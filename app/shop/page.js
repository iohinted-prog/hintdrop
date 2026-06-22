"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { createClient } from "../../../lib/supabase/client";
import AvatarMenu from "../components/AvatarMenu";

const ACTIVE_CURRENCY = "GBP";

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
];

const OCCASION_OPTIONS = [
  "Birthday",
  "Anniversary",
  "Thank you",
  "New baby",
  "Housewarming",
  "Wedding",
  "Graduation",
  "Just because",
];

const demoProducts = [
  {
    id: "demo-1",
    title: "Stoneware pasta bowls",
    retailer: "johnlewis.com",
    price_text: "£42",
    numeric_price: 42,
    image_url:
      "https://images.unsplash.com/photo-1517705008128-361805f42e86?auto=format&fit=crop&w=1200&q=80",
    product_url: "https://www.johnlewis.com/",
    affiliate_url: "",
    tag: "Home",
    interest_tags: ["Home"],
    occasion_tags: ["Housewarming", "Birthday"],
    short_note: "A warm, easy gift for people who love hosting.",
    is_active: true,
    source_type: "curated",
  },
  {
    id: "demo-2",
    title: "Leather-bound travel journal",
    retailer: "papier.com",
    price_text: "£28",
    numeric_price: 28,
    image_url:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80",
    product_url: "https://www.papier.com/",
    affiliate_url: "",
    tag: "Travel",
    interest_tags: ["Travel", "Books"],
    occasion_tags: ["Birthday", "Graduation"],
    short_note: "Great for someone planning a trip or a new chapter.",
    is_active: true,
    source_type: "curated",
  },
  {
    id: "demo-3",
    title: "Wireless bedside speaker",
    retailer: "selfridges.com",
    price_text: "£95",
    numeric_price: 95,
    image_url:
      "https://images.unsplash.com/photo-1507878866276-a947ef722fee?auto=format&fit=crop&w=1200&q=80",
    product_url: "https://www.selfridges.com/",
    affiliate_url: "",
    tag: "Tech",
    interest_tags: ["Tech", "Home"],
    occasion_tags: ["Birthday", "Just because"],
    short_note: "A polished upgrade gift that still feels personal.",
    is_active: true,
    source_type: "curated",
  },
  {
    id: "demo-4",
    title: "Spa evening for two",
    retailer: "buyagift.co.uk",
    price_text: "£79",
    numeric_price: 79,
    image_url:
      "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80",
    product_url: "https://www.buyagift.co.uk/",
    affiliate_url: "",
    tag: "Experiences",
    interest_tags: ["Wellness", "Experiences"],
    occasion_tags: ["Anniversary", "Thank you"],
    short_note: "Best when a physical item feels too predictable.",
    is_active: true,
    source_type: "curated",
  },
  {
    id: "demo-5",
    title: "Silk sleep set",
    retailer: "lookfantastic.com",
    price_text: "£54",
    numeric_price: 54,
    image_url:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80",
    product_url: "https://www.lookfantastic.com/",
    affiliate_url: "",
    tag: "Beauty",
    interest_tags: ["Beauty", "Wellness"],
    occasion_tags: ["Birthday", "Thank you"],
    short_note: "A premium-feeling pick that still lands as practical.",
    is_active: true,
    source_type: "curated",
  },
  {
    id: "demo-6",
    title: "Coffee tasting set",
    retailer: "fortnumandmason.com",
    price_text: "£36",
    numeric_price: 36,
    image_url:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
    product_url: "https://www.fortnumandmason.com/",
    affiliate_url: "",
    tag: "Food",
    interest_tags: ["Food", "Home"],
    occasion_tags: ["Housewarming", "Thank you"],
    short_note: "A safe but elevated gift for easy wins.",
    is_active: true,
    source_type: "curated",
  },
];

function LogoMark() {
  return (
    <div className="relative flex h-11 w-11 items-center justify-center rounded-[16px] bg-gradient-to-b from-[#ffa47f] to-[#ff875d] text-white shadow-lg">
      <span className="text-lg">H</span>
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

function detectCurrency(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;
  if (text.includes("£")) return "GBP";
  if (text.includes("€")) return "EUR";
  if (text.includes("$") && !text.includes("A$") && !text.includes("C$") && !text.includes("NZ$")) return "USD";
  if (/A\$/i.test(text)) return "AUD";
  if (/NZ\$/i.test(text)) return "NZD";
  if (/C\$/i.test(text)) return "CAD";
  if (/R\s?\d/i.test(text)) return "ZAR";
  return null;
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

function formatPriceLabel(price, rawPrice, currency = ACTIVE_CURRENCY) {
  if (rawPrice && typeof rawPrice === "string" && rawPrice.trim()) return rawPrice;
  if (price == null) return "Price unavailable";

  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: price % 1 === 0 ? 0 : 2,
    }).format(Number(price));
  } catch {
    return `£${Math.round(Number(price))}`;
  }
}

function getInterestArray(value) {
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
    const parsed = getInterestArray(candidate);
    if (parsed.length) return parsed;
  }

  return [];
}

function getOutboundUrl(product) {
  const affiliate = String(product?.affiliate_url || "").trim();
  const productUrl = String(product?.product_url || "").trim();
  return affiliate || productUrl || "";
}

function matchScore(product, selectedInterests, selectedOccasion) {
  const interestTags = getInterestArray(product?.interest_tags);
  const occasionTags = getInterestArray(product?.occasion_tags);

  let score = 0;

  if (selectedInterests.length) {
    const overlap = interestTags.filter((tag) => selectedInterests.includes(tag)).length;
    score += overlap * 3;
  }

  if (selectedOccasion && occasionTags.includes(selectedOccasion)) {
    score += 2;
  }

  if (!selectedInterests.length && !selectedOccasion) {
    score += 1;
  }

  return score;
}

function buildHintInsertPayload(product, userId) {
  const outboundUrl = getOutboundUrl(product);
  const parsedNumericPrice =
    typeof product?.numeric_price === "number"
      ? product.numeric_price
      : extractNumericPrice(product?.price_text);

  return {
    userid: userId,
    title: product?.title?.trim() || "Saved from shop",
    url: outboundUrl,
    imageurl: product?.image_url || "",
    retailer: product?.retailer || normaliseRetailer(outboundUrl),
    pricetext: formatPriceLabel(
      parsedNumericPrice,
      product?.price_text,
      detectCurrency(product?.price_text) || ACTIVE_CURRENCY
    ),
    numericprice: parsedNumericPrice,
    starred: false,
    isprivate: false,
    position: 0,
    source: "shop",
  };
}

function ShopProductCard({ product, onAddToHints, isSavingId }) {
  const outboundUrl = getOutboundUrl(product);
  const isSaving = isSavingId === product.id;

  return (
    <article className="group overflow-hidden rounded-[30px] border border-[#f0dfd6] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#f7efe9]">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#f3ddd2] via-[#ecc7b7] to-[#d6a18e]" />
        )}

        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {product.tag ? (
            <span className="inline-flex rounded-full border border-[#ffd8c9] bg-[#fff2ea] px-3 py-1 text-[11px] font-semibold text-[#e27956]">
              {product.tag}
            </span>
          ) : null}

          {product.source_type === "curated" ? (
            <span className="inline-flex rounded-full border border-[#efe0d7] bg-white/85 px-3 py-1 text-[11px] font-semibold text-slate-600 backdrop-blur">
              Curated
            </span>
          ) : null}
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[22px] font-semibold tracking-[-0.04em] text-slate-900">
              {product.title || "Gift idea"}
            </h3>
            <p className="mt-1 text-[13px] text-slate-500">
              {product.retailer || normaliseRetailer(outboundUrl)}
            </p>
          </div>

          <div className="shrink-0 rounded-full border border-[#ffd8c9] bg-[#fff1e9] px-3 py-1 text-[11px] font-semibold text-[#df7c59]">
            {formatPriceLabel(
              product.numeric_price,
              product.price_text,
              detectCurrency(product.price_text) || ACTIVE_CURRENCY
            )}
          </div>
        </div>

        {product.short_note ? (
          <p className="mt-3 text-[14px] leading-7 text-slate-600">{product.short_note}</p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          {getInterestArray(product.interest_tags)
            .slice(0, 3)
            .map((tag) => (
              <span
                key={`${product.id}-${tag}`}
                className="inline-flex rounded-full border border-[#efe0d7] bg-[#faf6f3] px-3 py-1 text-[11px] font-semibold text-slate-600"
              >
                {tag}
              </span>
            ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onAddToHints(product)}
            disabled={isSaving}
            className="inline-flex h-11 items-center justify-center rounded-full border border-[#ee8d69] bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-5 text-sm font-semibold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? "Adding..." : "Add to hints"}
          </button>

          <a
            href={outboundUrl || "#"}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className={`inline-flex h-11 items-center justify-center rounded-full border px-5 text-sm font-semibold transition ${
              outboundUrl
                ? "border-[#ead8ce] bg-white text-slate-700 hover:bg-[#fff5f0]"
                : "pointer-events-none border-[#efe0d7] bg-[#f7f2ee] text-slate-400"
            }`}
          >
            View item
          </a>
        </div>
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[30px] border border-dashed border-[#e6d7cd] bg-white px-6 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fff1e9] text-xl text-[#df7c59]">
        ✦
      </div>
      <h3 className="mt-4 text-[22px] font-semibold tracking-[-0.04em] text-slate-900">
        Nothing matched just yet
      </h3>
      <p className="mx-auto mt-3 max-w-[38ch] text-[14px] leading-7 text-slate-500">
        Try a different interest or occasion and the curated gift picks will reshuffle.
      </p>
    </div>
  );
}

export default function ShopPage() {
  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [savingHintId, setSavingHintId] = useState("");
  const [selectedOccasion, setSelectedOccasion] = useState("Birthday");
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

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

        if (!user) {
          setProducts(demoProducts);
          setIsLoading(false);
          return;
        }

        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (!active) return;
        setProfile(profileData || null);

        const profileInterests = getProfileInterestTags(profileData);
        if (profileInterests.length) {
          setSelectedInterests(profileInterests.slice(0, 3));
        }

        const { data: shopRows, error: shopError } = await supabase
          .from("shop_products")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (shopError) throw shopError;
        if (!active) return;

        if (Array.isArray(shopRows) && shopRows.length) {
          setProducts(shopRows);
        } else {
          setProducts(demoProducts);
        }

        setIsLoading(false);
      } catch (error) {
        if (!active) return;
        setPageError(error?.message || "We couldn't load the shop right now.");
        setProducts(demoProducts);
        setIsLoading(false);
      }
    }

    bootstrap();

    return () => {
      active = false;
    };
  }, [supabase]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return [...products]
      .filter((product) => {
        const searchable = [
          product.title,
          product.retailer,
          product.short_note,
          ...getInterestArray(product.interest_tags),
          ...getInterestArray(product.occasion_tags),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!query) return true;
        return searchable.includes(query);
      })
      .sort((a, b) => {
        const scoreA = matchScore(a, selectedInterests, selectedOccasion);
        const scoreB = matchScore(b, selectedInterests, selectedOccasion);

        if (scoreA !== scoreB) return scoreB - scoreA;

        const priceA =
          typeof a.numeric_price === "number" ? a.numeric_price : extractNumericPrice(a.price_text) || 0;
        const priceB =
          typeof b.numeric_price === "number" ? b.numeric_price : extractNumericPrice(b.price_text) || 0;

        return priceA - priceB;
      });
  }, [products, searchQuery, selectedInterests, selectedOccasion]);

  function toggleInterest(interest) {
    setSelectedInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest].slice(0, 5)
    );
  }

  async function handleAddToHints(product) {
    if (!currentUser?.id) {
      setPageError("You must be signed in to save something from Shop.");
      return;
    }

    setSavingHintId(product.id);
    setPageError("");
    setSuccessMessage("");

    try {
      const payload = buildHintInsertPayload(product, currentUser.id);
      const { error } = await supabase.from("hints").insert(payload);

      if (error) throw error;

      setSuccessMessage("Added to hints.");
    } catch (error) {
      setPageError(error?.message || "We couldn't add that item to your hints.");
    } finally {
      setSavingHintId("");
    }
  }

  return (
    <main className="min-h-screen bg-[#fffaf7] text-slate-800">
      <Script
        id="skimlinks-loader"
        strategy="afterInteractive"
        src="https://s.skimresources.com/js/305122X1793314.skimlinks.js"
      />

      <header className="border-b border-[#efe0d7] bg-[#fffaf795] backdrop-blur">
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
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-4 text-[14px] font-semibold text-slate-700 hover:bg-[#fff5f0] sm:px-5"
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
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#3c4d39] bg-[#2f3b2d] px-4 text-[14px] font-semibold text-white sm:px-5"
              >
                Shop
              </Link>
            </nav>

            <AvatarMenu />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1380px] px-5 py-8 md:px-8">
        {pageError ? (
          <div className="mb-5 rounded-[22px] border border-[#efc0ba] bg-[#fff4f2] px-4 py-3 text-sm text-[#b14f43]">
            {pageError}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mb-5 rounded-[22px] border border-[#d8e8d3] bg-[#f3fbf1] px-4 py-3 text-sm text-[#4a7a3a]">
            {successMessage}
          </div>
        ) : null}

        <section className="rounded-[34px] border border-[#eeddd3] bg-[#fff7f2] p-4 shadow-[0_18px_60px_rgba(173,101,72,0.10)] sm:p-5">
          <div className="rounded-[28px] border border-[#f1dfd6] bg-white p-5 sm:p-6">
            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="min-w-0">
                <div className="inline-flex rounded-full bg-[#fff4ee] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#e37b57]">
                  Curated gifting
                </div>

                <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.06em] text-slate-900 sm:text-[40px]">
                  Shop thoughtful gift ideas, then save the good ones to hints.
                </h1>

                <p className="mt-3 max-w-[760px] text-[15px] leading-7 text-slate-600">
                  This shop is curated around onboarding interests and common occasions, so it feels
                  more like gift planning than a marketplace. When you find something right, send it
                  off-site to the retailer or add it straight into your hints for later.
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
                    {OCCASION_OPTIONS.map((occasion) => (
                      <option key={occasion} value={occasion}>
                        {occasion}
                      </option>
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
                        className={`inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition ${
                          selected
                            ? "border border-[#3c4d39] bg-[#2f3b2d] text-white"
                            : "border border-[#ead8ce] bg-white text-slate-700 hover:bg-[#fff5f0]"
                        }`}
                      >
                        {interest}
                      </button>
                    );
                  })}
                </div>
              </div>

              <aside className="rounded-[26px] border border-[#f0dfd6] bg-[#fffdfa] p-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  How Shop works
                </p>

                <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.04em] text-slate-900">
                  Curated first, off-site second
                </h2>

                <div className="mt-4 space-y-3">
                  <div className="rounded-[20px] bg-[#faf7f4] p-4">
                    <span className="inline-flex rounded-full bg-[#fff4ee] px-2.5 py-1 text-[11px] font-semibold text-[#df7b59]">
                      1. Browse
                    </span>
                    <p className="mt-3 text-[13px] leading-6 text-slate-600">
                      Gifts are prioritised around the interests saved in onboarding and the occasion
                      you are shopping for.
                    </p>
                  </div>

                  <div className="rounded-[20px] bg-[#faf7f4] p-4">
                    <span className="inline-flex rounded-full bg-[#eef4ff] px-2.5 py-1 text-[11px] font-semibold text-[#5676b3]">
                      2. Save
                    </span>
                    <p className="mt-3 text-[13px] leading-6 text-slate-600">
                      Add good finds into hints so they can be used later across personal planning
                      and circle gifting flows.
                    </p>
                  </div>

                  <div className="rounded-[20px] bg-[#faf7f4] p-4">
                    <span className="inline-flex rounded-full bg-[#edf6eb] px-2.5 py-1 text-[11px] font-semibold text-[#4a7a3a]">
                      3. View item
                    </span>
                    <p className="mt-3 text-[13px] leading-6 text-slate-600">
                      View item opens the retailer in a new tab using the affiliate link when one is
                      available, or the product URL when it is not.
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-[20px] bg-[#fffaf7] p-4">
                  <p className="text-sm font-semibold text-slate-900">Built to stay aligned</p>
                  <p className="mt-2 text-[13px] leading-6 text-slate-500">
                    Shop keeps the same gifting language as the rest of the app, so saved items can
                    move naturally into hints and later into a shared pot flow.
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="mt-8">
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div
                  key={item}
                  className="overflow-hidden rounded-[30px] border border-[#f0dfd6] bg-white shadow-sm"
                >
                  <div className="aspect-[4/3] animate-pulse bg-[#f4ece6]" />
                  <div className="space-y-3 p-5">
                    <div className="h-5 w-2/3 animate-pulse rounded bg-[#f4ece6]" />
                    <div className="h-4 w-1/3 animate-pulse rounded bg-[#f4ece6]" />
                    <div className="h-4 w-full animate-pulse rounded bg-[#f4ece6]" />
                    <div className="h-4 w-5/6 animate-pulse rounded bg-[#f4ece6]" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => (
                <ShopProductCard
                  key={product.id}
                  product={product}
                  onAddToHints={handleAddToHints}
                  isSavingId={savingHintId}
                />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </section>
      </div>
    </main>
  );
}
