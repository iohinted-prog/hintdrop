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
    <section className="mt-20 rounded-[36px] border border-[#eeddd3] bg-white px-5 py-8 shadow-[0_18px_60px_rgba(173,101,72,0.08)] md:px-8 md:py-10">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <div className="inline-flex rounded-full bg-[#fff4ec] px-3 py-1 text-xs font-medium text-[#d77958]">
            Product demo
          </div>
          <h2 className="mt-4 text-[30px] font-semibold tracking-[-0.04em] text-slate-900 sm:text-[38px]">
            A guided walkthrough is coming here.
          </h2>
          <p className="mt-4 max-w-[58ch] text-[16px] leading-7 text-slate-600">
            This section will house a short demo video showing how Hinted connects
            reminders, hints, circles, and curated shopping in one flow.
          </p>

          <div className="mt-6 space-y-3 text-sm text-slate-600">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff2ea] text-[#d77958]">
                1
              </span>
              <span>See a birthday coming up in the calendar.</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#edf4e9] text-[#5d7446]">
                2
              </span>
              <span>Open saved hints or start a circle with friends.</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff2ea] text-[#d77958]">
                3
              </span>
              <span>Browse the Shop and save the right gift idea.</span>
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-[#efdfd6] bg-[#fff8f4] p-4">
          <div className="relative flex min-h-[340px] items-center justify-center overflow-hidden rounded-[28px] border border-dashed border-[#e8cfc1] bg-gradient-to-br from-[#fff4ed] via-[#fffaf7] to-[#f4f7f1]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(239,205,191,0.35),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(152,164,125,0.22),transparent_32%)]" />
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-[0_18px_40px_rgba(145,100,76,0.12)]">
                <span className="ml-1 text-3xl text-[#d77958]">▶</span>
              </div>
              <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Demo placeholder
              </p>
              <h3 className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-slate-900">
                Product walkthrough coming soon
              </h3>
              <p className="mt-3 max-w-[40ch] text-sm leading-6 text-slate-500">
                Swap this area for your hosted demo video when it is ready.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomePageClient() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fffaf7] text-slate-800">
      <div className="mx-auto max-w-[1320px] px-5 pb-16 pt-6 md:px-8">
        <header className="grid items-center gap-5 pb-8 lg:grid-cols-[auto_1fr_auto] lg:gap-8">
          <LandingLogo />

          <nav className="hidden items-center justify-center gap-9 text-[15px] text-slate-600 lg:flex" />

          <div className="flex items-center justify-start gap-4 whitespace-nowrap sm:justify-end">
            <Link
              href="/gift-shop"
              className="inline-flex h-12 shrink-0 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-6 text-[15px] font-semibold text-slate-700 transition hover:bg-[#fff5f0]"
            >
              Gift Shop
            </Link>
            <a
              href="#signup"
              className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-6 text-[15px] font-bold text-white shadow-lg transition hover:translate-y-[-1px]"
            >
              Get started
            </a>
          </div>
        </header>

        <section className="grid items-start gap-10 xl:grid-cols-[minmax(420px,0.92fr)_minmax(560px,1.08fr)] xl:gap-10">
          <div className="py-2 lg:pl-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[14px] font-bold text-[#eb7b58] shadow-sm">
              <span>♡</span>
              <span>
                Gifting, reminders, circles, and curated shopping in one place
              </span>
            </div>

            <h1 className="mt-7 max-w-[580px] text-[48px] font-extrabold leading-[0.98] tracking-[-0.065em] text-slate-900 sm:text-[64px] lg:text-[82px]">
              Never forget.
              <br />
              <span className="text-[#ff8060]">Always thoughtful.</span>
            </h1>

            <p className="mt-7 max-w-[560px] text-[16px] leading-8 text-slate-500 sm:text-[18px]">
              HintDrop helps you remember important moments, collect better gift
              ideas, plan shared presents with friends, and browse curated picks
              when you need them.
            </p>

            <div
              id="signup"
              className="mt-8 max-w-[540px] rounded-[28px] border border-slate-200 bg-white p-6 shadow-xl md:p-7"
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[22px] font-semibold tracking-[-0.04em] text-slate-900">
                    Join HintDrop
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Keep your circles, hints, reminders, and shop saves connected
                    with a secure sign in.
                  </p>
                </div>
                <div className="rounded-full bg-[#fff0e8] px-3 py-2 text-[12px] font-bold text-[#ea7451]">
                  Google
                </div>
              </div>

              <div className="space-y-4">
                <GoogleAuthButtons variant="hero-primary" />

                <div className="rounded-[22px] border border-[#f3e4db] bg-[#fff8f4] p-4">
                  <p className="text-sm leading-6 text-slate-600">
                    New here? Use Google to create your account.
                    Returning users can log in the exact same way.
                  </p>
                </div>
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-500">
                By continuing, you agree to HintDrop’s{" "}
                <Link
                  href="/terms"
                  className="font-medium text-slate-700 underline underline-offset-2"
                >
                  Terms
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="font-medium text-slate-700 underline underline-offset-2"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3.5 text-[15px] text-slate-500">
              <AvatarStack />
              <p className="max-w-[320px]">
                Join thoughtful gifters staying on top of birthdays, milestones,
                and group surprises.
              </p>
            </div>
          </div>

          <div className="relative min-w-0">
            <div className="rounded-[34px] border border-[#efd8ce] bg-[#fff7f2] p-4 shadow-[0_25px_80px_rgba(173,101,72,0.16)] sm:p-5">
              <div className="rounded-[28px] border border-[#f1dfd6] bg-white p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-b from-[#efcdbf] to-[#bb8168] text-[16px] font-bold text-white shadow-sm ring-2 ring-[#f3dfd4]">
                      M
                    </div>
                    <div>
                      <div className="text-sm font-semibold tracking-tight text-slate-900">
                        Maya
                      </div>
                      <div className="text-xs text-slate-500">Hints</div>
                    </div>
                  </div>
                  <div className="hidden items-center gap-4 text-sm text-slate-500 md:flex">
                    <span>Feed</span>
                    <span>Circles</span>
                    <span>Shop</span>
                  </div>
                </div>

                <div className="pt-4">
                  <h2 className="text-[28px] font-semibold tracking-[-0.05em] text-slate-900 sm:text-[34px]">
                    Your hints.
                  </h2>
                  <p className="mt-2 text-[14px] leading-6 text-slate-600">
                    Keep the useful details that help you remember people,
                    conversations, gift ideas, and follow-ups.
                  </p>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    {hints.map((hint) => (
                      <HintCard
                        key={hint.id}
                        title={hint.title}
                        text={hint.text}
                        image={hint.image}
                        tag={hint.tag}
                        tag2={hint.tag2}
                        starred={hint.starred}
                        rotate={hint.rotate}
                      />
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <div className="rounded-full bg-[#2f5d50] px-4 py-2 text-sm font-semibold text-white">
                      Add hint
                    </div>
                    <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600">
                      Organise cards
                    </div>
                    <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600">
                      Customise view
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-20 rounded-[36px] border border-[#eeddd3] bg-[#fff7f2] px-5 py-8 shadow-[0_18px_60px_rgba(173,101,72,0.1)] md:px-8 md:py-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                Plan ahead
              </div>
              <h2 className="mt-4 text-[30px] font-semibold tracking-[-0.04em] text-slate-900 sm:text-[38px]">
                Calendar and reminders
              </h2>
              <p className="mt-3 max-w-[680px] text-[16px] leading-7 text-slate-600">
                Track birthdays, anniversaries, and follow-ups in one calm view,
                then branch into circles and curated shopping when it is time to
                act.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_2fr_300px]">
            <div className="rounded-[28px] border border-[#f0dfd6] bg-white p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Live updates
                  </p>
                  <h3 className="mt-1 text-[20px] font-semibold tracking-[-0.04em] text-slate-900">
                    Your feed
                  </h3>
                </div>
                <span className="flex h-2 w-2 rounded-full bg-[#f36f64]">
                  <span className="h-2 w-2 animate-ping rounded-full bg-[#f36f64] opacity-75" />
                </span>
              </div>

              <div className="space-y-3">
                {feedItems.map((item) => (
                  <FeedItem key={item.id} item={item} />
                ))}
              </div>

              <button
                className="mt-4 w-full rounded-[18px] border border-slate-200 py-2.5 text-[13px] font-medium text-slate-500 hover:bg-slate-50"
                type="button"
              >
                See all activity
              </button>
            </div>

            <div className="rounded-[28px] border border-[#f0dfd6] bg-white p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Dashboard
                  </p>
                  <h3 className="mt-1 text-[26px] font-semibold tracking-[-0.04em] text-slate-900">
                    July calendar
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500"
                    type="button"
                  >
                    ←
                  </button>
                  <button
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500"
                    type="button"
                  >
                    →
                  </button>
                </div>
              </div>

              <div className="mb-3 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
                <div>Sun</div>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day, index) => (
                  <div
                    key={`${day}-${index}`}
                    className={`min-h-[72px] rounded-[16px] border p-2 ${
                      day === "13"
                        ? "border-[#f5b49a] bg-[#fff1ea]"
                        : "border-slate-100 bg-[#fffdfa]"
                    }`}
                  >
                    <div
                      className={`text-sm font-semibold ${
                        index < 7 || index > 30
                          ? "text-slate-300"
                          : "text-slate-700"
                      }`}
                    >
                      {day}
                    </div>
                    {["29", "6", "10", "16", "24"].includes(day) ? (
                      <div className="mt-1.5 h-2 w-2 rounded-full bg-[#b78671]" />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-[#f0dfd6] bg-white p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-slate-900">
                  Upcoming reminders
                </h3>
                <span className="rounded-full bg-[#fff5ef] px-2.5 py-1 text-[11px] font-semibold text-[#e77756]">
                  3 soon
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {lowerReminders.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[22px] border border-[#f1e4dc] bg-[#fffdfa] p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-1 h-11 w-11 shrink-0 rounded-2xl bg-gradient-to-b ${item.colors}`}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{item.date}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-[24px] bg-[#2f5d50] p-5 text-white">
                <p className="text-xs uppercase tracking-[0.14em] text-white/60">
                  Gift prompt
                </p>
                <p className="mt-2 text-sm leading-7 text-white/90">
                  Sarah saved "ceramic dinnerware" and "weekend city break" to
                  her wishlist.
                </p>
                <button
                  className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-800"
                  type="button"
                >
                  View ideas
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <CircleTeaserCard />
            <ShopTeaserCard />
          </div>
        </section>

        <DemoVideoSection />

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
              <Link href="/about" className="transition hover:text-slate-900">
                About
              </Link>
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
