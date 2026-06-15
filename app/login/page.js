import Link from "next/link";

export const metadata = {
  title: "Log in | Hinted.io",
  description: "Sign in to Hinted to keep your circles, hints, and reminders connected.",
};

const calendarDays = [
  [
    { day: "25", muted: true },
    { day: "26", muted: true },
    { day: "27", muted: true },
    { day: "28", muted: true },
    { day: "29", muted: true, event: { name: "Sarah Birthday", tone: "pink" } },
    { day: "30", muted: true },
    { day: "31", muted: true },
  ],
  [
    { day: "1" },
    { day: "2" },
    { day: "3" },
    { day: "4" },
    { day: "5" },
    { day: "6", event: { name: "James Promotion", tone: "blue" } },
    { day: "7" },
  ],
  [
    { day: "8" },
    { day: "9" },
    { day: "10", event: { name: "Mom Anniversary", tone: "peach" } },
    { day: "11" },
    { day: "12" },
    { day: "13", selected: true },
    { day: "14" },
  ],
  [
    { day: "15" },
    { day: "16", soft: true, event: { name: "Alex Birthday", tone: "pink" } },
    { day: "17" },
    { day: "18" },
    { day: "19" },
    { day: "20" },
    { day: "21" },
  ],
  [
    { day: "22" },
    { day: "23" },
    { day: "24", event: { name: "Olivia Graduation", tone: "peach" } },
    { day: "25" },
    { day: "26" },
    { day: "27" },
    { day: "28" },
  ],
  [
    { day: "29" },
    { day: "30" },
    { day: "1", muted: true },
    { day: "2", muted: true },
    { day: "3", muted: true },
    { day: "4", muted: true },
    { day: "5", muted: true },
  ],
];

const reminders = [
  {
    title: "Sarah's Birthday",
    date: "June 29",
    colors: "from-[#efc3af] to-[#ae6e57]",
  },
  {
    title: "Mom & Dad Anniversary",
    date: "July 10",
    colors: "from-[#eac8b8] to-[#9d6957]",
  },
  {
    title: "James Promotion",
    date: "July 6",
    colors: "from-[#809168] to-[#41512e]",
  },
  {
    title: "Alex's Birthday",
    date: "July 16",
    colors: "from-[#c1a79a] to-[#765549]",
  },
];

const sideNav = [
  { label: "Calendar", icon: "📅", active: true },
  { label: "Reminders", icon: "🔔" },
  { label: "People", icon: "👥" },
  { label: "Gift ideas", icon: "🎁" },
  { label: "Collections", icon: "♡" },
  { label: "Activity", icon: "↗" },
  { label: "Settings", icon: "⚙" },
];

function EventPill({ name, tone }) {
  const toneClass =
    tone === "blue"
      ? "bg-sky-50"
      : tone === "peach"
        ? "bg-[#fff4ec]"
        : "bg-[#fff3ef]";

  const dotClass =
    tone === "blue"
      ? "from-[#8fb9d4] to-[#4d7399]"
      : tone === "peach"
        ? "from-[#d9b8a4] to-[#8a5946]"
        : "from-[#d0ab96] to-[#7b4a39]";

  const [lineOne, lineTwo] = name.split(" ");

  return (
    <div
      className={`mt-2 inline-flex max-w-full items-center gap-2 rounded-full px-1 py-1 pr-2 text-[10px] leading-[1.05] text-slate-600 shadow-[0_3px_10px_rgba(15,23,42,0.05)] ${toneClass}`}
    >
      <span className={`h-5 w-5 flex-none rounded-full bg-gradient-to-b ${dotClass}`} />
      <span className="whitespace-nowrap">
        {lineOne}
        <br />
        {lineTwo}
      </span>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#fffaf7_0%,#fff6f1_100%)] text-slate-800">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(255,180,148,0.28),transparent_28%),radial-gradient(circle_at_84%_12%,rgba(255,196,175,0.34),transparent_24%),radial-gradient(circle_at_74%_76%,rgba(255,164,130,0.16),transparent_20%)]" />

      <div className="relative mx-auto w-full max-w-[1320px] px-5 pb-11 pt-6 md:px-8">
        <header className="flex flex-wrap items-center justify-between gap-6 pb-7">
          <div className="flex items-center gap-3.5">
            <div className="relative flex h-[52px] w-[52px] items-center justify-center rounded-[18px] bg-gradient-to-b from-[#ffa47f] to-[#ff875d] text-2xl text-white shadow-[0_14px_30px_rgba(243,111,100,0.22)]">
              🎁
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#ff875d]/30 bg-transparent" />
            </div>

            <div className="text-[22px] font-extrabold tracking-[-0.04em] text-slate-900">
              Hinted<span className="text-[#f36f64]">.io</span>
            </div>
          </div>

          <nav className="hidden items-center gap-9 text-[15px] text-slate-600 lg:flex">
            <Link href="/">Features</Link>
            <Link href="/">How it works</Link>
            <Link href="/">Pricing</Link>
            <Link href="/">Blog</Link>
          </nav>

          <div className="flex w-full items-center justify-center gap-4 sm:w-auto lg:gap-5">
            <Link href="/" className="text-[15px] font-semibold text-slate-800">
              Home
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-6 text-[15px] font-bold text-white shadow-[0_12px_25px_rgba(243,111,100,0.22)]"
            >
              Get started
            </Link>
          </div>
        </header>

        <section className="grid min-h-[calc(100vh-120px)] items-center gap-8 pb-10 lg:grid-cols-[1.02fr_1.16fr] lg:gap-11">
          <div className="relative py-2 lg:pl-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/75 px-4 py-2.5 text-[14px] font-bold text-[#eb7b58] shadow-[0_10px_30px_rgba(255,180,148,0.20)]">
              <span>♡</span>
              <span>Social gifting & reminders, made simple</span>
            </div>

            <h1 className="mt-7 max-w-[580px] text-[48px] font-extrabold leading-[0.98] tracking-[-0.065em] text-slate-900 sm:text-[64px] lg:text-[82px]">
              Never forget.
              <br />
              Always <span className="text-[#ff9a7b]">thoughtful.</span>
            </h1>

            <p className="mt-7 max-w-[560px] text-[16px] leading-8 text-slate-500 sm:text-[18px]">
              Hinted helps you remember the important moments and keep gift ideas close — with a little help from your circles.
            </p>

            <div className="mt-8 max-w-[540px] rounded-[30px] border border-slate-200/60 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.07)] backdrop-blur md:p-7">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[22px] font-semibold tracking-[-0.04em] text-slate-900">
                    Sign in to Hinted
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Keep your circles, hints, and reminders connected.
                  </p>
                </div>

                <div className="rounded-full bg-[#fff0e8] px-3 py-2 text-[12px] font-bold text-[#ea7451]">
                  Welcome back
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="mt-2 h-[54px] w-full rounded-[18px] border border-slate-300/70 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#f36f64]/50 focus:ring-4 focus:ring-[#f36f64]/10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900" htmlFor="password">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    placeholder="Your password"
                    className="mt-2 h-[54px] w-full rounded-[18px] border border-slate-300/70 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#f36f64]/50 focus:ring-4 focus:ring-[#f36f64]/10"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/feed"
                  className="inline-flex h-[52px] min-w-[145px] items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-5 text-sm font-semibold text-white shadow-[0_14px_26px_rgba(243,111,100,0.22)]"
                >
                  Sign in
                </Link>

                <Link
                  href="/onboarding"
                  className="inline-flex h-[52px] min-w-[160px] items-center justify-center rounded-full border border-slate-300/80 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Create account
                </Link>
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-500">
                You can use an email/password account now and connect other sign-in methods later.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-3.5 text-[15px] text-slate-500">
              <div className="flex items-center">
                {[
                  ["AB", "from-[#efb19d] to-[#b25f54]"],
                  ["JM", "from-[#4e596d] to-[#212a3c]"],
                  ["SL", "from-[#e8c5ad] to-[#a86752]"],
                  ["PT", "from-[#6f7d54] to-[#324421]"],
                ].map(([label, colors], index) => (
                  <div
                    key={label}
                    className={`-ml-2.5 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-[#fff8f4] bg-gradient-to-b text-[12px] font-bold text-white shadow-[0_8px_20px_rgba(15,23,42,0.08)] first:ml-0 ${colors}`}
                    style={{ zIndex: 5 - index }}
                  >
                    {label}
                  </div>
                ))}
              </div>

              <span>Trusted by 10,000+ happy gifters</span>
            </div>
          </div>

          <div className="relative py-5">
            <div className="rounded-[34px] border border-white/70 bg-white/75 p-3 shadow-[0_24px_80px_rgba(243,111,100,0.10),0_12px_36px_rgba(15,23,42,0.08)] backdrop-blur md:p-5">
              <div className="grid min-h-[540px] overflow-hidden rounded-[28px] border border-slate-200/50 bg-white/95 lg:grid-cols-[168px_1fr_250px]">
                <aside className="border-b border-slate-200/60 bg-gradient-to-b from-[#fffaf7] to-[#fff7f1] p-5 lg:border-b-0 lg:border-r">
                  <div className="flex h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-gradient-to-b from-[#ffa47f] to-[#ff875d] text-xl text-white shadow-[0_10px_20px_rgba(243,111,100,0.2)]">
                    🎁
                  </div>

                  <div className="mt-6 grid gap-2.5">
                    {sideNav.map((item) => (
                      <div
                        key={item.label}
                        className={`flex items-center gap-3 rounded-[14px] px-3 py-2.5 text-[14px] ${
                          item.active
                            ? "bg-gradient-to-b from-[#fff2ea] to-[#ffe8dc] font-bold text-[#ea7451]"
                            : "font-medium text-slate-600"
                        }`}
                      >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-7 rounded-[22px] bg-gradient-to-b from-[#fff8f3] to-[#fff0e6] p-4">
                    <div className="mb-3 flex h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-white text-xl text-[#f36f64] shadow-[0_8px_18px_rgba(243,111,100,0.12)]">
                      🎁
                    </div>
                    <div className="text-[14px] font-semibold leading-[1.35] text-slate-900">
                      Make every moment more meaningful.
                    </div>
                    <div className="mt-2 text-[13px] font-semibold text-[#eb7b58]">Learn more →</div>
                  </div>
                </aside>

                <div className="bg-white px-4 py-5 sm:px-6">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 text-[18px] font-bold tracking-[-0.03em] text-slate-900">
                      <span className="text-slate-400">‹</span>
                      <span>June 2025</span>
                      <span className="text-slate-400">›</span>
                    </div>
                    <div className="text-[13px] text-slate-400">Calendar view</div>
                  </div>

                  <div className="grid grid-cols-7 gap-2 px-1 text-[12px] text-slate-400">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div key={day}>{day}</div>
                    ))}
                  </div>

                  <div className="mt-3 grid grid-cols-7 gap-2">
                    {calendarDays.flat().map((item, index) => (
                      <div
                        key={`${item.day}-${index}`}
                        className={`min-h-[66px] rounded-[18px] px-2 py-2 text-[14px] ${
                          item.selected
                            ? "grid place-items-center bg-gradient-to-b from-[#ff895d] to-[#ff7b4e] font-extrabold text-white shadow-[0_12px_24px_rgba(243,111,100,0.22)]"
                            : item.soft
                              ? "bg-[#fff5f2] text-slate-700"
                              : item.muted
                                ? "text-slate-300"
                                : "text-slate-700"
                        }`}
                      >
                        {item.selected ? (
                          item.day
                        ) : (
                          <div>
                            <div>{item.day}</div>
                            {item.event ? <EventPill name={item.event.name} tone={item.event.tone} /> : null}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <aside className="border-t border-slate-200/60 bg-gradient-to-b from-white to-[#fffaf7] p-5 lg:border-l lg:border-t-0">
                  <div className="mb-6 flex items-center justify-end gap-3 text-[13px] text-slate-500">
                    <span>🔔</span>
                    <span className="h-[34px] w-[34px] rounded-full bg-gradient-to-b from-[#f7c7ad] to-[#d68c71] shadow-[0_8px_18px_rgba(15,23,42,0.08)]" />
                    <span>⌄</span>
                  </div>

                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-[18px] font-semibold tracking-[-0.03em] text-slate-900">
                      Upcoming reminders
                    </h3>
                    <Link href="/" className="text-[13px] font-semibold text-[#eb7b58]">
                      View all
                    </Link>
                  </div>

                  <div className="grid gap-3">
                    {reminders.map((item) => (
                      <div
                        key={item.title}
                        className="grid grid-cols-[42px_1fr_24px] items-center gap-3 rounded-[18px] border border-slate-200/50 bg-white p-3 shadow-[0_8px_20px_rgba(15,23,42,0.05)]"
                      >
                        <div className={`h-[42px] w-[42px] rounded-full bg-gradient-to-b ${item.colors}`} />
                        <div>
                          <div className="text-[14px] font-semibold leading-[1.3] text-slate-900">
                            {item.title}
                          </div>
                          <div className="mt-0.5 text-[13px] text-slate-400">{item.date}</div>
                        </div>
                        <div className="grid h-6 w-6 place-items-center rounded-full bg-[#fff2ea] text-[14px] text-[#f36f64]">
                          🎁
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="relative mt-4 min-h-[142px] overflow-hidden rounded-[22px] bg-[radial-gradient(circle_at_88%_78%,rgba(255,157,124,0.28),transparent_24%),linear-gradient(180deg,#fff7f2_0%,#fff1e8_100%)] p-4">
                    <div className="text-[16px] font-semibold tracking-[-0.02em] text-slate-900">
                      Need gift ideas?
                    </div>
                    <p className="mt-1.5 max-w-[170px] text-[13px] leading-5 text-slate-500">
                      Get inspired with personalized suggestions.
                    </p>
                    <div className="mt-4 inline-flex rounded-full border border-[#f36f64]/20 bg-white/70 px-3 py-2 text-[12px] font-bold text-[#eb7b58]">
                      Explore ideas
                    </div>
                    <div className="absolute bottom-2 right-3 text-[58px] opacity-75">🎁</div>
                  </div>
                </aside>
              </div>

              <div className="mt-4 rounded-[24px] border border-slate-200/50 bg-white/95 p-4 shadow-[0_24px_50px_rgba(15,23,42,0.10)] backdrop-blur lg:absolute lg:-bottom-7 lg:left-[170px] lg:mt-0 lg:w-[374px]">
                <div className="flex items-center gap-3.5">
                  <div className="flex items-center">
                    <span className="h-8 w-8 rounded-full border-2 border-white bg-gradient-to-b from-[#efc3af] to-[#ae6e57]" />
                    <span className="-ml-2 h-8 w-8 rounded-full border-2 border-white bg-gradient-to-b from-[#809168] to-[#41512e]" />
                    <span className="-ml-2 h-8 w-8 rounded-full border-2 border-white bg-gradient-to-b from-[#c1a79a] to-[#765549]" />
                    <span className="-ml-2 grid h-[30px] w-[30px] place-items-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] text-[13px] text-white shadow-[0_10px_20px_rgba(243,111,100,0.20)]">
                      ❤
                    </span>
                  </div>

                  <div>
                    <div className="text-[15px] font-semibold leading-[1.35] text-slate-900">
                      Friends often add the best ideas.
                    </div>
                    <div className="mt-1 text-[14px] text-slate-500">
                      Collaborate and make gifting meaningful.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute -bottom-14 right-4 hidden rotate-12 text-[44px] text-[#f36f64]/40 lg:block">
              ↝
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
