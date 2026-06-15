import Link from "next/link";

export const metadata = {
  title: "Log in | Hinted.io",
  description:
    "Sign in to Hinted to keep your circles, hints, and reminders connected.",
};

const sideNav = [
  { label: "Calendar", icon: "📅", active: true },
  { label: "Reminders", icon: "🔔", active: false },
  { label: "People", icon: "👥", active: false },
  { label: "Gift ideas", icon: "🎁", active: false },
  { label: "Collections", icon: "♡", active: false },
  { label: "Activity", icon: "↗", active: false },
  { label: "Settings", icon: "⚙", active: false },
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

const calendarCells = [
  { day: "25", muted: true },
  { day: "26", muted: true },
  { day: "27", muted: true },
  { day: "28", muted: true },
  { day: "29", muted: true, event: ["Sarah", "Birthday"], tone: "pink" },
  { day: "30", muted: true },
  { day: "31", muted: true },

  { day: "1" },
  { day: "2" },
  { day: "3" },
  { day: "4" },
  { day: "5" },
  { day: "6", event: ["James", "Promotion"], tone: "blue" },
  { day: "7" },

  { day: "8" },
  { day: "9" },
  { day: "10", event: ["Mom", "Anniversary"], tone: "peach" },
  { day: "11" },
  { day: "12" },
  { day: "13", selected: true },
  { day: "14" },

  { day: "15" },
  { day: "16", soft: true, event: ["Alex", "Birthday"], tone: "pink" },
  { day: "17" },
  { day: "18" },
  { day: "19" },
  { day: "20" },
  { day: "21" },

  { day: "22" },
  { day: "23" },
  { day: "24", event: ["Olivia", "Graduation"], tone: "peach" },
  { day: "25" },
  { day: "26" },
  { day: "27" },
  { day: "28" },

  { day: "29" },
  { day: "30" },
  { day: "1", muted: true },
  { day: "2", muted: true },
  { day: "3", muted: true },
  { day: "4", muted: true },
  { day: "5", muted: true },
];

function EventPill({ event, tone }) {
  const toneBg =
    tone === "blue"
      ? "bg-sky-50"
      : tone === "peach"
        ? "bg-[#fff4ec]"
        : "bg-[#fff3ef]";

  const toneDot =
    tone === "blue"
      ? "from-[#8fb9d4] to-[#4d7399]"
      : tone === "peach"
        ? "from-[#d9b8a4] to-[#8a5946]"
        : "from-[#d0ab96] to-[#7b4a39]";

  return (
    <div
      className={`mt-1 inline-flex w-full items-center gap-1.5 rounded-full px-1 py-1 pr-1.5 text-[9px] leading-tight text-slate-600 shadow-sm ${toneBg}`}
    >
      <span
        className={`h-3.5 w-3.5 shrink-0 rounded-full bg-gradient-to-b ${toneDot}`}
      />
      <span className="truncate">
        {event[0]} {event[1]}
      </span>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fffaf7] text-slate-800">
      <div className="mx-auto max-w-[1320px] px-5 pb-10 pt-6 md:px-8">
        <header className="flex flex-wrap items-center justify-between gap-6 pb-8">
          <div className="flex items-center gap-3.5">
            <div className="relative flex h-[52px] w-[52px] items-center justify-center rounded-[18px] bg-gradient-to-b from-[#ffa47f] to-[#ff875d] text-2xl text-white shadow-lg">
              🎁
            </div>

            <div className="text-[22px] font-extrabold tracking-[-0.04em] text-slate-900">
              Hinted<span className="text-[#f36f64]">.io</span>
            </div>
          </div>

          <nav className="hidden items-center gap-9 text-[15px] text-slate-600 lg:flex">
            <Link href="/">How it works</Link>
          </nav>

          <div className="flex w-full items-center justify-center gap-4 sm:w-auto">
            <Link href="/" className="text-[15px] font-semibold text-slate-800">
              Home
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-6 text-[15px] font-bold text-white shadow-lg"
            >
              Get started
            </Link>
          </div>
        </header>

        <section className="grid items-center gap-8 lg:grid-cols-[1.02fr_1.16fr] lg:gap-11">
          <div className="py-2 lg:pl-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[14px] font-bold text-[#eb7b58] shadow-sm">
              <span>♡</span>
              <span>Social gifting & reminders, made simple</span>
            </div>

            <h1 className="mt-7 max-w-[580px] text-[48px] font-extrabold leading-[0.98] tracking-[-0.065em] text-slate-900 sm:text-[64px] lg:text-[82px]">
              Never forget.
              <br />
              Always <span className="text-[#ff9a7b]">thoughtful.</span>
            </h1>

            <p className="mt-7 max-w-[560px] text-[16px] leading-8 text-slate-500 sm:text-[18px]">
              Hinted helps you remember the important moments and find better gift ideas with a little help from your friends.
            </p>

            <div className="mt-8 max-w-[540px] rounded-[28px] border border-slate-200 bg-white p-6 shadow-xl md:p-7">
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

              <form className="space-y-4">
                <div>
                  <label
                    className="block text-sm font-medium text-slate-900"
                    htmlFor="email"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="mt-2 h-[54px] w-full rounded-[18px] border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#f36f64]/50 focus:ring-4 focus:ring-[#f36f64]/10"
                  />
                </div>

                <div>
                  <label
                    className="block text-sm font-medium text-slate-900"
                    htmlFor="password"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    placeholder="Your password"
                    className="mt-2 h-[54px] w-full rounded-[18px] border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#f36f64]/50 focus:ring-4 focus:ring-[#f36f64]/10"
                  />
                </div>

                <div className="pt-2 flex flex-wrap gap-3">
                  <button
                    type="submit"
                    className="inline-flex h-[52px] min-w-[145px] items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-5 text-sm font-semibold text-white shadow-lg"
                  >
                    Sign in
                  </button>

                  <Link
                    href="/onboarding"
                    className="inline-flex h-[52px] min-w-[160px] items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700"
                  >
                    Create account
                  </Link>
                </div>
              </form>

              <p className="mt-4 text-xs leading-5 text-slate-500">
                You can use an email and password now, then connect other sign-in methods later.
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
                    className={`-ml-2.5 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-[#fff8f4] bg-gradient-to-b text-[12px] font-bold text-white first:ml-0 ${colors}`}
                    style={{ zIndex: 5 - index }}
                  >
                    {label}
                  </div>
                ))}
              </div>

              <span>Trusted by 10,000+ happy gifters</span>
            </div>
          </div>

          <div className="relative py-5 pb-16 lg:pb-5">
            <div className="rounded-[34px] border border-white/70 bg-white/80 p-3 shadow-2xl md:p-5">
              <div className="grid gap-px overflow-hidden rounded-[28px] border border-slate-200 bg-slate-200 sm:grid-cols-[160px_1fr] lg:grid-cols-[160px_1fr_240px]">
                <aside className="bg-[#fffaf7] p-5">
                  <div className="flex h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-gradient-to-b from-[#ffa47f] to-[#ff875d] text-xl text-white shadow-md">
                    🎁
                  </div>

                  <div className="mt-6 grid gap-2.5">
                    {sideNav.map((item) => (
                      <div
                        key={item.label}
                        className={`flex items-center gap-3 rounded-[14px] px-3 py-2.5 text-[14px] ${
                          item.active
                            ? "bg-[#fff0e6] font-bold text-[#ea7451]"
                            : "font-medium text-slate-600"
                        }`}
                      >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-7 rounded-[22px] bg-[#fff4ec] p-4">
                    <div className="mb-3 flex h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-white text-xl text-[#f36f64] shadow-sm">
                      🎁
                    </div>
                    <div className="text-[14px] font-semibold leading-[1.35] text-slate-900">
                      Make every moment more meaningful.
                    </div>
                    <div className="mt-2 text-[13px] font-semibold text-[#eb7b58]">
                      Learn more →
                    </div>
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

                  <div className="grid grid-cols-7 gap-1.5 px-1 text-center text-[11px] text-slate-400 sm:gap-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div key={day}>{day}</div>
                    ))}
                  </div>

                  <div className="mt-3 grid grid-cols-7 gap-1.5 sm:gap-2">
                    {calendarCells.map((item, index) => (
                      <div
                        key={`${item.day}-${index}`}
                        className={`flex min-h-[58px] flex-col items-center rounded-[14px] px-1 py-2 text-center text-[13px] sm:min-h-[66px] sm:items-start sm:px-2 sm:text-left sm:text-[14px] ${
                          item.selected
                            ? "items-center justify-center bg-gradient-to-b from-[#ff895d] to-[#ff7b4e] font-extrabold text-white shadow-lg"
                            : item.soft
                              ? "bg-[#fff5f2] text-slate-700"
                              : item.muted
                                ? "text-slate-300"
                                : "text-slate-700"
                        }`}
                      >
                        <div>{item.day}</div>
                        {!item.selected && item.event ? (
                          <EventPill event={item.event} tone={item.tone} />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                <aside className="border-t border-slate-200 bg-[#fffdfb] p-5 sm:col-span-2 sm:border-t lg:col-span-1 lg:border-l lg:border-t-0">
                  <div className="mb-6 flex items-center justify-end gap-3 text-[13px] text-slate-500">
                    <span>🔔</span>
                    <span className="h-[34px] w-[34px] rounded-full bg-gradient-to-b from-[#f7c7ad] to-[#d68c71]" />
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

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    {reminders.map((item) => (
                      <div
                        key={item.title}
                        className="grid grid-cols-[42px_1fr_24px] items-center gap-3 rounded-[18px] border border-slate-200 bg-white p-3 shadow-sm"
                      >
                        <div
                          className={`h-[42px] w-[42px] rounded-full bg-gradient-to-b ${item.colors}`}
                        />
                        <div>
                          <div className="text-[14px] font-semibold leading-[1.3] text-slate-900">
                            {item.title}
                          </div>
                          <div className="mt-0.5 text-[13px] text-slate-400">
                            {item.date}
                          </div>
                        </div>
                        <div className="grid h-6 w-6 place-items-center rounded-full bg-[#fff2ea] text-[14px] text-[#f36f64]">
                          🎁
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 overflow-hidden rounded-[22px] bg-[#fff4ec] p-4">
                    <div className="text-[16px] font-semibold tracking-[-0.02em] text-slate-900">
                      Need gift ideas?
                    </div>
                    <p className="mt-1.5 max-w-[170px] text-[13px] leading-5 text-slate-500">
                      Get inspired with personalized suggestions.
                    </p>
                    <div className="mt-4 inline-flex rounded-full border border-[#f36f64]/20 bg-white px-3 py-2 text-[12px] font-bold text-[#eb7b58]">
                      Explore ideas
                    </div>
                  </div>
                </aside>
              </div>
            </div>

            <div className="relative mt-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-xl lg:absolute lg:-bottom-7 lg:left-[170px] lg:mt-0 lg:w-[374px]">
              <div className="flex items-center gap-3.5">
                <div className="flex items-center">
                  <span className="h-8 w-8 rounded-full border-2 border-white bg-gradient-to-b from-[#efc3af] to-[#ae6e57]" />
                  <span className="-ml-2 h-8 w-8 rounded-full border-2 border-white bg-gradient-to-b from-[#809168] to-[#41512e]" />
                  <span className="-ml-2 h-8 w-8 rounded-full border-2 border-white bg-gradient-to-b from-[#c1a79a] to-[#765549]" />
                  <span className="-ml-2 grid h-[30px] w-[30px] place-items-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] text-[13px] text-white">
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
        </section>
      </div>
    </main>
  );
}
