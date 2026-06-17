"use client";

import { useState } from "react";
import Link from "next/link";

const contacts = [
  {
    id: 1,
    name: "Maya",
    role: "Friend",
    note: "Saved 8 hints",
    initials: "M",
    colors: "from-[#efc3af] to-[#ae6e57]",
  },
  {
    id: 2,
    name: "James",
    role: "Brother",
    note: "Saved 5 hints",
    initials: "J",
    colors: "from-[#4e596d] to-[#212a3c]",
  },
  {
    id: 3,
    name: "Fiona",
    role: "Friend",
    note: "Saved 4 hints",
    initials: "F",
    colors: "from-[#809168] to-[#41512e]",
  },
  {
    id: 4,
    name: "Mum",
    role: "Family",
    note: "Saved 6 hints",
    initials: "M",
    colors: "from-[#eac8b8] to-[#9d6957]",
  },
  {
    id: 5,
    name: "Sarah",
    role: "Partner",
    note: "Saved 10 hints",
    initials: "S",
    colors: "from-[#e8b9a7] to-[#bf755f]",
  },
  {
    id: 6,
    name: "Tom",
    role: "Friend",
    note: "Saved 3 hints",
    initials: "T",
    colors: "from-[#b7c8db] to-[#6b88a7]",
  },
];

const calendarEvents = [
  { id: 1, title: "Sarah's Birthday", date: "2026-06-29", type: "Birthday" },
  { id: 2, title: "Mum & Dad Anniversary", date: "2026-07-10", type: "Anniversary" },
  { id: 3, title: "James Promotion Dinner", date: "2026-07-16", type: "Milestone" },
];

const circles = [
  {
    id: 1,
    name: "Sarah Birthday Circle",
    subtitle: "Birthday · June 29",
    description:
      "A shared circle for Sarah’s next gift so everyone can contribute without duplicating ideas.",
    members: [
      {
        name: "You",
        initials: "Y",
        contributed: true,
        amount: 40,
        colors: "from-[#4e596d] to-[#212a3c]",
      },
      {
        name: "Maya",
        initials: "M",
        contributed: true,
        amount: 35,
        colors: "from-[#efc3af] to-[#ae6e57]",
      },
      {
        name: "James",
        initials: "J",
        contributed: false,
        amount: 0,
        colors: "from-[#4e596d] to-[#212a3c]",
      },
      {
        name: "Fiona",
        initials: "F",
        contributed: true,
        amount: 20,
        colors: "from-[#809168] to-[#41512e]",
      },
    ],
    pot: {
      active: true,
      item: "Weekend cabin stay",
      source: "From Sarah’s saved hints",
      target: 220,
      raised: 95,
      note: "Selected from Sarah’s own hints so the group has a clear goal.",
    },
  },
  {
    id: 2,
    name: "Mum & Dad Anniversary",
    subtitle: "Anniversary · July 10",
    description:
      "A family circle for one stronger shared gift rather than several smaller separate ones.",
    members: [
      {
        name: "You",
        initials: "Y",
        contributed: true,
        amount: 50,
        colors: "from-[#4e596d] to-[#212a3c]",
      },
      {
        name: "Mum",
        initials: "M",
        contributed: false,
        amount: 0,
        colors: "from-[#eac8b8] to-[#9d6957]",
      },
      {
        name: "Sarah",
        initials: "S",
        contributed: false,
        amount: 0,
        colors: "from-[#e8b9a7] to-[#bf755f]",
      },
    ],
    pot: {
      active: true,
      item: "Le Creuset casserole dish",
      source: "From Mum’s hints",
      target: 180,
      raised: 50,
      note: "A practical family gift with a target everyone can work toward.",
    },
  },
  {
    id: 3,
    name: "James Promotion Circle",
    subtitle: "Milestone · July 16",
    description:
      "A smaller shared circle for celebrating James’s promotion with something useful and lasting.",
    members: [
      {
        name: "You",
        initials: "Y",
        contributed: false,
        amount: 0,
        colors: "from-[#4e596d] to-[#212a3c]",
      },
      {
        name: "Maya",
        initials: "M",
        contributed: false,
        amount: 0,
        colors: "from-[#efc3af] to-[#ae6e57]",
      },
    ],
    pot: {
      active: false,
      item: "",
      source: "",
      target: 0,
      raised: 0,
      note: "Choose one of James’s saved hints to turn this into a communal goal.",
    },
  },
];

function subtractDays(dateString, days) {
  const date = new Date(dateString);
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
}

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
        className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-b from-[#ffa47f] to-[#ff875d] text-sm font-bold text-white ring-4 ring-white/70"
        aria-label="Open account menu"
      >
        CG
      </button>

      <div className="invisible absolute right-0 top-[calc(100%+10px)] z-20 w-56 translate-y-1 rounded-[22px] border border-[#ecdcd2] bg-white p-2 opacity-0 shadow-[0_18px_45px_rgba(123,84,64,0.14)] transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        <Link
          href="/account"
          className="block rounded-[16px] px-4 py-3 text-sm text-slate-700 hover:bg-[#faf6f3]"
        >
          Account details
        </Link>
        <Link
          href="/settings"
          className="block rounded-[16px] px-4 py-3 text-sm text-slate-700 hover:bg-[#faf6f3]"
        >
          Settings
        </Link>
        <Link
          href="/billing"
          className="block rounded-[16px] px-4 py-3 text-sm text-slate-700 hover:bg-[#faf6f3]"
        >
          Payment details
        </Link>
      </div>
    </div>
  );
}

function ContactCard({ contact, onAdd }) {
  return (
    <article
      draggable
      className="cursor-grab rounded-[22px] border border-[#f0dfd6] bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing"
      aria-label={`Drag ${contact.name} into a circle`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-b text-[12px] font-bold text-white ${contact.colors}`}
        >
          {contact.initials}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{contact.name}</p>
          <p className="text-xs text-slate-500">
            {contact.role} · {contact.note}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onAdd(contact)}
          className="inline-flex h-9 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-3 text-[12px] font-semibold text-slate-700 hover:bg-[#fff5f0]"
        >
          Add
        </button>
      </div>
    </article>
  );
}

function MemberPill({ member }) {
  return (
    <div className="rounded-[20px] border border-[#eee1d9] bg-[#fffdfa] p-3">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-b text-[11px] font-bold text-white ${member.colors}`}
        >
          {member.initials}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{member.name}</p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                member.contributed
                  ? "bg-[#edf6eb] text-[#4a7a3a]"
                  : "bg-[#fff3ee] text-[#d57a58]"
              }`}
            >
              {member.contributed ? "Contributed" : "Pending"}
            </span>
            <span className="text-[11px] text-slate-400">
              {member.contributed ? `£${member.amount}` : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContributionRing({ raised, target, ringId }) {
  const percentage = target > 0 ? Math.min((raised / target) * 100, 100) : 0;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-[148px] w-[148px] items-center justify-center">
        <svg className="h-[148px] w-[148px] -rotate-90" viewBox="0 0 140 140" aria-hidden="true">
          <circle cx="70" cy="70" r={radius} stroke="#f1e3db" strokeWidth="12" fill="none" />
          <circle
            cx="70"
            cy="70"
            r={radius}
            stroke={`url(#${ringId})`}
            strokeWidth="12"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dash}
          />
          <defs>
            <linearGradient id={ringId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff9b75" />
              <stop offset="100%" stopColor="#f36f64" />
            </linearGradient>
          </defs>
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-white/80">
          <span className="text-[28px] font-semibold tracking-[-0.06em] text-slate-900">
            {Math.round(percentage)}%
          </span>
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
            funded
          </span>
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-500">
        £{raised} of £{target}
      </p>
    </div>
  );
}

function CircleCard({ circle }) {
  return (
    <article className="rounded-[30px] border border-[#f0dfd6] bg-white p-5 shadow-sm sm:p-6">
      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Circle
              </p>
              <h2 className="mt-1 text-[26px] font-semibold tracking-[-0.05em] text-slate-900">
                {circle.name}
              </h2>
              <p className="mt-2 text-sm text-slate-500">{circle.subtitle}</p>
            </div>

            <button className="inline-flex h-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-4 text-sm font-medium text-slate-700 hover:bg-[#fff5f0]">
              Add directly
            </button>
          </div>

          <p className="mt-4 max-w-[60ch] text-[14px] leading-7 text-slate-600">
            {circle.description}
          </p>

          <div className="mt-5 rounded-[24px] border border-dashed border-[#e6d7cd] bg-[#fffaf7] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Members</p>
                <p className="mt-1 text-[13px] text-slate-500">
                  Drag contacts here to expand the circle, or add someone directly.
                </p>
              </div>

              <div className="rounded-full bg-[#fff1ea] px-3 py-1 text-[11px] font-semibold text-[#df7b59]">
                Drop zone
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {circle.members.map((member) => (
                <MemberPill key={member.name} member={member} />
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[30px] border border-[#eedfd6] bg-[radial-gradient(circle_at_top,_#fff7f2,_#fffdfa_62%)] p-5">
          <div className="flex flex-col items-center text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Shared pot
            </p>
            <h3 className="mt-1 text-[22px] font-semibold tracking-[-0.04em] text-slate-900">
              {circle.pot.active ? circle.pot.item : "No pot created yet"}
            </h3>
            <p className="mt-2 max-w-[28ch] text-[13px] leading-6 text-slate-500">
              {circle.pot.active ? circle.pot.source : circle.pot.note}
            </p>

            {circle.pot.active ? (
              <>
                <div className="mt-5">
                  <ContributionRing
                    raised={circle.pot.raised}
                    target={circle.pot.target}
                    ringId={`circle-gradient-${circle.id}`}
                  />
                </div>

                <div className="mt-4 flex -space-x-3">
                  {circle.members.map((member) => (
                    <div
                      key={member.name}
                      className={`flex h-11 w-11 items-center justify-center rounded-full border-4 border-white bg-gradient-to-b text-[11px] font-bold text-white shadow-sm ${member.colors}`}
                      title={member.name}
                    >
                      {member.initials}
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-[14px] leading-7 text-slate-600">{circle.pot.note}</p>

                <button className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-[#2f3b2d] px-4 text-sm font-semibold text-white">
                  Edit pot
                </button>
              </>
            ) : (
              <>
                <div className="mt-6 rounded-[24px] border border-dashed border-[#e5d8cf] bg-white p-5 text-left">
                  <p className="text-sm font-semibold text-slate-900">Choose from saved hints</p>
                  <p className="mt-2 text-[14px] leading-7 text-slate-600">
                    Pick one of this contact’s saved hints and turn it into a communal funding
                    goal for the whole circle.
                  </p>
                </div>

                <button className="mt-5 inline-flex h-10 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-4 text-sm font-medium text-slate-700 hover:bg-[#fff5f0]">
                  Browse hints
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function CreateCircleModal({
  open,
  onClose,
  contacts,
  calendarEvents,
  selectedPeople,
  setSelectedPeople,
  eventMode,
  setEventMode,
  selectedEventId,
  setSelectedEventId,
  form,
  setForm,
  latestDeadline,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(42,26,20,0.38)] px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-[980px] overflow-hidden rounded-[34px] border border-[#eddacf] bg-[#fffaf7] shadow-[0_24px_80px_rgba(88,46,31,0.22)]">
        <div className="flex items-center justify-between border-b border-[#efe0d7] px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#df7b59]">
              New circle
            </p>
            <h2 className="mt-1 text-[28px] font-semibold tracking-[-0.05em] text-slate-900">
              Create a circle around an event
            </h2>
          </div>

          <button
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white text-slate-500 hover:bg-[#fff2eb]"
            aria-label="Close create circle window"
          >
            ✕
          </button>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-6 p-6">
            <div className="rounded-[24px] border border-[#eedfd6] bg-white p-5">
              <p className="text-sm font-semibold text-slate-900">1. Choose the event</p>

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEventMode("calendar")}
                  className={`inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-semibold ${
                    eventMode === "calendar"
                      ? "bg-[#2f3b2d] text-white"
                      : "border border-[#ead8ce] bg-white text-slate-700"
                  }`}
                >
                  From calendar
                </button>
                <button
                  type="button"
                  onClick={() => setEventMode("new")}
                  className={`inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-semibold ${
                    eventMode === "new"
                      ? "bg-[#2f3b2d] text-white"
                      : "border border-[#ead8ce] bg-white text-slate-700"
                  }`}
                >
                  New event
                </button>
              </div>

              {eventMode === "calendar" ? (
                <div className="mt-4 space-y-3">
                  {calendarEvents.map((event) => (
                    <label
                      key={event.id}
                      className={`flex cursor-pointer items-center justify-between rounded-[20px] border p-4 ${
                        String(event.id) === selectedEventId
                          ? "border-[#f0a384] bg-[#fff4ee]"
                          : "border-[#efe1d9] bg-[#fffdfa]"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                        <p className="mt-1 text-[13px] text-slate-500">
                          {event.type} · {event.date}
                        </p>
                      </div>
                      <input
                        type="radio"
                        name="calendarEvent"
                        className="h-4 w-4 accent-[#f36f64]"
                        checked={String(event.id) === selectedEventId}
                        onChange={() => {
                          setSelectedEventId(String(event.id));
                          setForm((prev) => ({ ...prev, eventDate: event.date }));
                        }}
                      />
                    </label>
                  ))}
                </div>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 sm:col-span-2">
                    <span className="text-sm font-medium text-slate-700">Event title</span>
                    <input
                      type="text"
                      value={form.eventTitle}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, eventTitle: e.target.value }))
                      }
                      className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
                      placeholder="Summer birthday dinner"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">Event date</span>
                    <input
                      type="date"
                      value={form.eventDate}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, eventDate: e.target.value }))
                      }
                      className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="rounded-[24px] border border-[#eedfd6] bg-white p-5">
              <p className="text-sm font-semibold text-slate-900">2. Circle details</p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Circle title</span>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
                    placeholder="Sarah birthday circle"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Deadline</span>
                  <input
                    type="date"
                    value={form.deadline}
                    max={latestDeadline}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, deadline: e.target.value }))
                    }
                    className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
                  />
                  <p className="text-[12px] text-slate-400">
                    Must be at least 7 days before the event.
                  </p>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Goal type</span>
                  <select
                    value={form.goalType}
                    onChange={(e) => setForm((prev) => ({ ...prev, goalType: e.target.value }))}
                    className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
                  >
                    <option value="item">Specific item</option>
                    <option value="amount">Target amount</option>
                  </select>
                </label>

                <label className="space-y-2 sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">
                    {form.goalType === "item" ? "Item to aim for" : "Target amount"}
                  </span>
                  <input
                    type="text"
                    value={form.goalValue}
                    onChange={(e) => setForm((prev) => ({ ...prev, goalValue: e.target.value }))}
                    className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
                    placeholder={form.goalType === "item" ? "Le Creuset casserole dish" : "£180"}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="border-t border-[#efe0d7] bg-[#fff7f2] p-6 lg:border-l lg:border-t-0">
            <div className="rounded-[24px] border border-dashed border-[#e6d7cd] bg-white p-5">
              <p className="text-sm font-semibold text-slate-900">3. Add people</p>
              <p className="mt-1 text-[13px] leading-6 text-slate-500">
                Drag contacts into this circle, or tap add to include them.
              </p>

              <div className="mt-4 min-h-[120px] rounded-[20px] bg-[#fffaf7] p-4">
                {selectedPeople.length ? (
                  <div className="flex flex-wrap gap-3">
                    {selectedPeople.map((person) => (
                      <div
                        key={person.id}
                        className="inline-flex items-center gap-2 rounded-full border border-[#ead8ce] bg-white px-3 py-2"
                      >
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-b text-[11px] font-bold text-white ${person.colors}`}
                        >
                          {person.initials}
                        </div>
                        <span className="text-sm font-medium text-slate-700">{person.name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedPeople((prev) =>
                              prev.filter((item) => item.id !== person.id)
                            )
                          }
                          className="text-slate-400 hover:text-slate-600"
                          aria-label={`Remove ${person.name}`}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No one added yet.</p>
                )}
              </div>

              <div className="mt-5 space-y-3">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between rounded-[18px] border border-[#f0dfd6] bg-[#fffdfa] p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-b text-[11px] font-bold text-white ${contact.colors}`}
                      >
                        {contact.initials}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{contact.name}</p>
                        <p className="text-[12px] text-slate-500">{contact.role}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedPeople((prev) =>
                          prev.some((person) => person.id === contact.id)
                            ? prev
                            : [...prev, contact]
                        )
                      }
                      className="inline-flex h-9 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-3 text-[12px] font-semibold text-slate-700 hover:bg-[#fff5f0]"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-6 text-sm font-semibold text-slate-700 hover:bg-[#fff5f0]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-6 text-sm font-semibold text-white shadow-lg"
                >
                  Create circle
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CirclesClient() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [eventMode, setEventMode] = useState("calendar");
  const [selectedEventId, setSelectedEventId] = useState(String(calendarEvents[0].id));
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [form, setForm] = useState({
    title: "",
    eventTitle: "",
    eventDate: calendarEvents[0].date,
    deadline: "",
    goalType: "item",
    goalValue: "",
  });

  const activeEventDate =
    eventMode === "calendar"
      ? calendarEvents.find((event) => String(event.id) === selectedEventId)?.date || ""
      : form.eventDate;

  const latestDeadline = activeEventDate ? subtractDays(activeEventDate, 7) : "";

  return (
    <main className="min-h-screen bg-[#fffaf7] text-slate-800">
      <header className="border-b border-[#efe0d7] bg-[#fffaf7]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 md:px-8">
          <Link href="/feed" className="flex items-center gap-3.5">
            <LogoMark />
            <div className="text-[22px] font-extrabold tracking-[-0.05em] text-slate-900">
              Hinted<span className="text-[#f36f64]">.io</span>
            </div>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <nav className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/feed"
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-4 sm:px-5 text-[14px] font-semibold text-slate-700 hover:bg-[#fff5f0]"
              >
                Feed
              </Link>
              <Link
                href="/hints"
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-4 sm:px-5 text-[14px] font-semibold text-slate-700 hover:bg-[#fff5f0]"
              >
                Hints
              </Link>
              <Link
                href="/circles"
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-4 sm:px-5 text-[14px] font-semibold text-slate-900 shadow-sm"
              >
                Circles
              </Link>
            </nav>

            <AvatarMenu />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-5 py-8 md:px-8">
        <section className="rounded-[34px] border border-[#eeddd3] bg-[#fff7f2] p-4 shadow-[0_18px_60px_rgba(173,101,72,0.1)] sm:p-5">
          <div className="rounded-[28px] border border-[#f1dfd6] bg-white p-5 sm:p-6">
            <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
              <aside className="space-y-4">
                <div className="rounded-[26px] border border-[#f0dfd6] bg-[#fffdfa] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Contacts
                  </p>
                  <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.04em] text-slate-900">
                    People you can add
                  </h1>
                  <p className="mt-2 text-[14px] leading-7 text-slate-600">
                    Drag people into a circle, or add them directly while you build the group.
                  </p>

                  <div className="mt-5 space-y-3">
                    {contacts.map((contact) => (
                      <ContactCard
                        key={contact.id}
                        contact={contact}
                        onAdd={(person) => {
                          setSelectedPeople((prev) =>
                            prev.some((item) => item.id === person.id)
                              ? prev
                              : [...prev, person]
                          );
                          setIsCreateOpen(true);
                        }}
                      />
                    ))}
                  </div>

                  <button className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full border border-[#ead8ce] bg-white px-4 text-sm font-medium text-slate-700 hover:bg-[#fff5f0]">
                    Add new contact
                  </button>
                </div>
              </aside>

              <section className="min-w-0">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <div className="inline-flex rounded-full bg-[#fff4ee] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#e37b57]">
                      Shared gifting
                    </div>
                    <h2 className="mt-3 text-[34px] font-semibold tracking-[-0.06em] text-slate-900 sm:text-[40px]">
                      Build circles around the people and moments that matter.
                    </h2>
                    <p className="mt-3 max-w-[760px] text-[15px] leading-7 text-slate-600">
                      Add members, choose a saved hint from the person the circle is for,
                      and turn it into a communal pot everyone can work toward together.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(true)}
                    className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-6 text-sm font-semibold text-white shadow-lg"
                  >
                    Create new circle
                  </button>
                </div>

                <div className="space-y-5">
                  {circles.map((circle) => (
                    <CircleCard key={circle.id} circle={circle} />
                  ))}
                </div>
              </section>
            </div>
          </div>
        </section>
      </div>

      <CreateCircleModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        contacts={contacts}
        calendarEvents={calendarEvents}
        selectedPeople={selectedPeople}
        setSelectedPeople={setSelectedPeople}
        eventMode={eventMode}
        setEventMode={setEventMode}
        selectedEventId={selectedEventId}
        setSelectedEventId={setSelectedEventId}
        form={form}
        setForm={setForm}
        latestDeadline={latestDeadline}
      />
    </main>
  );
}
