"use client";

import Link from "next/link";
import GoogleAuthButtons from "./GoogleAuthButtons";

const hints = [
  {
    id: 1,
    title: "Noise-cancelling headphones",
    text: "From: amazon.co.uk · ~£120",
    image: "from-[#e8d5c4] to-[#c4a882]",
    tag: "Tech",
    tag2: "Birthday",
    starred: true,
    rotate: "-rotate-1",
  },
  {
    id: 2,
    title: "Weekend cabin stay",
    text: "From: airbnb.co.uk · Price varies",
    image: "from-[#f5cfc4] to-[#e8a090]",
    tag: "Experiences",
    tag2: "Travel",
    starred: false,
    rotate: "rotate-1",
  },
  {
    id: 3,
    title: "Cast-iron casserole dish",
    text: "From: johnlewis.com · ~£85",
    image: "from-[#d9d7c7] to-[#b8aa8a]",
    tag: "Home",
    tag2: "Cooking",
    starred: false,
    rotate: "-rotate-[0.5deg]",
  },
  {
    id: 4,
    title: "Kindle or similar e-reader",
    text: "From: amazon.co.uk · ~£100",
    image: "from-[#d7e4d5] to-[#9eb293]",
    tag: "Books",
    tag2: "Everyday",
    starred: false,
    rotate: "rotate-[1.5deg]",
  },
  {
    id: 5,
    title: "Art print for the living room",
    text: "From: etsy.com · ~£40",
    image: "from-[#edd8cf] to-[#d0a18f]",
    tag: "Home",
    tag2: "Under £50",
    starred: false,
    rotate: "-rotate-[0.8deg]",
  },
  {
    id: 6,
    title: "Nice pourover coffee set",
    text: "From: hasbean.co.uk · ~£60",
    image: "from-[#dce7e0] to-[#b0c5ba]",
    tag: "Home",
    tag2: "Coffee",
    starred: false,
    rotate: "rotate-[0.6deg]",
  },
];

const feedItems = [
  {
    id: 1,
    type: "hint",
    avatar: "M",
    avatarColors: "from-[#e7cab8] to-[#b97d66]",
    name: "Mum",
    action: "added a new hint",
    detail: "Silk pillowcase set",
    time: "2m ago",
    icon: "🎁",
  },
  {
    id: 2,
    type: "reminder",
    avatar: "S",
    avatarColors: "from-[#efcdbf] to-[#c88c73]",
    name: "Sarah's Birthday",
    action: "is 2 weeks away",
    detail: "June 29 · She hinted at a ceramics workshop",
    time: "Just now",
    icon: "🎂",
  },
  {
    id: 3,
    type: "circle",
    avatar: "MF",
    avatarColors: "from-[#98a47d] to-[#5f7046]",
    name: "Max & Fiona",
    action: "Wedding Circle Pot is 80% full",
    detail: "£320 of £400 raised · 4 contributors",
    time: "1h ago",
    icon: "💍",
  },
  {
    id: 4,
    type: "hint",
    avatar: "J",
    avatarColors: "from-[#dcc4b5] to-[#b78972]",
    name: "James",
    action: "starred a hint in your shared circle",
    detail: "Weekend cabin stay · Experiences",
    time: "3h ago",
    icon: "★",
  },
];

const lowerReminders = [
  {
    title: "Sarah's Birthday",
    date: "June 29",
    colors: "from-[#efcdbf] to-[#c88c73]",
  },
  {
    title: "Mom & Dad Anniversary",
    date: "July 10",
    colors: "from-[#e7cab8] to-[#b97d66]",
  },
  {
    title: "James Promotion",
    date: "July 6",
    colors: "from-[#98a47d] to-[#5f7046]",
  },
];

const calendarDays = [
  "25",
  "26",
  "27",
  "28",
  "29",
  "30",
  "31",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
  "28",
];

const circleContributors = [
  ["CG", "from-[#efcdbf] to-[#bb8168]"],
  ["MF", "from-[#98a47d] to-[#5f7046]"],
  ["JM", "from-[#dcc4b5] to-[#b78972]"],
  ["SL", "from-[#e7cab8] to-[#b97d66]"],
];

const shopTiles = [
  {
    title: "Curated for birthdays",
    subtitle:
      "Soft, tasteful picks across John Lewis, Amazon, Airbnb, and more.",
    price: "From £28",
    tone: "from-[#f3ddd1] to-[#ddb39f]",
    badge: "Shop",
  },
  {
    title: "Best under £50",
    subtitle: "A practical edit for easy wins that still feel personal.",
    price: "12 picks",
    tone: "from-[#ebe4d7] to-[#ccbda2]",
    badge: "Edit",
  },
  {
    title: "Luxury classics",
    subtitle: "Higher-value gifts worth saving to a circle or a board.",
    price: "Premium",
    tone: "from-[#dce7e0] to-[#a8bba8]",
    badge: "Curated",
  },
];

function LandingLogo() {
  return (
    <div className="flex items-center gap-3.5">
      <div className="relative flex h-[52px] w-[52px] items-center justify-center rounded-[18px] bg-gradient-to-b from-[#ffa47f] to-[#ff875d] text-2xl text-white shadow-lg">
        🎁
      </div>
      <div className="text-[22px] font-extrabold tracking-[-0.04em] text-slate-900">
        Hint<span className="text-[#f36f64]">Drop</span>
      </div>
    </div>
  );
}
function AvatarStack() {
  const avatars = [
    ["AB", "from-[#efcdbf] to-[#bb8168]"],
    ["JM", "from-[#dcc4b5] to-[#b78972]"],
    ["SL", "from-[#e7cab8] to-[#b97d66]"],
    ["PT", "from-[#98a47d] to-[#5f7046]"],
  ];

  return (
    <div className="flex items-center">
      {avatars.map(([label, colors], index) => (
        <div
          key={label}
          className={`-ml-2.5 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-[#fff8f4] bg-gradient-to-b text-[12px] font-bold text-white first:ml-0 ${colors}`}
          style={{ zIndex: avatars.length - index }}
        >
          {label}
        </div>
      ))}
    </div>
  );
}

function HintCard({ title, text, image, tag, tag2, starred, rotate }) {
  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-[24px] border border-[#ece2db] bg-white shadow-sm transition-transform duration-200 hover:scale-[1.02] hover:shadow-md ${rotate}`}
    >
      <div className={`h-[120px] w-full bg-gradient-to-br ${image}`}>
        <div className="flex justify-end p-3">
          <div className="h-4 w-7 rounded-full bg-white/50" />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="text-[13px] font-semibold leading-tight tracking-[-0.02em] text-slate-900">
          {title}
        </h3>
        <p className="mt-1 text-[12px] text-slate-400">{text}</p>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <span className="rounded-full border border-slate-200 bg-[#faf9f7] px-2 py-0.5 text-[10px] font-medium text-slate-500">
            {tag}
          </span>
          {tag2 ? (
            <span className="rounded-full border border-slate-200 bg-[#faf9f7] px-2 py-0.5 text-[10px] font-medium text-slate-500">
              {tag2}
            </span>
          ) : null}
        </div>

        <div className="mt-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-b from-[#efcdbf] to-[#bb8168] text-[9px] font-bold text-white">
              M
            </div>
            <span className="text-[10px] text-slate-400">
              {starred ? "Top pick" : "Nice to have"}
            </span>
          </div>
          <button
            className={`text-[16px] transition-transform duration-150 hover:scale-125 ${
              starred ? "text-[#f36f64]" : "text-slate-200 hover:text-[#f36f64]"
            }`}
            aria-label={starred ? "Unstar" : "Star"}
            type="button"
          >
            ★
          </button>
        </div>
      </div>
    </article>
  );
}

function FeedItem({ item }) {
  const typeBg =
    item.type === "reminder"
      ? "bg-[#fff3ee]"
      : item.type === "circle"
        ? "bg-[#f0f7ee]"
        : "bg-[#fff7f2]";

  const typeText =
    item.type === "reminder"
      ? "text-[#d97652]"
      : item.type === "circle"
        ? "text-[#4f7440]"
        : "text-[#8b6a5a]";

  return (
    <article className="flex gap-3 rounded-[20px] border border-slate-100 bg-white p-4 shadow-sm">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-b text-[12px] font-bold text-white ${item.avatarColors}`}
      >
        {item.avatar}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] leading-[1.5] text-slate-700">
            <span className="font-semibold text-slate-900">{item.name}</span>{" "}
            {item.action}
          </p>
          <span className="shrink-0 text-[10px] text-slate-400">{item.time}</span>
        </div>

        <div
          className={`mt-2 inline-flex max-w-[220px] items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${typeBg} ${typeText}`}
        >
          <span>{item.icon}</span>
          <span className="truncate">{item.detail}</span>
        </div>
      </div>
    </article>
  );
}

function AvatarStackMini() {
  return (
    <div className="flex items-center">
      {circleContributors.map(([label, colors], index) => (
        <div
          key={label}
          className={`-ml-2.5 flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-[#f6faf3] bg-gradient-to-b text-[11px] font-bold text-white first:ml-0 ${colors}`}
          style={{ zIndex: circleContributors.length - index }}
        >
          {label}
        </div>
      ))}
    </div>
  );
}

function CircleTeaserCard() {
  return (
    <article className="rounded-[30px] border border-[#efdcd2] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8f9a78]">
            Circles
          </p>
          <h3 className="mt-2 text-[26px] font-semibold tracking-[-0.04em] text-slate-900">
            Plan shared gifts together.
          </h3>
        </div>
        <span className="rounded-full bg-[#edf4e9] px-3 py-1 text-[11px] font-semibold text-[#5c7147]">
          Group gifting
        </span>
      </div>

      <p className="mt-3 max-w-[48ch] text-sm leading-6 text-slate-600">
        Build a circle around a wedding, birthday, or milestone, invite people in,
        and watch the contribution pot fill up before the date arrives.
      </p>

      <div className="mt-5 rounded-[26px] border border-[#e7eee2] bg-[#f6faf3] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[#83906b]">
              Max & Fiona wedding
            </p>
            <p className="mt-1 text-[20px] font-semibold tracking-[-0.03em] text-slate-900">
              £320 of £400 raised
            </p>
          </div>
          <AvatarStackMini />
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#dde8d4]">
          <div className="h-full w-[80%] rounded-full bg-gradient-to-r from-[#9cad84] to-[#5f7046]" />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[20px] bg-white/80 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a9772]">
              Deadline
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">July 12</p>
          </div>
          <div className="rounded-[20px] bg-white/80 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a9772]">
              Contributors
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">4 active</p>
          </div>
          <div className="rounded-[20px] bg-white/80 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a9772]">
              Goal
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              Le Creuset set
            </p>
          </div>
        </div>
      </div>

      <Link
        href="/#signup"
        className="mt-5 inline-flex rounded-full bg-[#2f5d50] px-5 py-3 text-sm font-semibold text-white"
      >
        Explore circles
      </Link>
    </article>
  );
}

function ShopTeaserCard() {
  return (
    <article className="rounded-[30px] border border-[#efdcd2] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b28672]">
            Shop
          </p>
          <h3 className="mt-2 text-[26px] font-semibold tracking-[-0.04em] text-slate-900">
            Browse curated gifts, not endless noise.
          </h3>
        </div>
        <span className="rounded-full bg-[#fff3ec] px-3 py-1 text-[11px] font-semibold text-[#c56d4d]">
          Curated shopping
        </span>
      </div>

      <p className="mt-3 max-w-[48ch] text-sm leading-6 text-slate-600">
        Shop brings together thoughtful picks from trusted brands, so you can save
        ideas to your hints board or choose something worth funding in a circle.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {shopTiles.map((tile) => (
          <div
            key={tile.title}
            className="overflow-hidden rounded-[24px] border border-[#efe1d9] bg-[#fffdfa]"
          >
            <div className={`h-28 bg-gradient-to-br ${tile.tone}`} />
            <div className="p-4">
              <div className="inline-flex rounded-full bg-[#fff4ee] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#b4775f]">
                {tile.badge}
              </div>
              <h4 className="mt-3 text-[15px] font-semibold leading-6 text-slate-900">
                {tile.title}
              </h4>
              <p className="mt-1 text-[13px] leading-5 text-slate-500">
                {tile.subtitle}
              </p>
              <p className="mt-3 text-[13px] font-semibold text-[#2f5d50]">
                {tile.price}
              </p>
            </div>
          </div>
        ))}
      </div>

      <Link
        href="/gift-shop"
        className="mt-5 inline-flex rounded-full border border-[#e8d9cf] bg-white px-5 py-3 text-sm font-semibold text-slate-700"
      >
        Preview shop
      </Link>
    </article>
  );
}

function DemoVideoSection() {
  return (
          <footer className="mt-8 border-t border-[#eaded6]">
        <div className="flex flex-col gap-4 px-0 py-6 text-sm text-slate-500 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-xs text-slate-400">© 2026 HintDrop</p>
          <div className="flex gap-4">
            <a href="/terms" className="hover:text-slate-700">Terms</a>
            <a href="/privacy" className="hover:text-slate-700">Privacy</a>
            <a href="/about" className="hover:text-slate-700">About</a>
            <a href="/contact" className="hover:text-slate-700">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  </main>
  );
}
