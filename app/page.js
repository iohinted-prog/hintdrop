import Link from "next/link";

export const metadata = {
  title: "Hinted.io | Never forget. Always thoughtful.",
  description:
    "Hinted helps you remember important moments and discover thoughtful gift ideas with a little help from your friends.",
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
      className={`mt-2 inline-flex items-center gap-2 rounded-full px-1 py-1 pr-2 text-[10px] leading-tight text-slate-600 shadow-sm ${toneBg}`}
    >
      <span className={`h-5 w-5 rounded-full bg-gradient-to-b ${toneDot}`} />
      <span className="whitespace-nowrap">
        {event[0]}
        <br />
        {event[1]}
      </span>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#fffaf7] text-slate-800">
      <div className="mx-auto max-w-[1380px] px-5 pb-10 pt-6 md:px-8">
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
            <Link href="#features">Features</Link>
            <Link href="#how-it-works">How it works</Link>
            <Link href="#reminders">Reminders</Link>
            <Link href="#ideas">Gift ideas</Link>
          </nav>

          <div className="flex w-full items-center justify-center gap-4 sm:w-auto">
            <Link
              href="/login"
              className="text-[15px] font-semibold text-slate-800"
            >
              Log in
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-6 text-[15px] font-bold text-white shadow-lg"
            >
              Get started
            </Link>
          </div>
        </header>

        <section className="grid min-h-[calc(100vh-120px)] items-start gap-8 xl:grid-cols-[minmax(420px,0.95fr)_minmax(560px,1.05fr)] xl:gap-10">
          <div className="py-2 xl:sticky xl:top-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[14px] font-bold text-[#eb7b58] shadow-sm">
              <span>♡</span>
              <span>Social gifting & reminders, made simple</span>
            </div>

            <h1 className="mt-7 max-w-[580px] text-[48px] font-extrabold leading-[0.98] tracking-[-0.065em] text-slate-900 sm:text-[64px] lg:text-[76px] 2xl:text-[82px]">
              Never forget.
              <br />
              Always <span className="text-[#ff9a7b]">thoughtful.</span>
            </h1>

            <p className="mt-7 max-w-[560px] text-[16px] leading-8 text-slate-500 sm:text-[18px]">
              Hinted.io helps you remember the important moments and find the
              perfect gifts with a little help from your friends.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/onboarding"
                className="inline-flex h-[56px] items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-7 text-[16px] font-semibold text-white shadow-lg"
              >
                Get started for free →
              </Link>

              <Link
                href="#how-it-works"
                className="inline-flex h-[56px] items-center justify-center rounded-full border border-[#f1c9b8] bg-white px-7 text-[16px] font-semibold text-[#ea7451]"
              >
                ▶ See how it works
              </Link>
            </div>

            <div className="mt-7 flex items-center gap-3.5 text-[15px] text-slate-500">
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

          <div className="relative py-3">
            <div className="rounded-[34px] border border-white/70 bg-white/80 p-3 shadow-2xl md:p-5">
              <div className="grid overflow-hidden rounded-[28px] border border-slate-200 bg-white xl:grid-cols-[150px_minmax(0,1fr)] 2xl:grid-cols-[168px_minmax(0,1fr)_250px]">
                <aside className="border-b border-slate-200 bg-[#fffaf7] p-5 xl:border-b-0 xl:border-r">
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

                <div className="min-w-0 bg-white px-4 py-5 sm:px-6">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 text-[18px] font-bold tracking-[-0.03em] text-slate-900">
                      <span className="text-slate-400">‹</span>
                      <span>June 2025</span>
                      <span className="text-slate-400">›</span>
                    </div>
                    <div className="text-[13px] text-slate-400">
                      Calendar view
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-2 px-1 text-[12px] text-slate-400">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (day) => (
                        <div key={day}>{day}</div>
                      )
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-7 gap-2">
                    {calendarCells.map((item, index) => (
                      <div
                        key={`${item.day}-${index}`}
                        className={`min-h-[66px] rounded-[18px] px-2 py-2 text-[14px] ${
                          item.selected
                            ? "grid place-items-center bg-gradient-to-b from-[#ff895d] to-[#ff7b4e] font-extrabold text-white shadow-lg"
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
                            {item.event ? (
                              <EventPill event={item.event} tone={item.tone} />
                            ) : null}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <aside className="border-t border-slate-200 bg-[#fffdfb] p-5 xl:col-span-2 2xl:col-span-1 2xl:border-l 2xl:border-t-0">
                  <div className="mb-6 flex items-center justify-end gap-3 text-[13px] text-slate-500">
                    <span>🔔</span>
                    <span className="h-[34px] w-[34px] rounded-full bg-gradient-to-b from-[#f7c7ad] to-[#d68c71]" />
                    <span>⌄</span>
                  </div>

                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-[18px] font-semibold tracking-[-0.03em] text-slate-900">
                      Upcoming reminders
                    </h3>
                    <Link
                      href="/onboarding"
                      className="text-[13px] font-semibold text-[#eb7b58]"
                    >
                      View all
                    </Link>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-1">
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
                    <p className="mt-1.5 max-w-[220px] text-[13px] leading-5 text-slate-500">
                      Get inspired with personalized suggestions.
                    </p>
                    <div className="mt-4 inline-flex rounded-full border border-[#f36f64]/20 bg-white px-3 py-2 text-[12px] font-bold text-[#eb7b58]">
                      Explore ideas
                    </div>
                  </div>
                </aside>
              </div>

              <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-xl xl:mx-auto xl:max-w-[420px] 2xl:absolute 2xl:-bottom-7 2xl:left-[170px] 2xl:mt-0 2xl:w-[374px]">
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
                    <div className="text-[15px] font-semibold text-slate-900">
                      Friends often add the best ideas.
                    </div>
                    <div className="text-[14px] text-slate-500">
                      Collaborate and make gifting meaningful.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute -left-10 top-10 h-36 w-36 rounded-full bg-[#ffd7c7] blur-3xl opacity-60" />
            <div className="pointer-events-none absolute -right-10 bottom-16 h-40 w-40 rounded-full bg-[#ffe6da] blur-3xl opacity-80" />
          </div>
        </section>
      </div>
    </main>
  );
}
