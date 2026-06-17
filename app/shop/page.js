"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const products = [
  {
    id: "prod-001",
    type: "product",
    title: "Silk pillowcase set",
    retailer: "John Lewis",
    brand: "John Lewis",
    destinationUrl: "https://www.johnlewis.com/",
    affiliateUrl: "",
    image:
      "https://images.unsplash.com/photo-1616627451735-15d6c8f1fdf4?auto=format&fit=crop&w=1200&q=80",
    price: 45,
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
    destinationUrl: "https://www.amazon.co.uk/",
    affiliateUrl: "",
    image:
      "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=1200&q=80",
    price: 159,
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
    destinationUrl: "https://www.harrods.com/",
    affiliateUrl: "",
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80",
    price: 220,
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
    destinationUrl: "https://www.johnlewis.com/",
    affiliateUrl: "",
    image:
      "https://images.unsplash.com/photo-1584990347449-a9f55d5b4b55?auto=format&fit=crop&w=1200&q=80",
    price: 189,
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
    destinationUrl: "https://www.shop.com/",
    affiliateUrl: "",
    image:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
    price: 48,
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
    destinationUrl: "https://www.airbnb.co.uk/",
    affiliateUrl: "",
    image:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    price: 320,
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
    destinationUrl: "https://www.amazon.co.uk/",
    affiliateUrl: "",
    image:
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80",
    price: 479,
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
    destinationUrl: "https://www.harrods.com/",
    affiliateUrl: "",
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80",
    price: 350,
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
    destinationUrl: "https://www.johnlewis.com/",
    affiliateUrl: "",
    image:
      "https://images.unsplash.com/photo-1511381939415-e44015466834?auto=format&fit=crop&w=1200&q=80",
    price: 99,
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
    values: {
      search: "",
      occasion: "Birthday",
      budget: "All budgets",
      category: "All categories",
      brand: "All brands",
      delivery: "Any delivery",
    },
  },
  {
    id: "under50",
    label: "Best under £50",
    values: {
      search: "",
      occasion: "All occasions",
      budget: "Under £50",
      category: "All categories",
      brand: "All brands",
      delivery: "Any delivery",
    },
  },
  {
    id: "luxury",
    label: "Luxury classics",
    values: {
      search: "",
      occasion: "All occasions",
      budget: "Luxury",
      category: "All categories",
      brand: "All brands",
      delivery: "Any delivery",
    },
  },
  {
    id: "johnlewis",
    label: "Trending at John Lewis",
    values: {
      search: "",
      occasion: "All occasions",
      budget: "All budgets",
      category: "All categories",
      brand: "John Lewis",
      delivery: "Any delivery",
    },
  },
  {
    id: "saved",
    label: "From your saved hints",
    values: {
      search: "",
      occasion: "Birthday",
      budget: "All budgets",
      category: "Home",
      brand: "All brands",
      delivery: "Any delivery",
    },
  },
];

function formatMoney(value) {
  if (value == null) return "";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
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

function AvatarMenu() {
  return (
    <div className="relative group">
      <button
        className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-b from-[#efcdbf] to-[#bb8168] text-sm font-bold text-white ring-4 ring-white/70"
        aria-label="Open account menu"
        type="button"
      >
        CG
      </button>

      <div className="invisible absolute right-0 top-[calc(100%+10px)] z-20 w-56 translate-y-1 rounded-[22px] border border-[#ecdcd2] bg-white p-2 opacity-0 shadow-[0_18px_45px_rgba(123,84,64,0.14)] transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        <Link href="/account" className="block rounded-[16px] px-4 py-3 text-sm text-slate-700 hover:bg-[#faf6f3]">
          Account details
        </Link>
        <Link href="/settings" className="block rounded-[16px] px-4 py-3 text-sm text-slate-700 hover:bg-[#faf6f3]">
          Settings
        </Link>
        <Link href="/billing" className="block rounded-[16px] px-4 py-3 text-sm text-slate-700 hover:bg-[#faf6f3]">
          Payment details
        </Link>
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
          ? "border-[#2f5d50] bg-[#e5f0ec] text-[#2f5d50]"
          : "border-[#edd8cb] bg-white text-[#6c5d56] hover:border-[#e1c2ae] hover:bg-[#fff7f3]"
      }`}
      type="button"
    >
      {children}
    
