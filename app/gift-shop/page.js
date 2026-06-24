"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import GoogleAuthButtons from "../components/GoogleAuthButtons";

const PRODUCTS = [
  {
    id: "1",
    title: "Le Creuset Signature casserole",
    retailer: "johnlewis.com",
    price: "£245",
    image:
      "https://images.unsplash.com/photo-1514986888952-8cd320577b68?auto=format&fit=crop&w=1200&q=80",
    url: "https://www.johnlewis.com/",
    shortNote:
      "A lasting kitchen gift for weddings, anniversaries, and serious home cooks.",
    interestTags: ["Home", "Food"],
    occasionTags: ["Wedding", "Anniversary"],
    category: "Home · Cooking",
  },
  {
    id: "2",
    title: "Weekend treehouse stay",
    retailer: "airbnb.co.uk",
    price: "From £180",
    image:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    url: "https://www.airbnb.co.uk/",
    shortNote:
      "An experience-led gift that feels generous without becoming generic.",
    interestTags: ["Travel", "Experiences"],
    occasionTags: ["Anniversary", "Just because"],
    category: "Experiences · Travel",
  },
  {
    id: "3",
    title: "Silk pillowcase gift set",
    retailer: "etsy.com",
    price: "£42",
    image:
      "https://images.unsplash.com/photo-1616628182509-6f0c7ab0d15f?auto=format&fit=crop&w=1200&q=80",
    url: "https://www.etsy.com/uk/",
    shortNote:
      "Easy to post, easy to love, and still personal enough to feel considered.",
    interestTags: ["Beauty", "Home"],
    occasionTags: ["Birthday", "Thank you"],
    category: "Beauty · Home",
  },
  {
    id: "4",
    title: "Noise-cancelling headphones",
    retailer: "amazon.co.uk",
    price: "£119",
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80",
    url: "https://www.amazon.co.uk/",
    shortNote:
      "A dependable higher-value gift for commuters, students, and work-from-home setups.",
    interestTags: ["Tech", "Music"],
    occasionTags: ["Graduation", "Birthday"],
    category: "Tech · Everyday",
  },
  {
    id: "5",
    title: "Ceramics workshop for two",
    retailer: "classbento.co.uk",
    price: "£95",
    image:
      "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=1200&q=80",
    url: "https://classbento.co.uk/",
    shortNote:
      "A thoughtful pick for people who prefer memories and time together over objects.",
    interestTags: ["Experiences", "Hobbies"],
    occasionTags: ["Just because", "Birthday"],
    category: "Experiences · Creative",
  },
  {
    id: "6",
    title: "Coffee brewing set",
    retailer: "hasbean.co.uk",
    price: "£58",
    image:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
    url: "https://www.hasbean.co.uk/",
    shortNote:
      "A strong option for everyday rituals, first homes, and low-risk gifting.",
    interestTags: ["Food", "Home"],
    occasionTags: ["Housewarming", "Thank you"],
    category: "Home · Coffee",
  },
  {
    id: "7",
    title: "Luxury bath and unwind box",
    retailer: "notonthehighstreet.com",
    price: "£36",
    image:
      "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80",
    url: "https://www.notonthehighstreet.com/",
    shortNote:
      "Soft, easy gifting for thank-yous, birthdays, and people who never buy this sort of thing for themselves.",
    interestTags: ["Wellness", "Beauty"],
    occasionTags: ["Thank you", "Birthday"],
    category: "Wellness · Beauty",
  },
  {
    id: "8",
    title: "Hardback collector’s edition",
    retailer: "waterstones.com",
    price: "£28",
    image:
      "https://images.unsplash.com/photo-1524578271613-d550eacf6090?auto=format&fit=crop&w=1200&q=80",
    url: "https://www.waterstones.com/",
    shortNote:
      "A safe but still thoughtful pick for readers, graduates, and quiet celebrators.",
    interestTags: ["Books"],
    occasionTags: ["Graduation", "Birthday"],
    category: "Books · Keepsake",
  },
];

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

function LandingLogo() {
  return (
    <div className="flex items-center gap-3.5">
      <div className="relative flex h-[52px] w-[52px] items-center justify-center rounded-[18px] bg-gradient-to-b from-[#ffa47f] to-[#ff875d] text-2xl text-white shadow-lg">
        🎁
      </div>
      <div className="text-[22px] font-extrabold tracking-[-0.04em] text-slate-900">
        Hinted<span className="text-[#f36f64]">.io</span>
      </div>
    </div>
  );
}

function ShopCard({ product }) {
  const tags = [...product.interestTags.slice(0, 1), ...product.occasionTags.slice(0, 1)];

  return (
    <article
      className="group relative w-full overflow-hidden rounded-[30px] border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.60)] transition-all duration-300 hover:-translate-y-1"
      style={{
        aspectRatio: 0.9,
        maxHeight: "min(540px, 68vh)",
        boxShadow:
          "0 10px 30px rgba(176,118,86,0.10), inset 0 1px 0 rgba(255,255,255,0.24)",
      }}
    >
      <div className="absolute inset-0">
        <img
          src={product.image}
          alt={product.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(16,12,10,0.84)_0%,rgba(16,12,10,0.40)_30%,rgba(16,12,10,0.10)_55%,rgba(255,255,255,0)_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(22,18,16,0.72)] via-[rgba(22,18,16,0.18)] to-transparent" />
      </div>

      <div className="absolute left-4 right-4 top-4 z-30 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {tags.map((tag) => (
            <span
              key={`${product.id}-${tag}`}
              className="rounded-full border border-white/45 bg-white/76 px-3 py-1 text-[11px] font-semibold text-slate-700 backdrop-blur-md"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="rounded-full border border-[#ffd8c9] bg-[#fff2ea] px-3 py-1 text-[11px] font-semibold text-[#e27956]">
          {product.price}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-4 sm:p-5">
        <div className="min-w-0">
          <h3
            className="overflow-hidden text-[22px] font-semibold tracking-[-0.05em] text-white"
            style={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
              lineClamp: 2,
              textShadow: "0 1px 2px rgba(0,0,0,0.24)",
            }}
          >
            {product.title}
          </h3>

          <p className="mt-1 truncate text-[13px] text-white/80">{product.retailer}</p>

          <p
            className="mt-3 overflow-hidden text-[13px] leading-6 text-white/84"
            style={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 3,
              lineClamp: 3,
            }}
          >
            {product.shortNote}
          </p>

          <p className="mt-3 text-[12px] text-white/72">{product.category}</p>
        </div>

        <div className="pointer-events-auto mt-4 flex flex-wrap items-center gap-2">
          <Link
            href="/#signup"
            className="rounded-full border border-[#ffb38f] bg-[#ff875d] px-3 py-1.5 text-[12px] font-medium text-white backdrop-blur-md hover:bg-[#f47145]"
          >
            Sign in to save
          </Link>

          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-white/45 bg-white/76 px-3 py-1.5 text-[12px] font-medium text-slate-700 backdrop-blur-md hover:bg-white"
          >
            Open
          </a>
        </div>
      </div>
    </article>
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
        Try clearing a filter or broadening your search to see more public picks.
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

export default function GiftShopPage() {
  const [selectedOccasion, setSelectedOccasion] = useState("");
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  function toggleInterest(interest) {
    setSelectedInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest].slice(0, 5)
    );
  }

  function clearFilters() {
    setSelectedOccasion("");
    setSelectedInterests([]);
    setSearchQuery("");
  }

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return PRODUCTS.filter((product) => {
      const matchesOccasion =
        !selectedOccasion || product.occasionTags.includes(selectedOccasion);

      const matchesInterest =
        selectedInterests.length === 0 ||
        selectedInterests.some((interest) => product.interestTags.includes(interest));

      const searchable = [
        product.title,
        product.retailer,
        product.shortNote,
        product.category,
        ...product.interestTags,
        ...product.occasionTags,
      ]
        .join(" ")
        .toLowerCase();

      const matchesQuery = !query || searchable.includes(query);

      return matchesOccasion && matchesInterest && matchesQuery;
    });
  }, [searchQuery, selectedInterests, selectedOccasion]);

  const visibleProducts = filteredProducts.slice(0, 6);
  const hiddenCount = Math.max(filteredProducts.length - visibleProducts.length, 0);

  return (
    <main className="min-h-screen bg-[#fffaf7] text-slate-800">
      <div className="mx-auto max-w-[1380px] px-5 pb-16 pt-6 md:px-8">
        <header className="grid items-center gap-5 pb-8 lg:grid-cols-[auto_1fr_auto] lg:gap-8">
          <LandingLogo />

          <nav className="hidden items-center justify-center gap-9 text-[15px] text-slate-600 lg:flex">
            <Link href="/" className="transition hover:text-slate-900">
              Home
            </Link>
          </nav>

          <div className="flex items-center justify-start gap-4 whitespace-nowrap sm:justify-end">
            <GoogleAuthButtons variant="header-login" />
            <GoogleAuthButtons variant="header-get-started" />
          </div>
        </header>

        <section className="rounded-[34px] border border-[#eeddd3] bg-[#fff7f2] p-4 shadow-[0_18px_60px_rgba(173,101,72,0.10)] sm:p-5">
          <div className="rounded-[28px] border border-[#f1dfd6] bg-white p-5 sm:p-6">
            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="min-w-0">
                <div className="inline-flex rounded-full bg-[#fff4ee] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#e37b57]">
                  Curated gifting
                </div>

                <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.06em] text-slate-900 sm:text-[40px]">
                  Browse thoughtful gift ideas before you sign in.
                </h1>

                <p className="mt-3 max-w-[760px] text-[15px] leading-7 text-slate-600">
                  Explore a public preview of Shop, filter by occasion or interests,
                  and then sign in to save ideas and unlock the fuller personalised flow.
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
                        className={`inline-flex h-11 items-center justify-center rounded-full border px-4 text-sm font-semibold transition ${
                          selected
                            ? "border-[#cf6f4d] bg-[#ffefe8] text-[#c95f3d]"
                            : "border-[#ead8ce] bg-white text-slate-700 hover:bg-[#fff5f0]"
                        }`}
                      >
                        {interest}
                      </button>
                    );
                  })}
                </div>

                {(selectedOccasion || selectedInterests.length > 0 || searchQuery) && (
                  <div className="mt-4 flex items-center gap-3">
                    <p className="text-sm text-slate-500">
                      Showing {filteredProducts.length} matching public picks.
                    </p>
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-sm font-semibold text-[#cf6f4d] hover:text-[#b85d3d]"
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </div>

              <aside className="rounded-[26px] border border-[#f0dfd6] bg-[#fffdfa] p-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Public preview
                </p>

                <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.04em] text-slate-900">
                  Browse now, save after sign-in
                </h2>

                <div className="mt-4 space-y-3">
                  <div className="rounded-[20px] bg-[#faf7f4] p-4">
                    <span className="inline-flex rounded-full bg-[#fff4ee] px-2.5 py-1 text-[11px] font-semibold text-[#df7b59]">
                      Browse
                    </span>
                    <p className="mt-3 text-[13px] leading-6 text-slate-600">
                      Filter the public collection by interest, occasion, and search terms.
                    </p>
                  </div>

                  <div className="rounded-[20px] bg-[#faf7f4] p-4">
                    <span className="inline-flex rounded-full bg-[#fff1ec] px-2.5 py-1 text-[11px] font-semibold text-[#db6b57]">
                      Open
                    </span>
                    <p className="mt-3 text-[13px] leading-6 text-slate-600">
                      The light button opens the retailer or affiliate destination directly in a new tab.
                    </p>
                  </div>

                  <div className="rounded-[20px] bg-[#faf7f4] p-4">
                    <span className="inline-flex rounded-full bg-[#ffe9e8] px-2.5 py-1 text-[11px] font-semibold text-[#cf5a68]">
                      Save
                    </span>
                    <p className="mt-3 text-[13px] leading-6 text-slate-600">
                      Use the orange button to sign in when you want to save good finds into hints.
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-[20px] bg-[#fffaf7] p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    Warm palette only
                  </p>
                  <p className="mt-2 text-[13px] leading-6 text-slate-500">
                    This preview keeps the accents in peach, orange, and soft pink so it stays visually aligned with the homepage.
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[28px] font-semibold tracking-[-0.04em] text-slate-900">
                Public gift preview
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Showing up to 6 items before sign-in.
              </p>
            </div>
          </div>

          <div className="relative rounded-[36px] border border-[#efe0d7] bg-[#fffdfb] p-3 shadow-[0_12px_32px_rgba(176,118,86,0.08)] sm:p-5">
            <div
              className="pointer-events-none absolute inset-0 rounded-[36px] opacity-70"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(214, 195, 184, 0.28) 1px, transparent 1px), linear-gradient(to bottom, rgba(214, 195, 184, 0.28) 1px, transparent 1px)",
                backgroundSize: "76px 76px",
                backgroundPosition: "center center",
              }}
            />

            <div className="relative">
              {visibleProducts.length ? (
                <>
                  <div className="columns-1 gap-6 md:columns-2 xl:columns-3">
                    {visibleProducts.map((product) => (
                      <div key={product.id} className="mb-6 break-inside-avoid">
                        <ShopCard product={product} />
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-[24px] border border-[#eaded6] bg-[#fff8f4] px-5 py-4 text-center">
                    <p className="text-sm text-slate-600">
                      {hiddenCount > 0
                        ? `Sign in to see ${hiddenCount} more matching item${hiddenCount === 1 ? "" : "s"} and unlock saving.`
                        : "Sign in to unlock saving and the full shop experience."}
                    </p>
                    <Link
                      href="/#signup"
                      className="mt-3 inline-flex h-11 items-center justify-center rounded-full bg-[#ff875d] px-5 text-sm font-semibold text-white"
                    >
                      Sign in to save
                    </Link>
                  </div>
                </>
              ) : (
                <EmptyState onClear={clearFilters} />
              )}
            </div>
          </div>
        </section>

        <footer className="mt-16 border-t border-[#eaded6] bg-[#fffaf7]">
          <div className="flex flex-col gap-4 px-0 py-6 text-sm text-slate-500 lg:flex-row lg:items-center lg:justify-between">
            <p className="max-w-[720px] text-xs leading-5 text-slate-500 lg:text-sm">
              By continuing, you agree to{" "}
              <Link
                href="/terms"
                className="font-medium text-slate-700 underline underline-offset-2 transition hover:text-slate-900"
              >
                Terms
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="font-medium text-slate-700 underline underline-offset-2 transition hover:text-slate-900"
              >
                Privacy Policy
              </Link>
              .
            </p>

            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <Link href="/for-brands" className="transition hover:text-slate-900">
                For Brands
              </Link>
              <Link href="/contact" className="transition hover:text-slate-900">
                Contact
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
