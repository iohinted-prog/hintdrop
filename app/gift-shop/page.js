"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PublicShell from "../components/PublicShell";
import AuthModal from "../components/AuthModal";
import { useCurrencyFormatter } from "../../lib/useCurrencyFormatter";

const CATEGORIES = [
  "Home", "Food", "Beauty", "Tech", "Travel", "Wellness",
  "Books", "Fashion", "Experiences", "Music", "Gaming", "Kids", "Hobbies",
];

function getTagArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) return value.split(",").map(s => s.trim()).filter(Boolean);
  return [];
}

function GiftCard({ product, formatCurrency, onImageError, onRequestSignIn }) {
  const [showModal, setShowModal] = useState(false);
  const tags = [...getTagArray(product.interest_tags).slice(0,1), ...getTagArray(product.occasion_tags).slice(0,1)].slice(0,2);
  const url = product.affiliate_url || product.product_url || "#";

  const numericPrice =
    typeof product?.numeric_price === "number" ? product.numeric_price : null;
  const displayPrice =
    numericPrice != null
      ? formatCurrency(numericPrice, product?.currency || "GBP")
      : "Price unavailable";

  return (
    <>
      <article
        className="rounded-[22px] bg-white border border-[#f0dfd6] overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
        onClick={() => setShowModal(true)}
      >
        <div className="w-full aspect-[4/3] overflow-hidden bg-[#fdf5f0]">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.title}
              className="w-full h-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => onImageError?.(product.id)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#ead8ca] via-[#dbc0a8] to-[#c4a17f]" />
          )}
        </div>
        <div className="p-4">
          <p className="text-[13px] font-semibold text-slate-900 leading-tight line-clamp-2 mb-1">{product.title}</p>
          <p className="text-[12px] font-bold text-[#df7b59] mb-1">{displayPrice}</p>
          {product.retailer && <p className="text-[11px] text-slate-400 mb-2">{product.retailer}</p>}
          {tags.length > 0 && (
            <div className="flex gap-1 flex-wrap mb-3">
              {tags.map(t => (
                <span key={t} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#fff4ee] text-[#df7b59]">{t}</span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
              className="flex-1 h-9 flex items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[12px] font-semibold text-white">
              View item
            </a>
            <button type="button" onClick={(e) => { e.stopPropagation(); onRequestSignIn(); }}
              className="flex-1 h-9 flex items-center justify-center rounded-full border border-[#ead8ce] text-[12px] font-semibold text-slate-600 hover:bg-[#fff5f0]">
              Save to hints
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
                <img src={product.image_url} alt={product.title} className="w-full object-contain" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full bg-gradient-to-br from-[#ead8ca] via-[#dbc0a8] to-[#c4a17f] flex items-center justify-center text-6xl" style={{ height: "200px" }}>🎁</div>
              )}
            </div>
            <div className="p-5">
              <p className="text-[18px] font-semibold text-slate-900 leading-tight mb-1">{product.title}</p>
              {product.retailer && <p className="text-[13px] text-slate-400 mb-1">{product.retailer}</p>}
              <p className="text-[15px] font-bold text-[#df7b59] mb-4">{displayPrice}</p>
              {tags.length > 0 && (
                <div className="flex gap-1 flex-wrap mb-4">
                  {tags.map(t => (
                    <span key={t} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#fff4ee] text-[#df7b59]">{t}</span>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="flex-1 h-11 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[13px] font-semibold text-white flex items-center justify-center shadow-lg">
                  View item →
                </a>
                <button type="button" onClick={() => onRequestSignIn()}
                  className="flex-1 h-11 rounded-full border border-[#ead8ce] bg-white text-[13px] font-semibold text-slate-700 flex items-center justify-center">
                  Save to hints
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function GiftShopPage() {
  const { formatCurrency } = useCurrencyFormatter();
  const [authOpen, setAuthOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);
  const [search, setSearch] = useState("");
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
      .then(data => { setProducts(Array.isArray(data?.products) ? data.products : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const workingProducts = useMemo(
    () => products.filter(p => p.image_url && !brokenImageIds.has(p.id)),
    [products, brokenImageIds]
  );

  const filtered = useMemo(() => {
    let list = workingProducts;
    if (activeCategory) {
      list = list.filter(p => getTagArray(p.interest_tags).includes(activeCategory) || getTagArray(p.occasion_tags).includes(activeCategory));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.title?.toLowerCase().includes(q) || p.retailer?.toLowerCase().includes(q));
    }
    return list;
  }, [workingProducts, activeCategory, search]);

  const featured = useMemo(() => workingProducts.slice(0, 4), [workingProducts]);

  return (
    <PublicShell>
      <div className="max-w-[1200px] mx-auto px-4 py-8 md:px-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-[32px] md:text-[44px] font-extrabold tracking-[-0.04em] text-slate-900 mb-3">
            The Gift Shop
          </h1>
          <p className="text-[15px] text-slate-500 max-w-[480px] mx-auto">
            Curated gifts for everyone. Save your favourites to your HintDrop wishlist.
          </p>
        </div>

        {/* Bestsellers */}
        {!activeCategory && !search && featured.length > 0 && (
          <div className="mb-10">
            <h2 className="text-[18px] font-semibold text-slate-900 mb-4">🏆 Bestsellers</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {featured.map(p => <GiftCard key={p.id} product={p} formatCurrency={formatCurrency} onImageError={handleImageError} onRequestSignIn={() => setAuthOpen(true)} />)}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search gifts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-11 rounded-full border border-[#ead8ce] px-5 text-[14px] bg-white outline-none focus:border-[#ff875d]"
          />
        </div>

        {/* Category pills */}
        <div className="flex gap-2 flex-wrap mb-6">
          <button type="button"
            onClick={() => setActiveCategory(null)}
            className={`h-9 px-4 rounded-full text-[13px] font-semibold transition ${!activeCategory ? "bg-[#ff875d] text-white" : "border border-[#ead8ce] text-slate-600 hover:bg-[#fff5f0]"}`}>
            All
          </button>
          {CATEGORIES.map(cat => (
            <button key={cat} type="button"
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`h-9 px-4 rounded-full text-[13px] font-semibold transition ${activeCategory === cat ? "bg-[#ff875d] text-white" : "border border-[#ead8ce] text-slate-600 hover:bg-[#fff5f0]"}`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({length: 8}).map((_, i) => (
              <div key={i} className="rounded-[22px] bg-[#f5f0ee] animate-pulse" style={{aspectRatio:"4/3"}} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-slate-400 py-16">No gifts found</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {filtered.map(p => <GiftCard key={p.id} product={p} formatCurrency={formatCurrency} onImageError={handleImageError} onRequestSignIn={() => setAuthOpen(true)} />)}
          </div>
        )}

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
