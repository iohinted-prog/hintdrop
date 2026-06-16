"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const demoMode = true;
const hasContacts = false;

const filters = [
  { label: "All activity", active: true },
  { label: "Reminders", active: false },
  { label: "Hints", active: false },
  { label: "Circles", active: false },
  { label: "Celebrations", active: false },
];

const onboardingSteps = [
  {
    id: 1,
    title: "Add your people",
    text: "Start by adding contacts so Hinted can turn birthdays, plans, and gift moments into useful updates.",
  },
  {
    id: 2,
    title: "Save hints as you go",
    text: "Hints you save for friends and family will begin to shape this feed automatically.",
  },
  {
    id: 3,
    title: "Watch the feed fill itself",
    text: "Once contacts are added, demo activity is replaced by real reminders, shared circle updates, and reactions.",
  },
];

const feedItems = [
  {
    id: 1,
    type: "reminder",
    avatar: "S",
    avatarColors: "from-[#efcdbf] to-[#c88c73]",
    name: "Sarah",
    action: "has a birthday coming up in 2 weeks",
    detail: "June 29 · She saved a ceramics workshop and linen bedding.",
    time: "Just now",
    icon: "🎂",
    badge: "Reminder",
    comments: [
      { id: 1, name: "You", text: "Need to sort this early this time." },
      { id: 2, name: "Maya", text: "I can help with ideas if you want to split something." },
    ],
    reactions: ["🎉", "❤️", "👏"],
  },
  {
    id: 2,
    type: "hint",
    avatar: "M",
    avatarColors: "from-[#e7cab8] to-[#b97d66]",
    name: "Mum",
    action: "saved a new hint",
    detail: "Silk pillowcase set · From John Lewis · Around £45.",
    time: "12m ago",
    icon: "🎁",
    badge: "Hint",
    comments: [{ id: 1, name: "You", text: "This is actually a very solid option." }],
    reactions: ["✨", "😍", "👏"],
  },
  {
    id: 3,
    type: "circle",
    avatar: "MF",
    avatarColors: "from-[#98a47d] to-[#5f7046]",
    name: "Max & Fiona",
    action: "have a wedding circle that is nearly funded",
    detail: "£320 of £400 raised · 4 contributors · 80% full.",
    time: "1h ago",
    icon: "💍",
    badge: "Circle",
    comments: [{ id: 1, name: "James", text: "Nearly there — I’ll add the last bit tonight." }],
    reactions: ["🥂", "💚", "🎉"],
  },
  {
    id: 4,
    type: "celebration",
    avatar: "J",
    avatarColors: "from-[#dcc4b5] to-[#b78972]",
    name: "James",
    action: "reacted to a shared hint in your circle",
    detail: "Weekend cabin stay · Marked as a top pick.",
    time: "3h ago",
    icon: "⭐",
    badge: "Celebration",
    comments: [],
    reactions: ["🔥", "🙌", "💛"],
  },
];

const reminders = [
  {
    title: "Sarah's Birthday",
    date: "June 29",
    subtitle: "2 weeks away",
    colors: "from-[#efc3af] to-[#ae6e57]",
  },
  {
    title: "Mum & Dad Anniversary",
    date: "July 10",
    subtitle: "Plan gift ideas",
    colors: "from-[#eac8b8] to-[#9d6957]",
  },
  {
    title: "James Promotion",
    date: "July 16",
    subtitle: "Congratulate him",
    colors: "from-[#809168] to-[#41512e]",
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
        className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-b from-[#efcdbf] to-[#bb8168] text-sm font-bold text-white ring-4 ring-white/70"
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

function FeedItem({ item }) {
  const typeStyles =
    item.type === "reminder"
      ? {
          chip: "bg-[#fff3ee] text-[#e07c54]",
          border: "border-[#f6ddd2]",
        }
      : item.type === "circle"
        ? {
            chip: "bg-[#edf6eb] text-[#4a7a3a]",
            border: "border-[#deebda]",
          }
        : item.type === "celebration"
          ? {
              chip: "bg-[#fff7e8] text-[#af7b14]",
              border: "border-[#f3e3b8]",
            }
          : {
              chip: "bg-[#f5f3ff] text-[#7c5cbf]",
              border: "border-[#e5defa]",
            };

  return (
    <article className={`rounded-[28px] border bg-white p-5 shadow-sm ${typeStyles.border}`}>
      <div className="flex items-start gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-b text-[12px] font-bold text-white ${item.avatarColors}`}
        >
          {item.avatar}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${typeStyles.chip}`}>
                  {item.icon} {item.badge}
                </span>
                {demoMode && (
                  <span className="rounded-full border border-[#eadfd7] bg-[#fffaf7] px-2.5 py-1 text-[11px] font-medium text-slate-500">
                    Demo data
                  </span>
                )}
              </div>

              <p className="mt-3 text-[15px] leading-7 text-slate-700">
                <span className="font-semibold text-slate-900">{item.name}</span> {item.action}
              </p>
              <p className="mt-1 text-[14px] leading-6 text-slate-500">{item.detail}</p>
            </div>

            <span className="shrink-0 text-[12px] text-slate-400">{item.time}</span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {item.reactions.map((reaction) => (
              <button
                key={reaction}
                className="inline-flex h-10 items-center justify-center rounded-full border border-[#ebdfd8] bg-[#fffaf7] px-3 text-sm text-slate-700 hover:bg-[#fff2eb]"
                aria-label={`React with ${reaction}`}
                type="button"
              >
                {reaction}
              </button>
            ))}

            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-full border border-[#ebdfd8] bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Comment
            </button>
          </div>

          <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
            {item.comments.map((comment) => (
              <div key={comment.id} className="rounded-[18px] bg-[#faf7f4] px-4 py-3">
                <p className="text-[13px] leading-6 text-slate-600">
                  <span className="font-semibold text-slate-900">{comment.name}</span> {comment.text}
                </p>
              </div>
            ))}

            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#efcdbf] to-[#bb8168] text-[11px] font-bold text-white">
                Y
              </div>
              <input
                type="text"
                placeholder="Write a comment..."
                className="h-11 w-full rounded-full border border-[#e9ddd6] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19a78]/60 focus:ring-4 focus:ring-[#f19a78]/10"
              />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function getMonthData(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDay = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];

  for (let i = 0; i < startDay; i++) {
    const day = daysInPrevMonth - startDay + i + 1;
    cells.push({
      key: `prev-${day}`,
      day,
      currentMonth: false,
      date: new Date(year, month - 1, day),
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      key: `current-${day}`,
      day,
      currentMonth: true,
      date: new Date(year, month, day),
    });
  }

  while (cells.length < 35) {
    const day = cells.length - (startDay + daysInMonth) + 1;
    cells.push({
      key: `next-${day}`,
      day,
      currentMonth: false,
      date: new Date(year, month + 1, day),
    });
  }

  return cells;
}

function MiniCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 6, 1));
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 6, 16));

  const monthLabel = useMemo(
    () =>
      currentMonth.toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      }),
    [currentMonth]
  );

  const days = useMemo(() => getMonthData(currentMonth), [currentMonth]);

  const reminderDays = ["2026-07-10", "2026-07-16", "2026-07-24", "2026-07-29"];

  const toKey = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const goMonth = (direction) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
  };

  return (
    <section className="rounded-[28px] border border-[#f0dfd6] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Planner
          </p>
          <h2
            className="mt-1 text-[22px] font-semibold tracking-[-0.04em] text-slate-900"
            aria-live="polite"
          >
            {monthLabel}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goMonth(-1)}
            aria-label="Previous month"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => goMonth(1)}
            aria-label="Next month"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            →
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-2 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
        <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-2">
        {days.map((item) => {
          const selected = toKey(item.date) === toKey(selectedDate);
          const hasReminder = reminderDays.includes(toKey(item.date));

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setSelectedDate(item.date)}
              aria-label={item.date.toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              aria-pressed={selected}
              className={`min-h-[58px] rounded-[16px] border p-2 text-left transition ${
                selected
                  ? "border-[#f2b39a] bg-[#fff2ea]"
                  : "border-slate-100 bg-[#fffdfa] hover:border-[#efc8b6] hover:bg-[#fff7f2]"
              }`}
            >
              <div className={`text-[13px] font-semibold ${item.currentMonth ? "text-slate-700" : "text-slate-300"}`}>
                {item.day}
              </div>
              {hasReminder ? <div className="mt-1.5 h-2 w-2 rounded-full bg-[#b78671]" /> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function FeedClient() {
  const showDemoGuide = demoMode && !hasContacts;

  return (
    <main className="min-h-screen bg-[#fffaf7] text-slate-800">
      <header className="border-b border-[#efe0d7] bg-[#fffaf7]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1380px] items-center justify-between px-5 py-4 md:px-8">
          <Link href="/feed" className="flex items-center gap-3.5">
            <LogoMark />
            <div className="text-[22px] font-extrabold tracking-[-0.05em] text-slate-900">
              Hinted<span className="text-[#f36f64]">.io</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/hints"
              className="inline-flex h-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-5 text-[14px] font-semibold text-slate-700 hover:bg-[#fff5f0]"
            >
              Hints
            </Link>
            <AvatarMenu />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1380px] px-5 py-8 md:px-8">
        <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
          <aside className="space-y-5">
            <section className="rounded-[28px] border border-[#f0dfd6] bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Filters
                  </p>
                  <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.04em] text-slate-900">
                    Activity
                  </h1>
                </div>

                {demoMode && (
                  <span className="rounded-full bg-[#fff2ea] px-3 py-1 text-[11px] font-semibold text-[#e77756]">
                    Demo
                  </span>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-2">
                {filters.map((filter) => (
                  <button
                    key={filter.label}
                    type="button"
                    className={`rounded-[18px] px-4 py-3 text-left text-sm font-medium ${
                      filter.active
                        ? "bg-[#2f3b2d] text-white"
                        : "border border-[#efe4dd] bg-[#fffdfa] text-slate-600 hover:bg-[#faf7f5]"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </section>

            {showDemoGuide && (
              <section className="rounded-[28px] border border-[#f0dfd6] bg-white p-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  First look
                </p>
                <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.04em] text-slate-900">
                  How this feed will work
                </h2>
                <p className="mt-2 text-[14px] leading-6 text-slate-600">
                  You’re seeing a demo version of your feed so you can understand the layout before real activity starts appearing.
                </p>

                <div className="mt-5 space-y-3">
                  {onboardingSteps.map((step) => (
                    <div key={step.id} className="rounded-[20px] bg-[#faf7f4] p-4">
                      <div className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2f3b2d] text-[12px] font-semibold text-white">
                          {step.id}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                          <p className="mt-1 text-[13px] leading-6 text-slate-600">{step.text}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Link
                  href="/contacts"
                  className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-5 text-sm font-semibold text-white shadow-lg"
                >
                  Add contacts
                </Link>
              </section>
            )}
          </aside>

          <section className="min-w-0">
            <div className="rounded-[32px] border border-[#eeddd3] bg-[#fff7f2] p-4 shadow-[0_18px_60px_rgba(173,101,72,0.1)] sm:p-5">
              <div className="rounded-[28px] border border-[#f1dfd6] bg-white p-5 sm:p-6">
                <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <div className="inline-flex rounded-full bg-[#fff5ef] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#e07c54]">
                      Activity stream
                    </div>
                    <h2 className="mt-3 text-[30px] font-semibold tracking-[-0.05em] text-slate-900">
                      Your people, moments, and nudges.
                    </h2>
                    <p className="mt-2 max-w-[620px] text-[15px] leading-7 text-slate-600">
                      This feed updates automatically as reminders get closer, hints are added, and shared gift moments start moving.
                    </p>
                  </div>

                  {demoMode && (
                    <div className="rounded-[20px] border border-[#f3dfd6] bg-[#fffaf7] px-4 py-3 text-[13px] leading-6 text-slate-600">
                      Demo mode is on now. Once contacts are added, this area will switch to real activity.
                    </div>
                  )}
                </div>

                <div className="mt-5 space-y-4">
                  {feedItems.map((item) => (
                    <FeedItem key={item.id} item={item} />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-5">
            <MiniCalendar />

            <section className="rounded-[28px] border border-[#f0dfd6] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-900">Upcoming reminders</h2>
                <span className="rounded-full bg-[#fff5ef] px-2.5 py-1 text-[11px] font-semibold text-[#e77756]">
                  3 soon
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {reminders.map((item) => (
                  <div key={item.title} className="rounded-[22px] border border-[#f1e4dc] bg-[#fffdfa] p-4">
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 h-11 w-11 shrink-0 rounded-2xl bg-gradient-to-b ${item.colors}`} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.date}</p>
                        <p className="mt-1 text-xs text-slate-400">{item.subtitle}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] bg-[#2f3b2d] p-5 text-white shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
                Gift prompt
              </p>
              <p className="mt-3 text-sm leading-7 text-white/90">
                Sarah has recently saved “ceramic dinnerware” and “weekend city break”, so experience-led gifts may be the strongest route.
              </p>
              <button
                type="button"
                className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-800"
              >
                View related hints
              </button>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
