"use client";

import { useMemo, useState } from "react";

const currencyOptions = [
  { code: "GBP", symbol: "£", label: "GBP £" },
  { code: "USD", symbol: "$", label: "USD $" },
  { code: "EUR", symbol: "€", label: "EUR €" },
];

const products = [
  {
    id: "prod-001",
    type: "product",
    title: "Silk pillowcase set",
    retailer: "John Lewis",
    brand: "John Lewis",
    network: "awin",
    advertiserId: "TBD_AWIN_JOHN_LEWIS",
    destinationUrl: "https://www.johnlewis.com/",
    affiliateUrl: "",
    image:
      "https://images.unsplash.com/photo-1616627451735-15d6c8f1fdf4?auto=format&fit=crop&w=1200&q=80",
    price: 45,
    priceLabel: "£45",
    originalPriceLabel: "",
    occasion: "Birthday",
    budget: "Under £50",
    category: "Home",
    delivery: "Standard",
    sponsored: false,
    reason: "Matches saved self-care and bedroom hints.",
    badge: "Curated",
    tile: "portrait",
  },
  {
    id: "prod-002",
    type: "product",
    title: "Kindle Paperwhite",
    retailer: "Amazon",
    brand: "Amazon",
    network: "amazon",
    advertiserId: "TBD_AMAZON_TAG",
    destinationUrl: "https://www.amazon.co.uk/",
    affiliateUrl: "",
    image:
      "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=1200&q=80",
    price: 159,
    priceLabel: "£159",
    originalPriceLabel: "",
    occasion: "Birthday",
    budget: "£100+",
    category: "Tech",
    delivery: "Next day",
    sponsored: false,
    reason: "A strong all-round gift for readers and commuters.",
    badge: "Popular",
    tile: "square",
  },
  {
    id: "prod-003",
    type: "sponsored",
    title: "Summer hosting edit",
    retailer: "Harrods",
    brand: "Harrods",
    network: "direct",
    advertiserId: "TBD_HARRODS",
    destinationUrl: "https://www.harrods.com/",
    affiliateUrl: "",
    image:
      "https://images.unsplash.com/photo-1517705008128-361805f42e86?auto=format&fit=crop&w=1200&q=80",
    price: null,
    priceLabel: "Presented by Harrods",
    originalPriceLabel: "",
    occasion: "Housewarming",
    budget: "Luxury",
    category: "Editorial",
    delivery: "Standard",
    sponsored: true,
    reason: "Elevated tableware, glassware, and finishing touches for hosts.",
    badge: "Sponsored",
    tile: "feature",
  },
  {
    id: "prod-004",
    type: "product",
    title: "Cashmere travel wrap",
    retailer: "Harrods",
    brand: "Harrods",
    network: "direct",
    advertiserId: "TBD_HARRODS",
    destinationUrl: "https://www.harrods.com/",
    affiliateUrl: "",
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80",
    price: 220,
    priceLabel: "£220",
    originalPriceLabel: "",
    occasion: "Birthday",
    budget: "Luxury",
    category: "Fashion",
    delivery: "Standard",
    sponsored: false,
    reason: "Fits premium taste and ‘buy once, keep forever’ gifting.",
    badge: "Luxury",
    tile: "portrait",
  },
  {
    id: "prod-005",
    type: "product",
    title: "Le Creuset casserole dish",
    retailer: "John Lewis",
    brand: "Le Creuset",
    network: "awin",
    advertiserId: "TBD_AWIN_JOHN_LEWIS",
    destinationUrl: "https://www.johnlewis.com/",
    affiliateUrl: "",
    image:
      "https://images.unsplash.com/photo-1584990347449-a9f55d5b4b55?auto=format&fit=crop&w=1200&q=80",
    price: 189,
    priceLabel: "£189",
    originalPriceLabel: "£215",
    occasion: "Wedding",
    budget: "£100+",
    category: "Home",
    delivery: "Standard",
    sponsored: false,
    reason: "A classic group-gift option for weddings and new homes.",
    badge: "Group gift",
    tile: "tall",
  },
  {
    id: "prod-006",
    type: "collection",
    title: "Best under £50",
    retailer: "Hinted edit",
    brand: "Multi-brand",
    network: "internal",
    advertiserId: "",
    destinationUrl: "#",
    affiliateUrl: "",
    image:
      "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=1200&q=80",
    price: null,
    priceLabel: "12 curated finds",
    originalPriceLabel: "",
    occasion: "Birthday",
    budget: "Under £50",
    category: "Editorial",
    delivery: "Mixed",
    sponsored: false,
    reason: "For easy wins that still feel personal.",
    badge: "Edit",
    tile: "feature",
  },
  {
    id: "prod-007",
    type: "product",
    title: "Espresso cup set",
    retailer: "SHOP.COM",
    brand: "Villeroy & Boch",
    network: "shopcom",
    advertiserId: "TBD_SHOPCOM",
    destinationUrl: "https://www.shop.com/",
    affiliateUrl: "",
    image:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
    price: 48,
    priceLabel: "£48",
    originalPriceLabel: "",
    occasion: "Housewarming",
    budget: "Under £50",
    category: "Home",
    delivery: "Standard",
    sponsored: false,
    reason: "A polished add for coffee lovers and first homes.",
    badge: "Just in",
    tile: "square",
  },
  {
    id: "prod-008",
    type: "product",
    title: "Weekend cabin stay",
    retailer: "Airbnb",
    brand: "Airbnb",
    network: "direct",
    advertiserId: "TBD_AIRBNB",
    destinationUrl: "https://www.airbnb.co.uk/",
    affiliateUrl: "",
    image:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    price: 320,
    priceLabel: "From £320",
    originalPriceLabel: "",
    occasion: "Anniversary",
    budget: "£100+",
    category: "Experiences",
    delivery: "Instant",
    sponsored: false,
    reason: "Best for couples and shared gifting circles.",
    badge: "Experience",
    tile: "tall",
  },
  {
    id: "prod-009",
    type: "sponsored",
    title: "Trending at John Lewis",
    retailer: "John Lewis",
    brand: "John Lewis",
    network: "awin",
    advertiserId: "TBD_AWIN_JOHN_LEWIS",
    destinationUrl: "https://www.johnlewis.com/",
    affiliateUrl: "",
    image:
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80",
    price: null,
    priceLabel: "Seasonal partner feature",
    originalPriceLabel: "",
    occasion: "Birthday",
    budget: "Mixed",
    category: "Editorial",
    delivery: "Standard",
    sponsored: true,
    reason: "A soft branded placement that still feels like curation.",
    badge: "Sponsored",
    tile: "wide",
  },
  {
    id: "prod-010",
    type: "product",
    title: "Dyson Airwrap",
    retailer: "Amazon",
    brand: "Dyson",
    network: "amazon",
    advertiserId: "TBD_AMAZON_TAG",
    destinationUrl: "https://www.amazon.co.uk/",
    affiliateUrl: "",
    image:
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80",
    price: 479,
    priceLabel: "£479",
    originalPriceLabel: "",
    occasion: "Birthday",
    budget: "Luxury",
    category: "Beauty",
    delivery: "Next day",
    sponsored: false,
    reason: "A classic big-ticket wish-list item.",
    badge: "Top wish",
    tile: "portrait",
  },
  {
    id: "prod-011",
    type: "product",
    title: "Leather weekender",
    retailer: "Harrods",
    brand: "Harrods",
    network: "direct",
    advertiserId: "TBD_HARRODS",
    destinationUrl: "https://www.harrods.com/",
    affiliateUrl: "",
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80",
    price: 350,
    priceLabel: "£350",
    originalPriceLabel: "",
    occasion: "Birthday",
    budget: "Luxury",
    category: "Fashion",
    delivery: "Standard",
    sponsored: false,
    reason: "Works for elevated travel and fashion-led profiles.",
    badge: "Luxury",
    tile: "square",
  },
  {
    id: "prod-012",
    type: "product",
    title: "Hotel Chocolat velvetiser",
    retailer: "John Lewis",
    brand: "Hotel Chocolat",
    network: "awin",
    advertiserId: "TBD_AWIN_JOHN_LEWIS",
    destinationUrl: "https://www.johnlewis.com/",
    affiliateUrl: "",
    image:
      "https://images.unsplash.com/photo-1511381939415-e44015466834?auto=format&fit=crop&w=1200&q=80",
    price: 99,
    priceLabel: "£99",
    originalPriceLabel: "",
    occasion: "Birthday",
    budget: "£50-£100",
    category: "Food",
    delivery: "Standard",
    sponsored: false,
    reason: "A playful but still premium gift for hosts and families.",
    badge: "Giftable",
    tile: "portrait",
  },
];

const brands = ["All brands", "Amazon", "John Lewis", "Harrods", "SHOP.COM", "Airbnb"];
const occasions = ["All occasions", "Birthday", "Wedding", "Anniversary", "Housewarming"];
const budgets = ["All budgets", "Under £50", "£50-£100", "£100+", "Luxury"];
const categories = ["All categories", "Home", "Fashion", "Beauty", "Tech", "Food", "Experiences", "Editorial"];
const deliverySpeeds = ["Any delivery", "Instant", "Next day", "Standard", "Mixed"];

const railPresets = [
  {
    id: "picked",
    label: "Picked for Sarah",
    apply: (setters) => {
      setters.setSearchTerm("");
      setters.setSelectedOccasion("Birthday");
      setters.setSelectedBudget("All budgets");
      setters.setSelectedCategory("All categories");
      setters.setSelectedBrand("All brands");
      setters.setSelectedDelivery("Any delivery");
      setters.setActiveRail("picked");
    },
  },
  {
    id: "under50",
    label: "Best under £50",
    apply: (setters) => {
      setters.setSearchTerm("");
      setters.setSelectedOccasion("All occasions");
      setters.setSelectedBudget("Under £50");
      setters.setSelectedCategory("All categories");
      setters.setSelectedBrand("All brands");
      setters.setSelectedDelivery("Any delivery");
      setters.setActiveRail("under50");
    },
  },
  {
    id: "luxury",
    label: "Luxury classics",
    apply: (setters) => {
      setters.setSearchTerm("");
      setters.setSelectedOccasion("All occasions");
      setters.setSelectedBudget("Luxury");
      setters.setSelectedCategory("All categories");
      setters.setSelectedBrand("All brands");
      setters.setSelectedDelivery("Any delivery");
      setters.setActiveRail("luxury");
    },
  },
  {
    id: "johnlewis",
    label: "Trending at John Lewis",
    apply: (setters) => {
      setters.setSearchTerm("");
      setters.setSelectedOccasion("All occasions");
      setters.setSelectedBudget("All budgets");
      setters.setSelectedCategory("All categories");
      setters.setSelectedBrand("John Lewis");
      setters.setSelectedDelivery("Any delivery");
      setters.setActiveRail("johnlewis");
    },
  },
  {
    id: "saved",
    label: "From your saved hints",
    apply: (setters) => {
      setters.setSearchTerm("");
      setters.setSelectedOccasion("Birthday");
      setters.setSelectedBudget("All budgets");
      setters.setSelectedCategory("Home");
      setters.setSelectedBrand("All brands");
      setters.setSelectedDelivery("Any delivery");
      setters.setActiveRail("saved");
    },
  },
];

function formatMoney(value, currencyCode) {
  if (value == null) return "";
  const config = currencyOptions.find((item) => item.code === currencyCode) || currencyOptions[0];
  const rateMap = { GBP: 1, USD: 1.28, EUR: 1.17 };
  const converted = value * (rateMap[currencyCode] || 1);

  return new Intl.NumberFormat(currencyCode === "GBP" ? "en-GB" : currencyCode === "USD" ? "en-US" : "de-DE", {
    style: "currency",
    currency: config.code,
    maximumFractionDigits: 0,
  }).format(converted);
}

function inferHintSize(price) {
  if (!price) return "Medium";
  if (price >= 180) return "Large";
  if (price <= 60) return "Small";
  return "Medium";
}

function resolveOutgoingUrl(item) {
  if (item.affiliateUrl) return item.affiliateUrl;
  return item.destinationUrl;
}

function tileClass(tile) {
  switch (tile) {
    case "feature":
      return "md:col-span-8 lg:col-span-8 min-h-[320px]";
    case "wide":
      return "md:col-span-8 lg:col-span-8 min-h-[260px]";
    case "tall":
      return "md:col-span-4 lg:col-span-4 min-h-[420px]";
    case "portrait":
      return "md:col-span-4 lg:col-span-4 min-h-[360px]";
    default:
      return "md:col-span-4 lg:col-span-4 min-h-[320px]";
  }
}

function HintedMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#ffd8c6] shadow-[0_12px_24px_rgba(233,149,109,0.25)]">
        <div className="absolute inset-[7px] rounded-[12px] bg-[#fff7f2]" />
        <div className="relative text-[18px]">🎁</div>
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#b18b77]">
          Hinted
        </p>
        <p className="text-[22px] font-semibold tracking-[-0.03em] text-[#281a15]">
          Shop
        </p>
      </div>
    </div>
  );
}

function FilterPill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm transition ${
        active
          ? "border-[#c9a55f] bg-[#f5e5b8] text-[#6b5521]"
          : "border-[#edd8cb] bg-white text-[#6c5d56] hover:border-[#e1c2ae] hover:bg-[#fff7f3]"
      }`}
    >
      {children}
    </button>
  );
}

function AddToHintsModal({
  item,
  currency,
  onClose,
  onSave,
}) {
  const [note, setNote] = useState("");
  const [visibility, setVisibility] = useState("Public");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2b1b15]/35 px-4 backdrop-blur-[6px]">
      <div className="w-full max-w-[780px] overflow-hidden rounded-[36px] border border-[#ecd8cc] bg-[#fffdfb] shadow-[0_40px_90px_rgba(61,34,23,0.22)]">
        <div className="grid gap-0 md:grid-cols-[0.95fr_1.05fr]">
          <div className="relative min-h-[320px] bg-[#f8eee8]">
            <img
              src={item.image}
              alt={item.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#2f1d15]/40 via-transparent to-transparent" />
            <div className="absolute left-5 top-5 flex gap-2">
              <span className="rounded-full bg-[#fff7f1]/95 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[#7f5b48]">
                {item.retailer}
              </span>
              {item.price ? (
                <span className="rounded-full bg-[#fff7f1]/95 px-3 py-1 text-[11px] text-[#7f5b48]">
                  {formatMoney(item.price, currency)}
                </span>
              ) : null}
            </div>
            <div className="absolute bottom-5 left-5 right-5">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#ffe9de]">
                Add to hints
              </p>
              <h3 className="mt-2 text-[28px] font-semibold leading-[1.04] tracking-[-0.03em] text-white">
                {item.title}
              </h3>
            </div>
          </div>

          <div className="p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#b18c7c]">
                  Save to your board
                </p>
                <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-[#281a15]">
                  Place this on your hints board.
                </h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-full border border-[#ead8cd] px-3 py-2 text-sm text-[#6c5d56]"
              >
                Close
              </button>
            </div>

            <p className="mt-3 text-sm leading-6 text-[#6d5f58]">
              Keep the Pinterest-style flow: save the item now, then drag it into place later on your board.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-[12px] uppercase tracking-[0.18em] text-[#a28474]">
                  Note
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Why do you want this? Add a note for your future self or your circle."
                  className="min-h-[120px] w-full rounded-[24px] border border-[#ead7ca] bg-[#fff9f5] px-4 py-4 text-sm text-[#2b1c16] outline-none placeholder:text-[#aa9387]"
                />
              </div>

              <div>
                <label className="mb-2 block text-[12px] uppercase tracking-[0.18em] text-[#a28474]">
                  Visibility
                </label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="h-12 w-full rounded-full border border-[#ead7ca] bg-white px-4 text-sm text-[#5f524b] outline-none"
                >
                  <option>Public</option>
                  <option>Private</option>
                </select>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                onClick={() =>
                  onSave({
                    ...item,
                    hintId: `hint-${Date.now()}`,
                    note,
                    visibility,
                    size: inferHintSize(item.price),
                  })
                }
                className="rounded-full bg-[#2f5d50] px-5 py-3 text-sm font-medium text-white"
              >
                Add to hints
              </button>
              <a
                href={resolveOutgoingUrl(item)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-[#e7d6ca] px-5 py-3 text-sm text-[#5f524b]"
              >
                View product
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SavedHintCard({ item, currency }) {
  const sizeClass =
    item.size === "Large"
      ? "md:col-span-6 lg:col-span-6 min-h-[320px]"
      : item.size === "Small"
      ? "md:col-span-3 lg:col-span-3 min-h-[220px]"
      : "md:col-span-4 lg:col-span-4 min-h-[250px]";

  return (
    <article
      className={`${sizeClass} group relative overflow-hidden rounded-[30px] border border-[#ecdacf] bg-white shadow-[0_14px_34px_rgba(103,65,45,0.06)]`}
      style={{
        transform:
          item.size === "Large"
            ? "rotate(-1.1deg)"
            : item.size === "Small"
            ? "rotate(0.8deg)"
            : "rotate(-0.35deg)",
      }}
    >
      <div className="aspect-[4/3] overflow-hidden bg-[#f7eee8]">
        <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
      </div>
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#fff1e8] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[#875742]">
            {item.retailer}
          </span>
          <span className="rounded-full bg-[#f6efe9] px-3 py-1 text-[11px] text-[#8d7b70]">
            {item.visibility}
          </span>
          {item.price ? (
            <span className="rounded-full bg-[#f6efe9] px-3 py-1 text-[11px] text-[#8d7b70]">
              {formatMoney(item.price, currency)}
            </span>
          ) : null}
        </div>
        <h3 className="mt-3 text-[20px] font-semibold tracking-[-0.02em] text-[#281a15]">
          {item.title}
        </h3>
        {item.note ? (
          <p className="mt-2 text-sm leading-6 text-[#6e6058]">{item.note}</p>
        ) : (
          <p className="mt-2 text-sm leading-6 text-[#9c8a80]">
            Added from Shop. Drag into place on your board later.
          </p>
        )}
      </div>
      <div className="pointer-events-none absolute right-4 top-4 rounded-full border border-[#ead8ce] bg-white/88 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#9b8376]">
        Drag
      </div>
    </article>
  );
}

function ShopTile({ item, currency, onAddToHints }) {
  const href = resolveOutgoingUrl(item);
  const isEditorial = item.type === "collection" || item.type === "sponsored";

  return (
    <div
      className={`${tileClass(item.tile)} group flex h-full flex-col overflow-hidden rounded-[30px] border border-[#efdfd6] bg-white shadow-[0_16px_40px_rgba(120,78,54,0.06)] transition hover:-translate-y-[2px] hover:shadow-[0_22px_52px_rgba(120,78,54,0.1)]`}
    >
      <div
        className={`relative ${
          item.tile === "feature"
            ? "aspect-[16/9]"
            : item.tile === "wide"
            ? "aspect-[16/8]"
            : "aspect-[4/5]"
        } overflow-hidden bg-[#f7eee7]`}
      >
        <img
          src={item.image}
          alt={item.title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2e1d15]/40 via-transparent to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-[#fff6f1]/95 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[#7d5b49]">
            {item.retailer}
          </span>
          <span className="rounded-full bg-[#fff6f1]/95 px-3 py-1 text-[11px] font-medium text-[#7d5b49]">
            {item.badge}
          </span>
          {item.sponsored ? (
            <span className="rounded-full bg-[#6f3f24] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-white">
              Sponsored
            </span>
          ) : null}
        </div>
        {item.price ? (
          <div className="absolute bottom-4 left-4 flex items-center gap-2">
            <span className="rounded-full bg-[#fffaf7]/95 px-3 py-2 text-sm font-semibold text-[#2d1c15]">
              {formatMoney(item.price, currency)}
            </span>
            {item.originalPriceLabel ? (
              <span className="rounded-full bg-[#f3e4d8]/95 px-3 py-2 text-sm text-[#8c6d5a] line-through">
                {item.originalPriceLabel}
              </span>
            ) : null}
          </div>
        ) : item.priceLabel ? (
          <div className="absolute bottom-4 left-4">
            <span className="rounded-full bg-[#fffaf7]/95 px-3 py-2 text-sm font-semibold text-[#2d1c15]">
              {item.priceLabel}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#a08879]">
            {item.category} · {item.occasion}
          </p>
          <p className="text-xs text-[#a08879]">{item.delivery}</p>
        </div>

        <h3 className="mt-3 text-[22px] font-semibold leading-[1.1] text-[#231815]">
          {item.title}
        </h3>

        <p className="mt-3 text-sm leading-6 text-[#685b54]">{item.reason}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-[#fff1e9] px-3 py-1 text-xs text-[#8a5b43]">
            Why this fits
          </span>
          <span className="rounded-full bg-[#f7f0ea] px-3 py-1 text-xs text-[#8a7b72]">
            {item.brand}
          </span>
          <span className="rounded-full bg-[#f7f0ea] px-3 py-1 text-xs text-[#8a7b72]">
            {item.budget}
          </span>
        </div>

        <div className="mt-auto flex flex-wrap gap-3 pt-5">
          <button
            onClick={() => onAddToHints(item)}
            className="rounded-full bg-[#f6d6c7] px-4 py-2.5 text-sm font-medium text-[#6f3f24]"
          >
            Add to hints
          </button>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-[#2f5d50] px-4 py-2.5 text-sm font-medium text-white"
          >
            View product
          </a>
          <div className="ml-auto self-center text-xs text-[#8f8178]">
            {isEditorial ? "Curated partner edit" : "Affiliate-ready"}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ShopPage() {
  const [currency, setCurrency] = useState("GBP");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOccasion, setSelectedOccasion] = useState("All occasions");
  const [selectedBudget, setSelectedBudget] = useState("All budgets");
  const [selectedCategory, setSelectedCategory] = useState("All categories");
  const [selectedBrand, setSelectedBrand] = useState("All brands");
  const [selectedDelivery, setSelectedDelivery] = useState("Any delivery");
  const [activeRail, setActiveRail] = useState("picked");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [savedHints, setSavedHints] = useState([]);

  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        [
          item.title,
          item.retailer,
          item.brand,
          item.reason,
          item.category,
          item.occasion,
        ]
          .join(" ")
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesOccasion =
        selectedOccasion === "All occasions" || item.occasion === selectedOccasion;

      const matchesBudget =
        selectedBudget === "All budgets" || item.budget === selectedBudget;

      const matchesCategory =
        selectedCategory === "All categories" || item.category === selectedCategory;

      const matchesBrand =
        selectedBrand === "All brands" ||
        item.retailer === selectedBrand ||
        item.brand === selectedBrand;

      const matchesDelivery =
        selectedDelivery === "Any delivery" || item.delivery === selectedDelivery;

      return (
        matchesSearch &&
        matchesOccasion &&
        matchesBudget &&
        matchesCategory &&
        matchesBrand &&
        matchesDelivery
      );
    });
  }, [
    searchTerm,
    selectedOccasion,
    selectedBudget,
    selectedCategory,
    selectedBrand,
    selectedDelivery,
  ]);

  const setters = {
    setSearchTerm,
    setSelectedOccasion,
    setSelectedBudget,
    setSelectedCategory,
    setSelectedBrand,
    setSelectedDelivery,
    setActiveRail,
  };

  return (
    <main className="min-h-screen bg-[#fffaf7] text-[#241815]">
      {selectedProduct ? (
        <AddToHintsModal
          item={selectedProduct}
          currency={currency}
          onClose={() => setSelectedProduct(null)}
          onSave={(hint) => {
            setSavedHints((current) => [hint, ...current]);
            setSelectedProduct(null);
          }}
        />
      ) : null}

      <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 rounded-[36px] border border-[#f0dfd5] bg-[#fffdfb] px-5 py-5 shadow-[0_18px_45px_rgba(120,78,54,0.05)] sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <HintedMark />

            <div className="flex items-center gap-3 sm:gap-5">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="h-11 rounded-full border border-[#ebd7ca] bg-[#fff8f4] px-4 text-sm text-[#5e514a] outline-none"
              >
                {currencyOptions.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </select>

              <nav className="flex items-center gap-2 rounded-full border border-[#eeded4] bg-[#fff8f4] p-1">
                {["Feed", "Hints", "Circles", "Shop"].map((item) => (
                  <a
                    key={item}
                    href={item === "Feed" ? "/feed" : `/${item.toLowerCase()}`}
                    className={`rounded-full px-4 py-2 text-sm ${
                      item === "Shop"
                        ? "bg-[#2f5d50] text-white"
                        : "text-[#6f625b] hover:bg-white"
                    }`}
                  >
                    {item}
                  </a>
                ))}
              </nav>

              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e2bb66] text-sm font-semibold text-[#6f5218] shadow-[0_10px_24px_rgba(209,170,79,0.3)]">
                EH
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-[30px] bg-[#fff7f2] p-5">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#aa8d7d]">
                Curated gifting
              </p>
              <h2 className="mt-2 max-w-[12ch] text-[34px] font-semibold leading-[1.02] tracking-[-0.03em] text-[#281a15]">
                Search brands, gifts, and partner picks.
              </h2>
              <p className="mt-3 max-w-[58ch] text-sm leading-6 text-[#6c5d56]">
                A warm, curated layer of products from trusted brands — built to feel like your Hints board, not a generic marketplace.
              </p>
            </div>

            <div className="rounded-[30px] border border-[#efdfd6] bg-white p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#aa8d7d]">
                Your shop mix
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-[22px] bg-[#fff5ef] p-4">
                  <div className="text-xs text-[#9b8376]">Partner brands</div>
                  <div className="mt-1 text-2xl font-semibold text-[#2a1b15]">48</div>
                </div>
                <div className="rounded-[22px] bg-[#f7f0ea] p-4">
                  <div className="text-xs text-[#9b8376]">Saved to hints</div>
                  <div className="mt-1 text-2xl font-semibold text-[#2a1b15]">
                    {savedHints.length}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#71635c]">
                Build the board first. Swap in live affiliate links later once your partner accounts are approved.
              </p>
            </div>
          </div>
        </header>

        <section className="mt-8 rounded-[36px] border border-[#f0dfd5] bg-[#fffdfb] p-4 shadow-[0_18px_45px_rgba(120,78,54,0.04)] sm:p-5">
          <div className="flex flex-col gap-4">
            <div className="rounded-[28px] border border-[#efdcd0] bg-[#fff7f2] p-3 sm:p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="flex-1">
                  <input
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setActiveRail("");
                    }}
                    placeholder="Search brands, gifts, categories, or occasions"
                    className="h-14 w-full rounded-full border border-[#ebd7ca] bg-white px-5 text-[15px] text-[#241815] outline-none placeholder:text-[#a58f84] focus:border-[#d9a889]"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <FilterPill
                    active={selectedOccasion === "Birthday"}
                    onClick={() => {
                      setSelectedOccasion("Birthday");
                      setActiveRail("");
                    }}
                  >
                    Birthday
                  </FilterPill>
                  <FilterPill
                    active={selectedBudget === "Under £50"}
                    onClick={() => {
                      setSelectedBudget("Under £50");
                      setActiveRail("");
                    }}
                  >
                    Under £50
                  </FilterPill>
                  <FilterPill
                    active={selectedBrand === "John Lewis"}
                    onClick={() => {
                      setSelectedBrand("John Lewis");
                      setActiveRail("");
                    }}
                  >
                    John Lewis
                  </FilterPill>
                </div>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-5">
              <select
                value={selectedOccasion}
                onChange={(e) => {
                  setSelectedOccasion(e.target.value);
                  setActiveRail("");
                }}
                className="h-12 rounded-full border border-[#ebd7ca] bg-white px-4 text-sm text-[#5e514a] outline-none"
              >
                {occasions.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>

              <select
                value={selectedBudget}
                onChange={(e) => {
                  setSelectedBudget(e.target.value);
                  setActiveRail("");
                }}
                className="h-12 rounded-full border border-[#ebd7ca] bg-white px-4 text-sm text-[#5e514a] outline-none"
              >
                {budgets.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setActiveRail("");
                }}
                className="h-12 rounded-full border border-[#ebd7ca] bg-white px-4 text-sm text-[#5e514a] outline-none"
              >
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>

              <select
                value={selectedBrand}
                onChange={(e) => {
                  setSelectedBrand(e.target.value);
                  setActiveRail("");
                }}
                className="h-12 rounded-full border border-[#ebd7ca] bg-white px-4 text-sm text-[#5e514a] outline-none"
              >
                {brands.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>

              <select
                value={selectedDelivery}
                onChange={(e) => {
                  setSelectedDelivery(e.target.value);
                  setActiveRail("");
                }}
                className="h-12 rounded-full border border-[#ebd7ca] bg-white px-4 text-sm text-[#5e514a] outline-none"
              >
                {deliverySpeeds.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#ab8f81]">
                Curated rails
              </p>
              <h2 className="mt-2 text-[26px] font-semibold tracking-[-0.02em] text-[#251915]">
                Browse by mood, budget, and occasion.
              </h2>
            </div>
          </div>

          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {railPresets.map((rail) => (
              <button
                key={rail.id}
                onClick={() => rail.apply(setters)}
                className={`shrink-0 rounded-full px-5 py-3 text-sm transition ${
                  activeRail === rail.id
                    ? "bg-[#2f5d50] text-white"
                    : "border border-[#ebd7ca] bg-white text-[#655851] hover:border-[#e0c3b0] hover:bg-[#fff7f2]"
                }`}
              >
                {rail.label}
              </button>
            ))}
          </div>
        </section>

        {savedHints.length ? (
          <section className="mt-8 rounded-[36px] border border-[#efdcd1] bg-[#fffdfb] p-5 shadow-[0_18px_45px_rgba(120,78,54,0.04)]">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#ab8f81]">
                  Your hints board
                </p>
                <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-[#251915]">
                  Saved from Shop, ready for your board.
                </h2>
              </div>
              <p className="text-sm text-[#7a6d65]">
                Pinterest-style placement preview
              </p>
            </div>

            <div
              className="mt-5 rounded-[30px] border border-[#efdcd0] bg-[#fffaf7] p-4"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(228, 201, 186, 0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(228, 201, 186, 0.35) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-6 lg:grid-cols-12">
                {savedHints.map((item) => (
                  <SavedHintCard key={item.hintId} item={item} currency={currency} />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#ab8f81]">
                Results
              </p>
              <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-[#251915]">
                A curated board of gifts and partner edits.
              </h2>
            </div>
            <p className="text-sm text-[#7a6d65]">
              {filteredProducts.length} result{filteredProducts.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-8 lg:grid-cols-12">
            {filteredProducts.map((item) => (
              <ShopTile
                key={item.id}
                item={item}
                currency={currency}
                onAddToHints={(product) => setSelectedProduct(product)}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
