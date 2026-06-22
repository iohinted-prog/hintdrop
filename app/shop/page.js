"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import AvatarMenu from "../components/AvatarMenu";

const HINTED_SERVICE_FEE_RATE = 0.02;
const DEFAULT_CURRENCY = "GBP";

const occasionOptions = [
  "All occasions",
  "Birthday",
  "Anniversary",
  "Wedding",
  "Housewarming",
  "Thank you",
  "Weekend away",
  "Christmas",
];

const budgetOptions = [
  "All budgets",
  "Under £50",
  "£50-£100",
  "£100+",
];

const categoryOptions = [
  "All categories",
  "Travel",
  "Food",
  "Home",
  "Books",
  "Coffee",
  "Fashion",
  "Fitness",
  "Beauty",
  "Tech",
  "Experiences",
  "Music",
  "Art",
];

const quickFilterPresets = [
  {
    id: "for-you",
    label: "Picked for you",
    description: "Based on your onboarding interests.",
  },
  {
    id: "under-50",
    label: "Best under £50",
    description: "Easy wins that still feel thoughtful.",
  },
  {
    id: "shared-pot",
    label: "Good for a shared pot",
    description: "Stronger fit for circles and group gifting.",
  },
  {
    id: "birthday",
    label: "Birthday picks",
    description: "Reliable gifting ideas for common birthdays.",
  },
];

function roundCurrency(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function calculateHintedFee(amount) {
  return roundCurrency(Number(amount || 0) * HINTED_SERVICE_FEE_RATE);
}

function calculateShopCircleTotal(amount) {
  const itemAmount = roundCurrency(Number(amount || 0));
  const feeAmount = calculateHintedFee(itemAmount);
  const totalAmount = roundCurrency(itemAmount + feeAmount);
  return { itemAmount, feeAmount, totalAmount };
}

function formatMoney(amount, currency = DEFAULT_CURRENCY) {
  const safeAmount = Number(amount || 0);
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: safeAmount % 1 === 0 ? 0 : 2,
    }).format(safeAmount);
  } catch {
    return `£${safeAmount}`;
  }
}

function formatDateLabel(dateString) {
  if (!dateString) return "No date";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

function normaliseError(error, fallback) {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (error?.message) return error.message;
  return fallback;
}

function buildRetailerLabel(product) {
  return product?.retailer || "Saved link";
}

function buildProductUrl(product) {
  return product?.affiliate_url || product?.affiliateUrl || product?.product_url || product?.destinationUrl || "#";
}

function buildPriceLabel(product) {
  if (product?.price_text) return product.price_text;
  if (typeof product?.numeric_price === "number") return `About ${formatMoney(product.numeric_price, product.currency || DEFAULT_CURRENCY)}`;
  if (typeof product?.price === "number") return `About ${formatMoney(product.price, DEFAULT_CURRENCY)}`;
  return "Price unavailable";
}

function toBudgetBand(price) {
  const value = Number(price || 0);
  if (!value) return "Under £50";
  if (value < 50) return "Under £50";
  if (value <= 100) return "£50-£100";
  return "£100+";
}

function inferOccasion(product) {
  if (Array.isArray(product?.occasion_tags) && product.occasion_tags.length > 0) {
    return product.occasion_tags[0];
  }
  return "Birthday";
}

function matchesInterest(product, interests) {
  if (!Array.isArray(interests) || interests.length === 0) return false;
  const productInterests = Array.isArray(product?.interests) ? product.interests : [];
  const lookup = new Set(interests.map((item) => String(item).toLowerCase()));
  return productInterests.some((item) => lookup.has(String(item).toLowerCase()));
}

function scoreProduct(product, userInterests) {
  let score = 0;
  if (matchesInterest(product, userInterests)) score += 4;
  if (product?.is_featured) score += 2;
  if ((product?.occasion_tags || []).includes("Birthday")) score += 1;
  if (Number(product?.numeric_price || 0) >= 80) score += 1;
  return score;
}

function toTileClass(index) {
  const patterns = [
    "md:col-span-4 lg:col-span-4 min-h-[360px]",
    "md:col-span-4 lg:col-span-4 min-h-[360px]",
    "md:col-span-4 lg:col-span-4 min-h-[420px]",
    "md:col-span-8 lg:col-span-8 min-h-[300px]",
  ];
  return patterns[index % patterns.length];
}

function LogoMark() {
  return (
    <div className="relative flex h-11 w-11 items-center justify-center rounded-[16px] bg-gradient-to-b from-[#ffa47f] to-[#ff875d] text-white shadow-lg">
      <span className="text-lg">🎁</span>
    </div>
  );
}

function NavHeader() {
  return (
    <header className="border-b border-[#efe0d7] bg-[#fffaf7f5] backdrop-blur">
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
  );
}

function Banner({ tone = "neutral", children }) {
  const styles =
    tone === "error"
      ? "border-[#efc0ba] bg-[#fff4f2] text-[#b14f43]"
      : tone === "success"
      ? "border-[#d8e8d3] bg-[#f3fbf1] text-[#4a7a3a]"
      : "border-[#f0dfd6] bg-[#fff7f2] text-slate-600";

  return (
    <div className={`rounded-[22px] border px-4 py-3 text-sm ${styles}`}>
      {children}
    </div>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition ${
        active
          ? "border border-[#3c4d39] bg-[#2f3b2d] text-white"
          : "border border-[#ead8ce] bg-white text-slate-700 hover:bg-[#fff5f0]"
      }`}
    >
      {children}
    </button>
  );
}

function ShortlistDrawer({ open, items, onClose, onRemove }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[rgba(42,26,20,0.34)] backdrop-blur-sm">
      <div className="absolute right-0 top-0 h-full w-full max-w-[460px] border-l border-[#ead8ce] bg-[#fffaf7] shadow-[-24px_0_80px_rgba(88,46,31,0.16)]">
        <div className="flex h-full flex-col">
          <div className="border-b border-[#efe0d7] px-5 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#df7b59]">
                  Shortlist cart
                </p>
                <h2 className="mt-1 text-[28px] font-semibold tracking-[-0.05em] text-slate-900">
                  Keep the good ones together.
                </h2>
                <p className="mt-2 text-[14px] leading-7 text-slate-600">
                  This is a shortlist for gift planning, not a payment cart. Checkout sends you out to the retailer.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white text-slate-500 hover:bg-[#fff2eb]"
                aria-label="Close shortlist cart"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {items.length ? (
              items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[24px] border border-[#f0dfd6] bg-white p-4 shadow-sm"
                >
                  <div className="flex gap-3">
                    <div className="h-20 w-20 overflow-hidden rounded-[18px] bg-[#f5ebe4]">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        {buildRetailerLabel(item)}
                      </p>
                      <h3 className="mt-1 text-sm font-semibold text-slate-900">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-[13px] text-slate-500">
                        {buildPriceLabel(item)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a
                          href={buildProductUrl(item)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-4 text-[12px] font-semibold text-white shadow-lg"
                        >
                          Checkout
                        </a>
                        <button
                          type="button"
                          onClick={() => onRemove(item.id)}
                          className="inline-flex h-9 items-center justify-center rounded-full border border-[#efc0ba] bg-[#fff4f2] px-4 text-[12px] font-semibold text-[#b14f43] hover:bg-[#ffe9e5]"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-[#e5d8cf] bg-white p-5 text-sm leading-6 text-slate-500">
                Your shortlist is empty. Save a few good options here while you compare, then head out to the retailer when you are ready.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AddToHintsModal({
  open,
  item,
  form,
  setForm,
  onClose,
  onSubmit,
  isSaving,
}) {
  if (!open || !item) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(33,24,20,0.42)] px-4 py-4 backdrop-blur-sm sm:px-6 sm:py-6">
      <div className="flex min-h-full items-start justify-center">
        <div className="flex w-full max-w-[620px] flex-col overflow-hidden rounded-[30px] border border-[#efdcd2] bg-white shadow-[0_28px_80px_rgba(75,45,30,0.18)] max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)]">
          <div className="shrink-0 border-b border-[#f2e5de] bg-white px-6 py-5 sm:px-7">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#e08a67]">
                  From shop
                </p>
                <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.05em] text-slate-900">
                  Add to hints
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
            <div className="space-y-4">
              <div className="overflow-hidden rounded-[24px] border border-[#efe0d7] bg-[#fffaf7]">
                <div className="relative aspect-[16/9] bg-[#f5ebe4]">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {buildRetailerLabel(item)}
                  </p>
                  <h3 className="mt-1 text-[22px] font-semibold tracking-[-0.04em] text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">{buildPriceLabel(item)}</p>
                </div>
              </div>

              <p className="text-sm text-slate-500">
                Save this to your board now, then reorder it later in Hints.
              </p>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Name
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, title: e.target.value }))
                  }
                  className="h-14 w-full rounded-[18px] border border-[#eadcd3] bg-[#fcfaf8] px-5 text-[15px] text-slate-700 outline-none focus:ring-2 focus:ring-[#f19a7850]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Link
                </label>
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, url: e.target.value }))
                  }
                  className="h-14 w-full rounded-[18px] border border-[#eadcd3] bg-[#fcfaf8] px-5 text-[15px] text-slate-700 outline-none focus:ring-2 focus:ring-[#f19a7850]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Price optional
                </label>
                <input
                  type="text"
                  value={form.priceInput}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, priceInput: e.target.value }))
                  }
                  className="h-14 w-full rounded-[18px] border border-[#eadcd3] bg-[#fcfaf8] px-5 text-[15px] text-slate-700 outline-none focus:ring-2 focus:ring-[#f19a7850]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() =>
                    setForm((current) => ({ ...current, starred: !current.starred }))
                  }
                  className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                    form.starred
                      ? "border-[#ffd8c9] bg-[#fff2ea] text-[#e27956]"
                      : "border-[#efe0d7] bg-[#f7f2ee] text-slate-700 hover:bg-[#f1ebe6]"
                  }`}
                >
                  {form.starred ? "Starred" : "Star"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setForm((current) => ({ ...current, private: !current.private }))
                  }
                  className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                    form.private
                      ? "border-[#ffd8c9] bg-[#fffaf7] text-[#e08a67]"
                      : "border-[#efe0d7] bg-[#f7f2ee] text-slate-700 hover:bg-[#f1ebe6]"
                  }`}
                >
                  {form.private ? "Private" : "Public"}
                </button>
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-[#f2e5de] bg-white px-6 py-4 sm:px-7">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-12 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-6 text-sm font-semibold text-slate-700 hover:bg-[#fff5f0]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={isSaving}
                className="inline-flex h-12 items-center justify-center rounded-full border border-[#ee8d69] bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-6 text-sm font-semibold text-white shadow-lg disabled:opacity-70"
              >
                {isSaving ? "Saving..." : "Add to hints"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateCircleFromShopModal({
  open,
  product,
  form,
  setForm,
  onClose,
  onSubmit,
  isSubmitting,
  errorMessage,
}) {
  if (!open || !product) return null;

  const totals = calculateShopCircleTotal(product.numeric_price || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(42,26,20,0.38)] px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-[960px] overflow-hidden rounded-[34px] border border-[#eddacf] bg-[#fffaf7] shadow-[0_24px_80px_rgba(88,46,31,0.22)]">
        <div className="flex items-center justify-between border-b border-[#efe0d7] px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#df7b59]">
              From shop
            </p>
            <h2 className="mt-1 text-[28px] font-semibold tracking-[-0.05em] text-slate-900">
              Create a circle around this item
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white text-slate-500 hover:bg-[#fff2eb]"
            aria-label="Close window"
          >
            ✕
          </button>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.06fr_0.94fr]">
          <div className="max-h-[calc(92vh-90px)] space-y-6 overflow-y-auto p-6">
            <div className="rounded-[24px] border border-[#eedfd6] bg-white p-5">
              <p className="text-sm font-semibold text-slate-900">1. Choose the event</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Event title</span>
                  <input
                    type="text"
                    value={form.eventTitle}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, eventTitle: e.target.value }))
                    }
                    placeholder="Sarah's birthday"
                    className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Event type</span>
                  <input
                    type="text"
                    value={form.occasionType}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, occasionType: e.target.value }))
                    }
                    className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Event date</span>
                  <input
                    type="date"
                    value={form.eventDate}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        eventDate: e.target.value,
                        deadline: prev.deadline || e.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#eedfd6] bg-white p-5">
              <p className="text-sm font-semibold text-slate-900">2. Circle details</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Circle title</span>
                  <input
                    type="text"
                    value={form.circleTitle}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, circleTitle: e.target.value }))
                    }
                    placeholder="Sarah birthday circle"
                    className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Contribution deadline</span>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, deadline: e.target.value }))
                    }
                    className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
                  />
                  <p className="text-[12px] text-slate-400">
                    Defaults to the event day, but you can close contributions earlier.
                  </p>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">If people do not join</span>
                  <select
                    value={form.fundingMode}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, fundingMode: e.target.value }))
                    }
                    className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
                  >
                    <option value="Flexible pot">Flexible pot</option>
                    <option value="All-or-nothing">All-or-nothing</option>
                    <option value="Organizer covers gap">Organizer covers gap</option>
                  </select>
                </label>
              </div>
            </div>

            {errorMessage ? <Banner tone="error">{errorMessage}</Banner> : null}
          </div>

          <div className="max-h-[calc(92vh-90px)] overflow-y-auto border-t border-[#efe0d7] bg-[#fff7f2] p-6 lg:border-l lg:border-t-0">
            <div className="rounded-[24px] border border-dashed border-[#e6d7cd] bg-white p-5">
              <p className="text-sm font-semibold text-slate-900">Shop item</p>
              <div className="mt-4 overflow-hidden rounded-[22px] border border-[#eedfd6] bg-[#fffdfa]">
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#f5ebe4]">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    From shop
                  </p>
                  <h3 className="mt-1 text-[22px] font-semibold tracking-[-0.04em] text-slate-900">
                    {product.title}
                  </h3>
                  <p className="mt-2 text-[13px] leading-6 text-slate-500">
                    {product.description || "A curated shop item ready to become a shared pot."}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-[18px] bg-[#fff4ee] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#df7b59]">
                  Total
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {formatMoney(totals.totalAmount, product.currency || DEFAULT_CURRENCY)}
                </p>
                <p className="mt-2 text-[12px] leading-5 text-slate-500">
                  includes our 2% service fee so you can avoid the awkward reminders
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-[#fff4ee] px-3 py-1 text-[11px] font-semibold text-[#df7b59]">
                  {form.fundingMode}
                </span>
                <span className="rounded-full bg-[#f3f6fb] px-3 py-1 text-[11px] font-semibold text-slate-600">
                  Deadline {formatDateLabel(form.deadline)}
                </span>
                <span className="rounded-full bg-[#edf3ff] px-3 py-1 text-[11px] font-semibold text-slate-600">
                  {product.currency || DEFAULT_CURRENCY}
                </span>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-6 text-sm font-semibold text-slate-700 hover:bg-[#fff5f0]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={isSubmitting}
                  className={`inline-flex h-12 flex-1 items-center justify-center rounded-full px-6 text-sm font-semibold text-white shadow-lg ${
                    isSubmitting
                      ? "cursor-not-allowed bg-[#e9a48d]"
                      : "bg-gradient-to-b from-[#ff946d] to-[#f36f64]"
                  }`}
                >
                  {isSubmitting ? "Creating..." : "Create circle"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductCard({
  product,
  index,
  onAddToHints,
  onAddToShortlist,
  onCreateCircle,
  isShortlisted,
}) {
  const interests = Array.isArray(product.interests) ? product.interests : [];
  const occasion = inferOccasion(product);

  return (
    <article
      className={`${toTileClass(index)} rounded-[30px] border border-[#f0dfd6] bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-[30px]">
        <div className="relative aspect-[4/3] overflow-hidden bg-[#f5ebe4]">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : null}
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#fff6f1]/95 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[#7d5b49]">
              {buildRetailerLabel(product)}
            </span>
            {product.is_featured ? (
              <span className="rounded-full bg-[#fff1ea] px-3 py-1 text-[11px] font-semibold text-[#df7b59]">
                Featured
              </span>
            ) : null}
          </div>
          <div className="absolute bottom-4 left-4">
            <span className="rounded-full bg-[#fffaf7]/95 px-3 py-2 text-sm font-semibold text-[#2d1c15]">
              {buildPriceLabel(product)}
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#a08879]">
              {occasion} · {toBudgetBand(product.numeric_price)}
            </p>
            <p className="text-xs text-[#a08879]">
              {product.is_featured ? "Top pick" : "Giftable"}
            </p>
          </div>

          <h3 className="mt-3 text-[22px] font-semibold leading-[1.1] text-[#231815]">
            {product.title}
          </h3>

          <p className="mt-3 text-sm leading-6 text-[#685b54]">
            {product.description || "A believable curated shop item based on your gifting interests and common events."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {interests.slice(0, 3).map((interest) => (
              <span
                key={`${product.id}-${interest}`}
                className="rounded-full bg-[#f7f0ea] px-3 py-1 text-xs text-[#8a7b72]"
              >
                {interest}
              </span>
            ))}
            <span className="rounded-full bg-[#fff1e9] px-3 py-1 text-xs text-[#8a5b43]">
              From shop
            </span>
          </div>

          <div className="mt-auto flex flex-wrap gap-3 pt-5">
            <button
              type="button"
              onClick={() => onAddToHints(product)}
              className="inline-flex h-11 items-center justify-center rounded-full border border-[#ead8ce] bg-[#fff4ee] px-4 text-sm font-semibold text-[#df7b59] hover:bg-[#ffe9df]"
            >
              Add to hints
            </button>

            <button
              type="button"
              onClick={() => onCreateCircle(product)}
              className="inline-flex h-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-[#fff5f0]"
            >
              Use in a shared pot
            </button>

            <button
              type="button"
              onClick={() => onAddToShortlist(product)}
              className={`inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-semibold ${
                isShortlisted
                  ? "border border-[#3c4d39] bg-[#2f3b2d] text-white"
                  : "border border-[#ead8ce] bg-white text-slate-700 hover:bg-[#fff5f0]"
              }`}
            >
              {isShortlisted ? "Shortlisted" : "Add to shortlist"}
            </button>

            <a
              href={buildProductUrl(product)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-4 text-sm font-semibold text-white shadow-lg"
            >
              Checkout
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function ShopPage() {
  const supabase = createClient();

  const [sessionUser, setSessionUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [pageError, setPageError] = useState("");
  const [pageSuccess, setPageSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOccasion, setSelectedOccasion] = useState("All occasions");
  const [selectedBudget, setSelectedBudget] = useState("All budgets");
  const [selectedCategory, setSelectedCategory] = useState("All categories");
  const [activePreset, setActivePreset] = useState("for-you");

  const [shortlist, setShortlist] = useState([]);
  const [shortlistOpen, setShortlistOpen] = useState(false);

  const [selectedHintItem, setSelectedHintItem] = useState(null);
  const [isSavingHint, setIsSavingHint] = useState(false);
  const [newHintForm, setNewHintForm] = useState({
    title: "",
    url: "",
    priceInput: "",
    starred: false,
    private: false,
  });

  const [selectedCircleItem, setSelectedCircleItem] = useState(null);
  const [isCreatingCircle, setIsCreatingCircle] = useState(false);
  const [circleError, setCircleError] = useState("");
  const [circleForm, setCircleForm] = useState({
    eventTitle: "",
    occasionType: "Birthday",
    eventDate: "",
    deadline: "",
    circleTitle: "",
    fundingMode: "Flexible pot",
  });

  useEffect(() => {
    let active = true;

    async function loadPage() {
      try {
        setIsLoading(true);
        setPageError("");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw new Error(normaliseError(userError, "Failed to get logged-in user."));
        if (!user) throw new Error("You must be signed in to view shop.");

        if (!active) return;
        setSessionUser(user);

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw new Error(normaliseError(profileError, "Failed to load profile."));
        if (!active) return;
        setProfile(profileData || null);

        const { data: shopData, error: shopError } = await supabase
          .from("shop_products")
          .select("*")
          .eq("is_active", true)
          .order("is_featured", { ascending: false })
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false });

        if (shopError) throw new Error(normaliseError(shopError, "Failed to load shop products."));
        if (!active) return;
        setProducts(Array.isArray(shopData) ? shopData : []);
      } catch (error) {
        if (active) {
          setPageError(error?.message || "Failed to load the Shop page.");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadPage();

    return () => {
      active = false;
    };
  }, [supabase]);

  const userInterests = useMemo(() => {
    return Array.isArray(profile?.interests) ? profile.interests : [];
  }, [profile]);

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => scoreProduct(b, userInterests) - scoreProduct(a, userInterests));
  }, [products, userInterests]);

  const filteredProducts = useMemo(() => {
    let next = [...sortedProducts];

    if (activePreset === "for-you" && userInterests.length) {
      next = next.filter((product) => matchesInterest(product, userInterests));
    }

    if (activePreset === "under-50") {
      next = next.filter((product) => Number(product.numeric_price || 0) > 0 && Number(product.numeric_price || 0) < 50);
    }

    if (activePreset === "shared-pot") {
      next = next.filter((product) => Number(product.numeric_price || 0) >= 80);
    }

    if (activePreset === "birthday") {
      next = next.filter((product) =>
        (Array.isArray(product.occasion_tags) ? product.occasion_tags : []).includes("Birthday")
      );
    }

    if (searchTerm.trim()) {
      const query = searchTerm.trim().toLowerCase();
      next = next.filter((product) =>
        [
          product.title,
          product.description,
          product.retailer,
          ...(Array.isArray(product.interests) ? product.interests : []),
          ...(Array.isArray(product.occasion_tags) ? product.occasion_tags : []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }

    if (selectedOccasion !== "All occasions") {
      next = next.filter((product) =>
        (Array.isArray(product.occasion_tags) ? product.occasion_tags : []).includes(selectedOccasion)
      );
    }

    if (selectedBudget !== "All budgets") {
      next = next.filter((product) => toBudgetBand(product.numeric_price) === selectedBudget);
    }

    if (selectedCategory !== "All categories") {
      next = next.filter((product) =>
        (Array.isArray(product.interests) ? product.interests : []).includes(selectedCategory)
      );
    }

    return next;
  }, [
    sortedProducts,
    activePreset,
    userInterests,
    searchTerm,
    selectedOccasion,
    selectedBudget,
    selectedCategory,
  ]);

  function openAddToHints(product) {
    setPageError("");
    setPageSuccess("");
    setSelectedHintItem(product);
    setNewHintForm({
      title: product.title || "",
      url: buildProductUrl(product),
      priceInput:
        product.numeric_price != null ? String(product.numeric_price) : "",
      starred: false,
      private: false,
    });
  }

  async function submitHintFromShop() {
    if (!sessionUser?.id || !selectedHintItem) return;

    setIsSavingHint(true);
    setPageError("");
    setPageSuccess("");

    try {
      const numericPrice = Number(newHintForm.priceInput || 0);
      const cleanNumericPrice = Number.isFinite(numericPrice) && numericPrice > 0 ? numericPrice : null;
      const priceLabel = cleanNumericPrice != null ? `About ${formatMoney(cleanNumericPrice)}` : "Price unavailable";

      const insertPayload = {
        userid: sessionUser.id,
        title: newHintForm.title?.trim() || selectedHintItem.title || "Saved hint",
        url: newHintForm.url?.trim() || buildProductUrl(selectedHintItem),
        imageurl: selectedHintItem.image_url || null,
        retailer: buildRetailerLabel(selectedHintItem),
        pricetext: priceLabel,
        numericprice: cleanNumericPrice,
        starred: Boolean(newHintForm.starred),
        isprivate: Boolean(newHintForm.private),
        position: 0,
        source: "shop",
      };

      const { error } = await supabase.from("hints").insert(insertPayload);

      if (error) throw new Error(normaliseError(error, "Failed to save to hints."));

      setSelectedHintItem(null);
      setPageSuccess("Added to hints.");
    } catch (error) {
      setPageError(error?.message || "Failed to save to hints.");
    } finally {
      setIsSavingHint(false);
    }
  }

  function openCreateCircle(product) {
    const today = new Date().toISOString().slice(0, 10);
    setSelectedCircleItem(product);
    setCircleError("");
    setCircleForm({
      eventTitle: "",
      occasionType: inferOccasion(product),
      eventDate: today,
      deadline: today,
      circleTitle: "",
      fundingMode: "Flexible pot",
    });
  }

  function fundingModeToDb(value) {
    if (value === "All-or-nothing") return "allornothing";
    if (value === "Organizer covers gap") return "organisercovers";
    return "flexible";
  }

  function safeIsoDate(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  }

  function safeIsoTimestampEndOfDay(value) {
    const dateOnly = safeIsoDate(value);
    if (!dateOnly) return null;
    return `${dateOnly}T23:59:59.000Z`;
  }

  async function submitCircleFromShop() {
    if (!sessionUser?.id || !selectedCircleItem) return;

    setIsCreatingCircle(true);
    setCircleError("");
    setPageError("");
    setPageSuccess("");

    try {
      const itemAmount = Number(selectedCircleItem.numeric_price || 0);
      if (itemAmount <= 0) {
        throw new Error("This shop item needs a valid price before it can be used in a circle.");
      }

      if (!circleForm.eventTitle.trim()) {
        throw new Error("Event title is required.");
      }

      if (!safeIsoDate(circleForm.eventDate)) {
        throw new Error("Event date is required.");
      }

      if (!safeIsoTimestampEndOfDay(circleForm.deadline || circleForm.eventDate)) {
        throw new Error("Contribution deadline is required.");
      }

      const totals = calculateShopCircleTotal(itemAmount);

      const payload = {
        userid: sessionUser.id,
        recipientcontactid: null,
        title:
          circleForm.circleTitle.trim() ||
          `${circleForm.eventTitle.trim()} circle`,
        occasiontype: circleForm.occasionType || "Event",
        eventdate: safeIsoDate(circleForm.eventDate),
        deadlineat: safeIsoTimestampEndOfDay(circleForm.deadline || circleForm.eventDate),
        sourcetype: "shop_item",
        hintid: null,
        itemtitle: selectedCircleItem.title,
        itemurl: buildProductUrl(selectedCircleItem),
        itemimageurl: selectedCircleItem.image_url || null,
        itemdescription:
          selectedCircleItem.description ||
          "Added from shop.",
        currency: selectedCircleItem.currency || DEFAULT_CURRENCY,
        itemtargetamount: totals.itemAmount,
        organisingfeeamount: totals.feeAmount,
        totaltargetamount: totals.totalAmount,
        feemode: "includedintarget",
        payoutmode: "releasetoorganiser",
        fundingmode: fundingModeToDb(circleForm.fundingMode),
        status: "draft",
      };

      const { error } = await supabase.from("circles").insert(payload);

      if (error) throw new Error(normaliseError(error, "Failed to create circle."));

      setSelectedCircleItem(null);
      setPageSuccess("Circle created successfully.");
    } catch (error) {
      setCircleError(error?.message || "Failed to create circle.");
    } finally {
      setIsCreatingCircle(false);
    }
  }

  function toggleShortlist(product) {
    setShortlist((current) => {
      const exists = current.some((item) => item.id === product.id);
      if (exists) return current.filter((item) => item.id !== product.id);
      return [product, ...current];
    });
  }

  const headline = userInterests.length
    ? `Curated around ${userInterests.slice(0, 2).join(" and ").toLowerCase()}.`
    : "Curated around common gifting interests.";

  return (
    <main className="min-h-screen bg-[#fffaf7] text-slate-800">
      <NavHeader />

      <AddToHintsModal
        open={Boolean(selectedHintItem)}
        item={selectedHintItem}
        form={newHintForm}
        setForm={setNewHintForm}
        onClose={() => setSelectedHintItem(null)}
        onSubmit={submitHintFromShop}
        isSaving={isSavingHint}
      />

      <CreateCircleFromShopModal
        open={Boolean(selectedCircleItem)}
        product={selectedCircleItem}
        form={circleForm}
        setForm={setCircleForm}
        onClose={() => setSelectedCircleItem(null)}
        onSubmit={submitCircleFromShop}
        isSubmitting={isCreatingCircle}
        errorMessage={circleError}
      />

      <ShortlistDrawer
        open={shortlistOpen}
        items={shortlist}
        onClose={() => setShortlistOpen(false)}
        onRemove={(id) =>
          setShortlist((current) => current.filter((item) => item.id !== id))
        }
      />

      <div className="mx-auto max-w-[1380px] px-5 py-8 md:px-8">
        <div className="space-y-5">
          {pageError ? <Banner tone="error">{pageError}</Banner> : null}
          {pageSuccess ? <Banner tone="success">{pageSuccess}</Banner> : null}
        </div>

        <section className="rounded-[34px] border border-[#eeddd3] bg-[#fff7f2] p-4 shadow-[0_18px_60px_rgba(173,101,72,0.1)] sm:p-5">
          <div className="rounded-[28px] border border-[#f1dfd6] bg-white p-5 sm:p-6">
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="min-w-0">
                <div className="inline-flex rounded-full bg-[#fff4ee] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#e37b57]">
                  Curated gifting
                </div>
                <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.06em] text-slate-900 sm:text-[40px]">
                  Shop gifts that feel like the missing final page of Hinted.
                </h1>
                <p className="mt-3 max-w-[760px] text-[15px] leading-7 text-slate-600">
                  {headline} Save straight to hints, start a circle around an item, or keep a shortlist before heading out to the retailer.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setShortlistOpen(true)}
                    className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-6 text-sm font-semibold text-white shadow-lg"
                  >
                    Open shortlist cart
                  </button>
                  <Link
                    href="/hints"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-6 text-sm font-semibold text-slate-700 hover:bg-[#fff5f0]"
                  >
                    Go to hints
                  </Link>
                </div>
              </div>

              <aside className="space-y-4">
                <div className="rounded-[26px] border border-[#f0dfd6] bg-[#fffdfa] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Your shop mix
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[20px] bg-[#fff4ee] p-4">
                      <p className="text-xs text-slate-500">Interests</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-900">
                        {userInterests.length || 0}
                      </p>
                    </div>
                    <div className="rounded-[20px] bg-[#fffaf7] p-4">
                      <p className="text-xs text-slate-500">Products</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-900">
                        {products.length}
                      </p>
                    </div>
                    <div className="rounded-[20px] bg-[#fffaf7] p-4">
                      <p className="text-xs text-slate-500">Shortlist</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-900">
                        {shortlist.length}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    This shop acts like a curated planning layer for good gifts around generic events and the events you create within circles.
                  </p>
                </div>

                <div className="rounded-[26px] border border-[#f0dfd6] bg-[#fffdfa] p-5">
                  <p className="text-sm font-semibold text-slate-900">How checkout works</p>
                  <p className="mt-2 text-[13px] leading-6 text-slate-500">
                    For now, checkout is a shortlist handoff. You collect options here, then use Checkout to open the retailer link. Stripe can stay focused on shared pot and circle payment flows later.
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[34px] border border-[#eeddd3] bg-[#fffdfb] p-4 shadow-sm sm:p-5">
          <div className="space-y-4">
            <div className="rounded-[28px] border border-[#f1dfd6] bg-[#fff7f2] p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="flex-1">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setActivePreset("");
                    }}
                    placeholder="Search gifts, retailers, occasions, or interests"
                    className="h-14 w-full rounded-full border border-[#ead8ce] bg-white px-5 text-[15px] text-slate-700 outline-none focus:border-[#f19b7e]"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <FilterChip
                    active={selectedOccasion === "Birthday"}
                    onClick={() => {
                      setSelectedOccasion("Birthday");
                      setActivePreset("");
                    }}
                  >
                    Birthday
                  </FilterChip>
                  <FilterChip
                    active={selectedBudget === "Under £50"}
                    onClick={() => {
                      setSelectedBudget("Under £50");
                      setActivePreset("");
                    }}
                  >
                    Under £50
                  </FilterChip>
                  <FilterChip
                    active={selectedCategory === "Experiences"}
                    onClick={() => {
                      setSelectedCategory("Experiences");
                      setActivePreset("");
                    }}
                  >
                    Experiences
                  </FilterChip>
                </div>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              <select
                value={selectedOccasion}
                onChange={(e) => {
                  setSelectedOccasion(e.target.value);
                  setActivePreset("");
                }}
                className="h-12 rounded-full border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
              >
                {occasionOptions.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>

              <select
                value={selectedBudget}
                onChange={(e) => {
                  setSelectedBudget(e.target.value);
                  setActivePreset("");
                }}
                className="h-12 rounded-full border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
              >
                {budgetOptions.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setActivePreset("");
                }}
                className="h-12 rounded-full border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
              >
                {categoryOptions.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Curated rails
          </p>
          <h2 className="mt-1 text-[24px] font-semibold tracking-[-0.04em] text-slate-900">
            Browse by mood, budget, and occasion
          </h2>

          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {quickFilterPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setActivePreset(preset.id)}
                className={`shrink-0 rounded-full px-5 py-3 text-sm font-semibold transition ${
                  activePreset === preset.id
                    ? "bg-[#2f3b2d] text-white"
                    : "border border-[#ead8ce] bg-white text-slate-700 hover:bg-[#fff5f0]"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Results
              </p>
              <h2 className="mt-1 text-[28px] font-semibold tracking-[-0.05em] text-slate-900">
                A curated board of gifts from shop
              </h2>
            </div>
            <p className="text-sm text-slate-500">
              {filteredProducts.length} result{filteredProducts.length === 1 ? "" : "s"}
            </p>
          </div>

          {isLoading ? (
            <div className="rounded-[24px] border border-[#f0dfd6] bg-white p-5 text-sm text-slate-500">
              Loading shop products...
            </div>
          ) : filteredProducts.length ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-8 lg:grid-cols-12">
              {filteredProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={index}
                  onAddToHints={openAddToHints}
                  onCreateCircle={openCreateCircle}
                  onAddToShortlist={toggleShortlist}
                  isShortlisted={shortlist.some((item) => item.id === product.id)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-[#e5d8cf] bg-white p-8 text-center">
              <p className="text-sm font-semibold text-slate-900">Nothing matched this edit yet.</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Try changing a filter, switch to another curated rail, or use a broader search.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
