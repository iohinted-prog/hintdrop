"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import GoogleAuthButtons from "./components/GoogleAuthButtons";

const PRODUCTS = [
  {
    id: "1",
    title: "Le Creuset Signature casserole",
    retailer: "John Lewis",
    price: "£245",
    image:
      "https://images.unsplash.com/photo-1514986888952-8cd320577b68?auto=format&fit=crop&w=1200&q=80",
    shortNote:
      "A beautiful kitchen gift that works especially well for weddings, anniversaries, and people who genuinely love to cook.",
    interestTags: ["Home", "Food"],
    occasionTags: ["Wedding", "Anniversary"],
    category: "Home · Cooking",
    href: "https://www.johnlewis.com/",
  },
  {
    id: "2",
    title: "Weekend treehouse stay",
    retailer: "Airbnb",
    price: "From £180",
    image:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    shortNote:
      "A memorable experience gift for couples, milestone birthdays, or anyone who would rather make memories than unwrap another thing.",
    interestTags: ["Travel", "Experiences"],
    occasionTags: ["Anniversary", "Just because"],
    category: "Experiences · Travel",
    href: "https://www.airbnb.co.uk/",
  },
  {
    id: "3",
    title: "Silk pillowcase gift set",
    retailer: "Etsy",
    price: "£42",
    image:
      "https://images.unsplash.com/photo-1616628182509-6f0c7ab0d15f?auto=format&fit=crop&w=1200&q=80",
    shortNote:
      "An easy present that still feels polished, personal, and nice enough to impress without overthinking it.",
    interestTags: ["Beauty", "Home"],
    occasionTags: ["Birthday", "Thank you"],
    category: "Beauty · Home",
    href: "https://www.etsy.com/uk/",
  },
  {
    id: "4",
    title: "Noise-cancelling headphones",
    retailer: "Amazon",
    price: "£119",
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80",
    shortNote:
      "A dependable bigger-ticket gift for commuters, students, and anyone who would love a quieter everyday routine.",
    interestTags: ["Tech", "Music"],
    occasionTags: ["Graduation", "Birthday"],
    category: "Tech · Everyday",
    href: "https://www.amazon.co.uk/",
  },
  {
    id: "5",
    title: "Ceramics workshop for two",
    retailer: "ClassBento",
    price: "£95",
    image:
      "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=1200&q=80",
    shortNote:
      "A strong pick for people who love doing something together and would value the day itself as much as the gift.",
    interestTags: ["Experiences", "Hobbies"],
    occasionTags: ["Just because", "Birthday"],
    category: "Experiences · Creative",
    href: "https://classbento.co.uk/",
  },
  {
    id: "6",
    title: "Coffee brewing set",
    retailer: "Hasbean",
    price: "£58",
    image:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
    shortNote:
      "Great for everyday rituals, first homes, and people who appreciate practical gifts that still feel special.",
    interestTags: ["Food", "Home"],
    occasionTags: ["Housewarming", "Thank you"],
    category: "Home · Coffee",
    href: "https://www.hasbean.co.uk/",
  },
  {
    id: "7",
    title: "Luxury bath and unwind box",
    retailer: "Not On The High Street",
    price: "£36",
    image:
      "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80",
    shortNote:
      "A soft, easy gift for birthdays and thank-yous, especially for people who rarely buy this kind of treat for themselves.",
    interestTags: ["Wellness", "Beauty"],
    occasionTags: ["Thank you", "Birthday"],
    category: "Wellness · Beauty",
    href: "https://www.notonthehighstreet.com/",
  },
  {
    id: "8",
    title: "Hardback collector’s edition",
    retailer: "Waterstones",
    price: "£28",
    image:
      "https://images.unsplash.com/photo-1524578271613-d550eacf6090?auto=format&fit=crop&w=1200&q=80",
    shortNote:
      "A thoughtful choice for readers, graduates, and anyone who appreciates a keepsake version of something they already love.",
    interestTags: ["Books"],
    occasionTags: ["Graduation", "Birthday"],
    category: "Books · Keepsake",
    href: "https://www.waterstones.com/",
  },
  {
    id: "9",
    title: "Cashmere scarf",
    retailer: "John Lewis",
    price: "£69",
    image:
      "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?auto=format&fit=crop&w=1200&q=80",
    shortNote:
      "Classic, useful, and easy to gift well when you want something elevated without getting too personal on size or fit.",
    interestTags: ["Fashion"],
    occasionTags: ["Birthday", "Thank you"],
    category: "Fashion · Accessories",
    href: "https://www.johnlewis.com/",
  },
  {
    id: "10",
    title: "Fresh flower subscription",
    retailer: "Bloom & Wild",
    price: "From £30",
    image:
      "https://images.unsplash.com/photo-1468327768560-75b778cbb551?auto=format&fit=crop&w=1200&q=80",
    shortNote:
      "A lovely option for anniversaries, thank-yous, and people who enjoy something beautiful arriving after the day itself.",
    interestTags: ["Home", "Wellness"],
    occasionTags: ["Anniversary", "Thank you"],
    category: "Home · Flowers",
    href: "https://www.bloomandwild.com/",
  },
  {
    id: "11",
    title: "Leather travel wallet",
    retailer: "Etsy",
    price: "£34",
    image:
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1200&q=80",
    shortNote:
      "A practical but polished present for frequent travellers, honeymoon plans, or someone with a trip already coming up.",
    interestTags: ["Travel", "Fashion"],
    occasionTags: ["Wedding", "Just because"],
    category: "Travel · Accessories",
    href: "https://www.etsy.com/uk/",
  },
  {
    id: "12",
    title: "Portable projector",
    retailer: "Amazon",
    price: "£89",
    image:
      "https://images.unsplash.com/photo-1520342868574-5fa3804e551c?auto=format&fit=crop&w=1200&q=80",
    shortNote:
      "A fun home gift for film nights, small spaces, and people who enjoy cosy hosting or low-effort gatherings.",
    interestTags: ["Tech", "Home"],
    occasionTags: ["Housewarming", "Birthday"],
    category: "Tech · Home",
    href: "https://www.amazon.co.uk/",
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
    <article className="mb-6 break-inside-avoid overflow-hidden rounded-[28px] border border-[#eddacf] bg-white shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-md">
      <div className="relative overflow-hidden">
        <img
          src={product.image}
          alt={product.title}
          className="h-auto w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
          loading="lazy"
          referrerPolicy="no-referrer"
        />

        <div className="absolute left-4 right-4 top-4 z-20 flex items-start justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={`${product.id}-${tag}`}
                className="rounded-full border border-white/70 bg-white/88 px-3 py-1 text-[11px] font-semibold text-slate-700 backdrop-blur-sm"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="rounded-full bg-white/92 px-3 py-1 text-[11px] font-semibold text-[#cf6f4d] shadow-sm">
            {product.price}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#c27a5d]">
          {product.category}
        </p>

        <h3 className="mt-2 text-[22px] font-semibold leading-[1.05] tracking-[-0.05em] text-slate-900">
          {product.title}
        </h3>

        <p className="mt-2 text-[13px] font-medium text-slate-500">{product.retailer}</p>

        <p className="mt-3 text-[14px] leading-6 text-slate-600">{product.shortNote}</p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-[14px] font-semibold text-[#2f5d50]">{product.price}</p>

          <a
            href={product.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-[#fff5f0]"
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
        Try a broader search or clear a filter to bring more ideas back into view.
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

export default function HomePageClient() {
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

  return (
    <main className="min-h-screen bg-[#fffaf7] text-slate-800">
      <div className="mx-auto max-w-[1380px] px-5 pb-16 pt-6 md:px-8">
        <header className="grid items-center gap-5 pb-8 lg:grid-cols-[auto_1fr_auto] lg:gap-8">
          <LandingLogo />

          <nav className="hidden items-center justify-center gap-9 text-[15px] text-slate-600 lg:flex">
            <Link href="/" className="transition hover:text-slate-900">
              Home
            </Link>
            <Link href="/gift-shop" className="transition hover:text-slate-900">
              Gift Shop
            </Link>
          </nav>

          <div className="flex items-center justify-start gap-4 whitespace-nowrap sm:justify-end">
            <GoogleAuthButtons variant="header-login" />
            <GoogleAuthButtons variant="header-get-started" />
          </div>
        </header>

        <section className="rounded-[34px] border border-[#eeddd3] bg-[#fff7f2] p-4 shadow-[0_18px_60px_rgba(173,101,72,0.10)] sm:p-5">
          <div className="rounded-[28px] border border-[#f1dfd6] bg-white p-5 sm:p-6">
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="min-w-0">
                <div className="inline-flex rounded-full bg-[#fff4ee] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#e37b57]">
                  Gift shop
                </div>

                <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.06em] text-slate-900 sm:text-[40px]">
                  Thoughtful gift ideas, ready to browse.
                </h1>

                <p className="mt-3 max-w-[760px] text-[15px] leading-7 text-slate-600">
                  Explore curated picks for birthdays, weddings, thank-yous, new homes,
                  and everyday generous moments. Filter by occasion or interest, then
                  open any item to take a closer look with the retailer.
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
                            ? "border-[#3c4d39] bg-[#2f3b2d] text-white"
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
                      Showing {filteredProducts.length} matching gift idea
                      {filteredProducts.length === 1 ? "" : "s"}.
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
                  Browse better
                </p>

                <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.04em] text-slate-900">
                  Start with what fits the person.
                </h2>

                <div className="mt-4 space-y-3">
                  <div className="rounded-[20px] bg-[#faf7f4] p-4">
                    <span className="inline-flex rounded-full bg-[#fff4ee] px-2.5 py-1 text-[11px] font-semibold text-[#df7b59]">
                      Occasion
                    </span>
                    <p className="mt-3 text-[13px] leading-6 text-slate-600">
                      Narrow things down for birthdays, weddings, housewarmings, thank-yous, and more.
                    </p>
                  </div>

                  <div className="rounded-[20px] bg-[#faf7f4] p-4">
                    <span className="inline-flex rounded-full bg-[#eef4ef] px-2.5 py-1 text-[11px] font-semibold text-[#54714a]">
                      Interest
                    </span>
                    <p className="mt-3 text-[13px] leading-6 text-slate-600">
                      Use interests to find ideas that feel more personal from the start.
                    </p>
                  </div>

                  <div className="rounded-[20px] bg-[#faf7f4] p-4">
                    <span className="inline-flex rounded-full bg-[#fff5ef] px-2.5 py-1 text-[11px] font-semibold text-[#c86d4f]">
                      Open
                    </span>
                    <p className="mt-3 text-[13px] leading-6 text-slate-600">
                      Each card links straight out so you can check details, pricing, and availability with the retailer.
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-[20px] bg-[#fff8f4] p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    Want the full Hinted experience?
                  </p>
                  <p className="mt-2 text-[13px] leading-6 text-slate-500">
                    Sign in to save ideas, organise them around people and dates, and bring shopping into hints, reminders, and circles.
                  </p>

                  <div className="mt-4">
                    <GoogleAuthButtons variant="hero-primary" />
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[28px] font-semibold tracking-[-0.04em] text-slate-900">
                Gift ideas
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {filteredProducts.length} item{filteredProducts.length === 1 ? "" : "s"} currently showing.
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
              {filteredProducts.length ? (
                <div className="columns-1 gap-6 md:columns-2 xl:columns-3">
                  {filteredProducts.map((product) => (
                    <ShopCard key={product.id} product={product} />
                  ))}
                </div>
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
