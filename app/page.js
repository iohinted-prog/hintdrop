import Link from "next/link";

export const metadata = {
  title: "Hinted.io | Never forget. Always thoughtful.",
  description:
    "Hinted helps you remember important moments and find better gift ideas with a little help from your friends.",
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
];

const calendarCells = [
  { day: "25", muted: true },
  { day: "26", muted: true },
  { day: "27", muted: true },
  { day: "28", muted: true },
  { day: "29", muted: true, dot: true, tone: "pink" },
  { day: "30", muted: true },
  { day: "31", muted: true },

  { day: "1" },
  { day: "2" },
  { day: "3" },
  { day: "4" },
  { day: "5" },
  { day: "6", dot: true, tone: "blue" },
  { day: "7" },

  { day: "8" },
  { day: "9" },
  { day: "10", dot: true, tone: "peach" },
  { day: "11" },
  { day: "12" },
  { day: "13", selected: true },
  { day: "14" },

  { day: "15" },
  { day: "16", dot: true, tone: "pink" },
  { day: "17" },
  { day: "18" },
  { day: "19" },
  { day: "20" },
  { day: "21" },

  { day: "22" },
  { day: "23" },
  { day: "24", dot: true, tone: "peach" },
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

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function AvatarStack() {
  const avatars = [
    ["AB", "from-[#efb19d] to-[#b25f54]"],
    ["JM", "from-[#4e596d] to-[#212a3c]"],
    ["SL", "from-[#e8c5ad] to-[#a86752]"],
    ["PT", "from-[#6f7d54] to-[#324421]"],
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

function CalendarDot({ tone }) {
  const color =
    tone === "blue"
      ? "bg-[#7fa7c7]"
      : tone === "peach"
        ? "bg-[#c89d86]"
        : "bg-[#a77563]";

  return <span className={`mt-2 block h-2.5 w-2.5 rounded-full ${color}`} />;
}

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fffaf7] text-slate-800">
      <div className="mx-auto max-w-[1320px] px-5 pb-10 pt-6 md:px-8">
        <header className="grid items-center gap-5 pb-8 lg:grid-cols-[auto_1fr_auto] lg:gap-8">
          <div className="flex items-center gap-3.5">
            <div className="relative flex h-[52px] w-[52px] items-center justify-center rounded-[18px] bg-gradient-to-b from-[#ffa47f] to-[#ff875d] text-2xl text-white shadow-lg">
              🎁
            </div>

            <div className="text-[22px] font-extrabold tracking-[-0.04em] text-slate-900">
              Hinted<span className="text-[#f36f64]">.io</span>
            </div>
          </div>

          <nav className="hidden items-center justify-center gap-9 text-[15px] text-slate-600 lg:flex">
            <Link href="#how-it-works">How it works</Link>
            <Link href="#offers">Offers</Link>
          </nav>

          <div className="flex items-center justify-start gap-4 whitespace-nowrap sm:justify-end">
            <Link
              href="/login"
              className="shrink-0 text-[15px] font-semibold text-slate-800"
            >
              Log in
            </Link>

            <Link
              href="/onboarding"
              className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-6 text-[15px] font-bold text-white shadow-lg"
            >
              Get started
            </Link>
          </div>
        </header>

        <section className="grid items-start gap-8 xl:grid-cols-[minmax(420px,0.95fr)_minmax(520px,1.05fr)] xl:gap-8">
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
              Hinted helps you remember the important moments and find better
              gift ideas with a little help from your friends.
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

                <div className="flex flex-wrap gap-3 pt-2">
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
                You can use an email and password now, then connect other sign-in
                methods later.
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

          <div className="relative min-w-0 xl:pl-2">
            <div className="relative overflow-hidden rounded-[34px] border border-[#efd8ce] bg-[#fff7f2] p-3 shadow-[0_25px_80px_rgba(173,101,72,0.16)] sm:p-4">
              <div className="grid gap-4 lg:grid-cols-[210px_minmax(0,1fr)]">
                <aside className="rounded-[28px] bg-[#fcf1ea] p-4 sm:p-5">
                  <div className="flex items-center gap-3 border-b border-[#ead7cd] pb-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-b from-[#ffab88] to-[#ff875f] text-lg text-white shadow-md">
                      🎁
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Hinted
                      </p>
                      <p className="text-xs text-slate-500">
                        Thoughtful planning
                      </p>
                    </div>
                  </div>

                  <nav className="mt-5 space-y-1.5">
                    {sideNav.map((item) => (
                      <div
                        key={item.label}
                        className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium ${
                          item.active
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500"
                        }`}
                      >
                        <span className="text-base">{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </nav>

                  <div className="mt-5 rounded-[24px] bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Upcoming
                    </p>

                    <div className="mt-3 space-y-3">
                      {reminders.slice(0, 2).map((item) => (
                        <div
                          key={item.title}
                          className="rounded-2xl border border-[#f1e2da] bg-[#fffaf7] p-3"
                        >
                          <div
                            className={`mb-2 h-2 w-16 rounded-full bg-gradient-to-r ${item.colors}`}
                          />
                          <p className="text-sm font-semibold text-slate-800">
                            {item.title}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.date}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </aside>

                <div className="min-w-0 rounded-[28px] bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Dashboard
                      </p>
                      <h2 className="mt-1 text-[26px] font-semibold tracking-[-0.04em] text-slate-900 sm:text-[30px]">
                        July calendar
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <button className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500">
                        ←
                      </button>
                      <button className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500">
                        →
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_250px]">
                    <div className="rounded-[24px] border border-slate-100 bg-[#fffdfa] p-4">
                      <div className="mb-3 grid grid-cols-7 gap-2">
                        {weekDays.map((day) => (
                          <div
                            key={day}
                            className="text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 sm:text-[11px]"
                          >
                            {day}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-2">
                        {calendarCells.map((cell, index) => (
                          <div
                            key={`${cell.day}-${index}`}
                            className={`min-h-[68px] rounded-[18px] border p-2 sm:min-h-[76px] ${
                              cell.selected
                                ? "border-[#f5b49a] bg-[#fff1ea] shadow-sm"
                                : "border-slate-100 bg-white"
                            }`}
                          >
                            <div
                              className={`text-sm font-semibold ${
                                cell.muted ? "text-slate-300" : "text-slate-700"
                              }`}
                            >
                              {cell.day}
                            </div>

                            {cell.dot ? <CalendarDot tone={cell.tone} /> : null}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-slate-100 bg-[#fffaf7] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-base font-semibold text-slate-900">
                          Reminders
                        </h3>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#e77756] shadow-sm">
                          4 coming up
                        </span>
                      </div>

                      <div className="mt-4 space-y-3">
                        {reminders.map((item) => (
                          <div
                            key={item.title}
                            className="rounded-[20px] border border-[#f1e4dc] bg-white p-3 shadow-sm"
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`mt-1 h-10 w-10 shrink-0 rounded-2xl bg-gradient-to-b ${item.colors}`}
                              />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-800">
                                  {item.title}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {item.date}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-[#2f3b2d] px-4 py-3 text-sm font-semibold text-white">
                        View ideas
                      </button>
                    </div>
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
