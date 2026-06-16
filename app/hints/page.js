import Link from "next/link";

export const metadata = {
  title: "Hints | Hinted.io",
  description: "Collect, organise, and move gift ideas around a visual hints board.",
};

const hints = [
  {
    id: 1,
    title: "Weekend cabin stay",
    retailer: "airbnb.co.uk",
    priceLabel: "From £320",
    priceBand: "high",
    image: "from-[#d9dfcf] via-[#b9c7aa] to-[#90a27e]",
    tags: ["Travel", "Big gift"],
    starred: true,
    private: false,
    size: "tall",
  },
  {
    id: 2,
    title: "Noise-cancelling headphones",
    retailer: "amazon.co.uk",
    priceLabel: "About £249",
    priceBand: "high",
    image: "from-[#ead8ca] via-[#dbc0a8] to-[#c4a17f]",
    tags: ["Tech", "Birthday"],
    starred: true,
    private: false,
    size: "tall",
  },
  {
    id: 3,
    title: "Ceramics workshop for two",
    retailer: "classbento.co.uk",
    priceLabel: "About £78",
    priceBand: "mid",
    image: "from-[#f3d5cc] via-[#e9b39f] to-[#d98c76]",
    tags: ["Experience", "Couples"],
    starred: false,
    private: false,
    size: "portrait",
  },
  {
    id: 4,
    title: "Silk pillowcase set",
    retailer: "johnlewis.com",
    priceLabel: "About £45",
    priceBand: "small",
    image: "from-[#efe5de] via-[#e5d2c8] to-[#d1b2a4]",
    tags: ["Home", "Under £50"],
    starred: false,
    private: true,
    size: "square",
  },
  {
    id: 5,
    title: "Kindle Paperwhite",
    retailer: "amazon.co.uk",
    priceLabel: "About £159",
    priceBand: "premium",
    image: "from-[#d5dbee] via-[#b3c0df] to-[#8f9fc9]",
    tags: ["Books", "Everyday"],
    starred: false,
    private: false,
    size: "portrait",
  },
  {
    id: 6,
    title: "Art print for the living room",
    retailer: "etsy.com",
    priceLabel: "About £38",
    priceBand: "small",
    image: "from-[#eadce8] via-[#d8bfd1] to-[#bb9ab6]",
    tags: ["Home", "Art"],
    starred: false,
    private: false,
    size: "square",
  },
  {
    id: 7,
    title: "Cast-iron casserole dish",
    retailer: "johnlewis.com",
    priceLabel: "About £89",
    priceBand: "mid",
    image: "from-[#d9d1cb] via-[#bcaea1] to-[#8a7566]",
    tags: ["Cooking", "Home"],
    starred: false,
    private: false,
    size: "portrait",
  },
  {
    id: 8,
    title: "Pourover coffee set",
    retailer: "hasbean.co.uk",
    priceLabel: "About £62",
    priceBand: "mid",
    image: "from-[#d6e7eb] via-[#b5ced7] to-[#8fb3c5]",
    tags: ["Coffee", "Home"],
    starred: false,
    private: true,
    size: "square",
  },
];

function LogoMark() {
  return (
    <div className="relative flex h-11 w-11 items-center justify-center rounded-[16px] bg-gradient-to-b from-[#ffa47f] to-[#ff875d] text-white shadow-lg">
      <span className="text-lg">🎁</span>
    </div>
  );
}

function AvatarMenu() {
  return (
    <div className="relative group">
      <button
        className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-b from-[#efc3af] to-[#ae6e57] text-sm font-bold text-white ring-4 ring-white/70"
        aria-label="Open account menu"
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

function getTileClass(size) {
  if (size === "tall") return "md:col-span-3 md:row-span-8";
  if (size === "portrait") return "md:col-span-3 md:row-span-6";
  return "md:col-span-3 md:row-span-4";
}

function getPricePill(priceBand) {
  if (priceBand === "high") return "bg-[#2f3b2d] text-white";
  if (priceBand === "premium") return "bg-[#fff1e9] text-[#df7c59]";
  if (priceBand === "mid") return "bg-[#f3f0ff] text-[#7c61bf]";
  return "bg-[#f1f5ec] text-[#627f53]";
}

function HintTile({ hint }) {
  return (
    <article
      className={`group relative flex h-full min-h-[220px] cursor-move flex-col overflow-hidden rounded-[30px] border transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(176,118,86,0.14)] ${getTileClass(hint.size)} ${
        hint.private
          ? "border-white/50 bg-white/55 shadow-[0_10px_28px_rgba(176,118,86,0.08)] backdrop-blur-sm"
          : "border-[#f0dfd6] bg-white shadow-sm"
      }`}
      draggable
    >
      <div className={`relative flex-1 bg-gradient-to-br ${hint.image} ${hint.private ? "opacity-80" : ""}`}>
        <div className="absolute left-4 right-4 top-4 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-white/72 px-3 py-1 text-[11px] font-semibold text-slate-700 backdrop-blur-sm">
              ⋮⋮ Drag
            </div>

            {hint.starred && (
              <div className="rounded-full bg-[#fff2ea] px-3 py-1 text-[11px] font-semibold text-[#e27956]">
                Top pick
              </div>
            )}

            {hint.private && (
              <div className="rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold text-slate-600 backdrop-blur-sm">
                Private
              </div>
            )}
          </div>

          <button
            className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-white/68 text-[16px] backdrop-blur-sm ${
              hint.starred ? "text-[#f36f64]" : "text-slate-400 hover:text-[#f36f64]"
            }`}
            aria-label={hint.starred ? "Unhighlight hint" : "Highlight hint"}
          >
            ★
          </button>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
          <div className={`rounded-[24px] p-4 backdrop-blur-md ${hint.private ? "bg-white/62" : "bg-white/82"}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getPricePill(hint.priceBand)}`}>
                {hint.priceLabel}
              </span>
              {hint.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[#f8f5f2] px-2.5 py-1 text-[11px] font-medium text-slate-500"
                >
                  {tag}
                </span>
              ))}
            </div>

            <h2 className="mt-3 text-[20px] font-semibold tracking-[-0.04em] text-slate-900">
              {hint.title}
            </h2>

            <p className="mt-1 text-[13px] text-slate-500">
              {hint.retailer}
            </p>

            <div className="mt-4 flex items-center justify-end">
              <button className="rounded-full border border-[#eadfd8] bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-[#faf7f4]">
                Open
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function HintsPage() {
  return (
    <main className="min-h-screen bg-[#fffaf7] text-slate-800">
      <header className="border-b border-[#efe0d7] bg-[#fffaf7]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between px-5 py-4 md:px-8">
          <Link href="/feed" className="flex items-center gap-3.5">
            <LogoMark />
            <div className="text-[22px] font-extrabold tracking-[-0.05em] text-slate-900">
              Hinted<span className="text-[#f36f64]">.io</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/feed"
              className="inline-flex h-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-5 text-[14px] font-semibold text-slate-700 hover:bg-[#fff5f0]"
            >
              Feed
            </Link>
            <Link
              href="/circles"
              className="inline-flex h-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-5 text-[14px] font-semibold text-slate-700 hover:bg-[#fff5f0]"
            >
              Circles
            </Link>
            <AvatarMenu />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1480px] px-5 py-10 md:px-8">
        <section className="text-center">
          <h1 className="text-[32px] font-extrabold tracking-[-0.06em] text-[#f19a78] sm:text-[44px] md:text-[56px]">
            Paste a hint to begin...
          </h1>

          <div className="mt-6">
            <div className="mx-auto flex w-full max-w-[980px] flex-col gap-3 sm:flex-row">
              <input
                id="hint-link"
                type="url"
                placeholder="Paste any product, wishlist, or experience link"
                className="h-[72px] w-full rounded-full border border-[#eadcd3] bg-white px-8 text-[16px] text-slate-700 outline-none focus:border-[#f19a78]/60 focus:ring-4 focus:ring-[#f19a78]/10"
              />
              <button className="inline-flex h-[72px] shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-8 text-sm font-semibold text-white shadow-lg sm:min-w-[170px]">
                Add hint
              </button>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <div className="relative rounded-[36px] border border-[#efdfd6] bg-[#fffdfb] p-3 sm:p-5">
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

            <div className="relative grid auto-rows-[42px] grid-cols-1 gap-6 md:grid-cols-12">
              {hints.map((hint) => (
                <HintTile key={hint.id} hint={hint} />
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
