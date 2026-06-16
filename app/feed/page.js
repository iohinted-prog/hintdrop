"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export const metadata = {
  title: "Feed | Hinted.io",
  description: "Your Hinted feed with updates, reminders, and activity in one place.",
};

const demoMode = true;
const hasContacts = false;

const filters = [
  { label: "All activity", value: "all", active: true },
  { label: "Reminders", value: "reminders", active: false },
  { label: "Hints", value: "hints", active: false },
  { label: "Circles", value: "circles", active: false },
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
    category: "reminders",
    avatar: "S",
    avatarColors: "from-[#efc3af] to-[#ae6e57]",
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
    category: "hints",
    avatar: "M",
    avatarColors: "from-[#eac8b8] to-[#9d6957]",
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
    category: "circles",
    avatar: "MF",
    avatarColors: "from-[#809168] to-[#41512e]",
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
    category: "circles",
    avatar: "J",
    avatarColors: "from-[#d7c0b2] to-[#b88974]",
    name: "James",
    action: "reacted to a shared hint in your circle",
    detail: "Weekend cabin stay · Marked as a top pick.",
    time: "3h ago",
    icon: "⭐",
    badge: "Circle",
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

const initialMonth = "July 2026";

const initialCalendarEvents = {
  "16": [
    { id: 1, title: "Sarah Birthday", type: "birthday", time: "All day" },
    { id: 2, title: "Mom reminder", type: "mothers-day", time: "All day" },
  ],
  "24": [{ id: 3, title: "James Promotion", type: "promotion", time: "12:30" }],
  "29": [{ id: 4, title: "Fiona wedding", type: "wedding", time: "18:00" }],
};

const eventTypes = [
  "birthday",
  "christmas",
  "easter",
  "valentines",
  "fathers-day",
  "mothers-day",
  "wedding",
  "promotion",
];

const eventTypeLabels = {
  birthday: "Birthday",
  christmas: "Christmas",
  easter: "Easter",
  valentines: "Valentines",
  "fathers-day": "Father's Day",
  "mothers-day": "Mother's Day",
  wedding: "Wedding",
  promotion: "Promotion",
};

const eventTypeColors = {
  birthday: "bg-[#efc3af] text-[#8b4d3a] border-[#e6c1b2]",
  christmas: "bg-[#dfe9dd] text-[#43653d] border-[#cad7c5]",
  easter: "bg-[#f3dff0] text-[#8a5b83] border-[#e5cbdf]",
  valentines: "bg-[#f6d6dc] text-[#9d4d5e] border-[#ebb7c4]",
  "fathers-day": "bg-[#dfe7f2] text-[#5b6f8f] border-[#c8d3e2]",
  "mothers-day": "bg-[#f4dce6] text-[#9c5678] border-[#e8c5d5]",
  wedding: "bg-[#e1e8d8] text-[#5a6e4b] border-[#cedabc]",
  promotion: "bg-[#f7e7c9] text-[#9b6b15] border-[#ecd8a7]",
};

const monthDays = [
  "30", "1", "2", "3", "4", "5", "6",
  "7", "8", "9", "10", "11", "12", "13",
  "14", "15", "16", "17", "18", "19", "20",
  "21", "22", "23", "24", "25", "26", "27",
  "28", "29", "30", "31", "1", "2", "3",
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
        className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-b from-[#efcdbd] to-[#d7a88f] text-sm font-bold text-white ring-4 ring-white/70"
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
    item.category === "reminders"
      ? {
          chip: "bg-[#fff3ee] text-[#e07c54]",
          border: "border-[#f6ddd2]",
        }
      : item.category === "circles"
        ? {
            chip: "bg-[#edf6eb] text-[#4a7a3a]",
            border: "border-[#deebda]",
          }
        : {
            chip: "bg-[#f5f3ff] text-[#7c5cbf]",
            border: "border-[#e5defa]",
          };

  return (
    <article className={`rounded-[28px] border bg-white p-5 shadow-sm ${typeStyles.border}`}>
      <div className="flex items-start gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-b text-[12px] font-bold text-white ${item.avatarColors}`}>
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
              >
                {reaction}
              </button>
            ))}

            <button className="inline-flex h-10 items-center justify-center rounded-full border border-[#ebdfd8] bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50">
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
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#efcdbd] to-[#d7a88f] text-[11px] font-bold text-white">
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

function EventModal({ open, onClose, selectedDay, events, onAddEvent }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("birthday");
  const [time, setTime] = useState("All day");
  const [inviteEmail, setInviteEmail] = useState("");

  if (!open) return null;

  const handleSave = () => {
    if (!title.trim()) return;
    onAddEvent({
      title: title.trim(),
      type,
      time,
      inviteEmail: type === "birthday" ? inviteEmail.trim() : "",
    });
    setTitle("");
    setType("birthday");
    setTime("All day");
    setInviteEmail("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/20 px-4 py-6 backdrop-blur-sm">
      <div className="mx-auto mt-16 w-full max-w-[520px] rounded-[28px] border border-[#eadad0] bg-white p-5 shadow-[0_24px_80px_rgba(92,64,50,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Add event</p>
            <h3 className="mt-1 text-[24px] font-semibold tracking-[-0.04em] text-slate-900">
              {selectedDay ? `Day ${selectedDay}` : "New event"}
            </h3>
            {events.length > 0 && (
              <p className="mt-2 text-sm text-slate-500">
                This day already has {events.length} event{events.length === 1 ? "" : "s"}.
              </p>
            )}
          </div>
          <button onClick={onClose} className="rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-500">
            Close
          </button>
        </div>

        {events.length > 0 && (
          <div className="mt-4 space-y-2 rounded-[22px] border border-[#f0dfd6] bg-[#fffaf7] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Existing events</p>
            {events.map((event) => (
              <div key={event.id} className={`rounded-[18px] border px-3 py-2 text-sm ${eventTypeColors[event.type] || eventTypeColors.birthday}`}>
                <span className="font-semibold">{event.title}</span> · {event.time}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 grid gap-3">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-800">Event name</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 rounded-[16px] border border-slate-200 px-4 text-sm outline-none focus:border-[#f19a78]/60 focus:ring-4 focus:ring-[#f19a78]/10"
              placeholder="Birthday, wedding, promotion..."
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-800">Event type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="h-11 rounded-[16px] border border-slate-200 px-4 text-sm outline-none focus:border-[#f19a78]/60 focus:ring-4 focus:ring-[#f19a78]/10"
            >
              {eventTypes.map((eventType) => (
                <option key={eventType} value={eventType}>
                  {eventTypeLabels[eventType]}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-800">Time</span>
            <input
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="h-11 rounded-[16px] border border-slate-200 px-4 text-sm outline-none focus:border-[#f19a78]/60 focus:ring-4 focus:ring-[#f19a78]/10"
              placeholder="All day"
            />
          </label>

          {type === "birthday" && (
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-800">Invite them by email</span>
              <input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="h-11 rounded-[16px] border border-slate-200 px-4 text-sm outline-none focus:border-[#f19a78]/60 focus:ring-4 focus:ring-[#f19a78]/10"
                placeholder="name@email.com"
              />
            </label>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleSave}
            className="inline-flex h-11 items-center justify-center rounded-full bg-[#2f3b2d] px-5 text-sm font-semibold text-white"
          >
            Save event
          </button>
          <p className="text-xs text-slate-500">
            Birthday events can optionally send an invite by email.
          </p>
        </div>
      </div>
    </div>
  );
}

function DayCell({ day, events, onClick }) {
  const hasEvents = events.length > 0;
  const primary = events[0];

  return (
    <button
      onClick={onClick}
      className={`min-h-[90px] rounded-[16px] border p-2 text-left transition hover:bg-[#fff7f2] ${
        day === "16" ? "border-[#f2b39a] bg-[#fff2ea]" : "border-slate-100 bg-[#fffdfa]"
      }`}
    >
      <div className={`text-[13px] font-semibold ${["30", "1", "2", "3"].includes(day) ? "text-slate-300" : "text-slate-700"}`}>
        {day}
      </div>

      {hasEvents ? (
        <div className={`mt-2 rounded-[12px] border px-2 py-1 text-[11px] font-semibold ${eventTypeColors[primary.type]}`}>
          {primary.title}
        </div>
      ) : null}
    </button>
  );
}

function CalendarPanel() {
  const [monthIndex, setMonthIndex] = useState(6);
  const [selectedDay, setSelectedDay] = useState(null);
  const [eventsByDay, setEventsByDay] = useState(initialCalendarEvents);
  const [modalOpen, setModalOpen] = useState(false);

  const currentMonth = monthIndex === 6 ? "July 2026" : monthIndex === 5 ? "June 2026" : "August 2026";

  const openDay = (day) => {
    setSelectedDay(day);
    setModalOpen(true);
  };

  const addEvent = (payload) => {
    if (!selectedDay) return;
    setEventsByDay((prev) => {
      const current = prev[selectedDay] || [];
      return {
        ...prev,
        [selectedDay]: [
          ...current,
          { id: Date.now(), title: payload.title, type: payload.type, time: payload.time },
        ],
      };
    });

    if (payload.type === "birthday" && payload.inviteEmail) {
      window.alert(`Invite prompt would be sent to ${payload.inviteEmail}`);
    }

    setModalOpen(false);
  };

  return (
    <section className="rounded-[28px] border border-[#f0dfd6] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Planner</p>
          <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.04em] text-slate-900">{currentMonth}</h2>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setMonthIndex((m) => m - 1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500">
            ←
          </button>
          <button onClick={() => setMonthIndex((m) => m + 1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500">
            →
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-2 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
        <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-2">
        {monthDays.map((day, index) => (
          <DayCell
            key={`${day}-${index}`}
            day={day}
            events={eventsByDay[day] || []}
            onClick={() => openDay(day)}
          />
        ))}
      </div>

      <EventModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        selectedDay={selectedDay}
        events={selectedDay ? eventsByDay[selectedDay] || [] : []}
        onAddEvent={addEvent}
      />
    </section>
  );
}

export default function FeedPage() {
  const [activeFilter, setActiveFilter] = useState("all");
  const showDemoGuide = demoMode && !hasContacts;

  const visibleItems = useMemo(() => {
    if (activeFilter === "all") return feedItems;
    return feedItems.filter((item) => item.category === activeFilter);
  }, [activeFilter]);

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
                    onClick={() => setActiveFilter(filter.value)}
                    className={`rounded-[18px] px-4 py-3 text-left text-sm font-medium ${
                      activeFilter === filter.value
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
                  {visibleItems.map((item) => (
                    <FeedItem key={item.id} item={item} />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-5">
            <CalendarPanel />

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
              <button className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-800">
                View related hints
              </button>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
