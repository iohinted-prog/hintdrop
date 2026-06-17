"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const initialContacts = [
  {
    id: 1,
    name: "Maya",
    role: "Friend",
    note: "Saved 8 hints",
    initials: "M",
    colors: "from-[#efc3af] to-[#ae6e57]",
    email: "",
    phone: "",
    birthday: "",
  },
  {
    id: 2,
    name: "James",
    role: "Brother",
    note: "Saved 5 hints",
    initials: "J",
    colors: "from-[#4e596d] to-[#212a3c]",
    email: "",
    phone: "",
    birthday: "",
  },
  {
    id: 3,
    name: "Fiona",
    role: "Friend",
    note: "Saved 4 hints",
    initials: "F",
    colors: "from-[#809168] to-[#41512e]",
    email: "",
    phone: "",
    birthday: "",
  },
  {
    id: 4,
    name: "Mum",
    role: "Family",
    note: "Saved 6 hints",
    initials: "M",
    colors: "from-[#eac8b8] to-[#9d6957]",
    email: "",
    phone: "",
    birthday: "",
  },
  {
    id: 5,
    name: "Sarah",
    role: "Partner",
    note: "Saved 10 hints",
    initials: "S",
    colors: "from-[#e8b9a7] to-[#bf755f]",
    email: "",
    phone: "",
    birthday: "",
  },
  {
    id: 6,
    name: "Tom",
    role: "Friend",
    note: "Saved 3 hints",
    initials: "T",
    colors: "from-[#b7c8db] to-[#6b88a7]",
    email: "",
    phone: "",
    birthday: "",
  },
];

const calendarEvents = [
  { id: 1, title: "Sarah's Birthday", date: "2026-06-29", type: "Birthday" },
  { id: 2, title: "Mum & Dad Anniversary", date: "2026-07-10", type: "Anniversary" },
  { id: 3, title: "James Promotion Dinner", date: "2026-07-16", type: "Milestone" },
];

const publicHintsByContact = {
  1: [
    { id: "maya-1", title: "Silk pillowcase set", subtitle: "£45 · Public hint" },
    { id: "maya-2", title: "Aesop hand wash duo", subtitle: "£62 · Public hint" },
    { id: "maya-3", title: "Sunday lunch voucher", subtitle: "£80 · Public hint" },
  ],
  2: [
    { id: "james-1", title: "Noise-cancelling headphones", subtitle: "£240 · Public hint" },
    { id: "james-2", title: "Leather weekender bag", subtitle: "£175 · Public hint" },
  ],
  3: [
    { id: "fiona-1", title: "Ceramics workshop", subtitle: "£95 · Public hint" },
    { id: "fiona-2", title: "Spa afternoon for two", subtitle: "£140 · Public hint" },
    { id: "fiona-3", title: "Illustrated recipe book", subtitle: "£28 · Public hint" },
  ],
  4: [
    { id: "mum-1", title: "Le Creuset casserole dish", subtitle: "£180 · Public hint" },
    { id: "mum-2", title: "Garden centre gift card", subtitle: "£50 · Public hint" },
  ],
  5: [
    { id: "sarah-1", title: "Weekend cabin stay", subtitle: "£220 · Public hint" },
    { id: "sarah-2", title: "Linen bedding set", subtitle: "£130 · Public hint" },
    { id: "sarah-3", title: "Ceramic dinnerware", subtitle: "£85 · Public hint" },
    { id: "sarah-4", title: "Cooking class for two", subtitle: "£120 · Public hint" },
  ],
  6: [
    { id: "tom-1", title: "Train travel voucher", subtitle: "£60 · Public hint" },
    { id: "tom-2", title: "Coffee subscription", subtitle: "£38 · Public hint" },
  ],
};

const initialCircles = [
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
        status: "joined",
      },
      {
        name: "Maya",
        initials: "M",
        contributed: true,
        amount: 35,
        colors: "from-[#efc3af] to-[#ae6e57]",
        status: "joined",
      },
      {
        name: "James",
        initials: "J",
        contributed: false,
        amount: 0,
        colors: "from-[#4e596d] to-[#212a3c]",
        status: "invited",
      },
      {
        name: "Fiona",
        initials: "F",
        contributed: true,
        amount: 20,
        colors: "from-[#809168] to-[#41512e]",
        status: "joined",
      },
    ],
    pot: {
      active: true,
      item: "Weekend cabin stay",
      source: "From Sarah’s public hints",
      target: 220,
      raised: 95,
      note: "Selected from Sarah’s own hints so the group has a clear goal.",
      fundingMode: "Flexible pot",
      deadline: "2026-06-29",
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
        status: "joined",
      },
      {
        name: "Mum",
        initials: "M",
        contributed: false,
        amount: 0,
        colors: "from-[#eac8b8] to-[#9d6957]",
        status: "invited",
      },
      {
        name: "Sarah",
        initials: "S",
        contributed: false,
        amount: 0,
        colors: "from-[#e8b9a7] to-[#bf755f]",
        status: "invited",
      },
    ],
    pot: {
      active: true,
      item: "Le Creuset casserole dish",
      source: "From Mum’s public hints",
      target: 180,
      raised: 50,
      note: "A practical family gift with a target everyone can work toward.",
      fundingMode: "Organizer covers gap",
      deadline: "2026-07-10",
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
        status: "joined",
      },
      {
        name: "Maya",
        initials: "M",
        contributed: false,
        amount: 0,
        colors: "from-[#efc3af] to-[#ae6e57]",
        status: "invited",
      },
    ],
    pot: {
      active: false,
      item: "",
      source: "",
      target: 0,
      raised: 0,
      note: "Choose a public hint or paste a link to turn this into a communal goal.",
      fundingMode: "Flexible pot",
      deadline: "2026-07-16",
    },
  },
];

function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function getContactGradient(role) {
  if (role === "Family") return "from-[#eac8b8] to-[#9d6957]";
  if (role === "Partner") return "from-[#e8b9a7] to-[#bf755f]";
  return "from-[#efcdbf] to-[#bb8168]";
}

function formatDateLabel(dateString) {
  if (!dateString) return "No date";
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
  });
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
        className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-b from-[#efcdbf] to-[#bb8168] text-sm font-bold text-white ring-4 ring-white/70"
        aria-label="Open account menu"
        type="button"
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

function ModalShell({ open, onClose, title, eyebrow, children, maxWidth = "max-w-[1120px]" }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(42,26,20,0.38)] px-4 py-6 backdrop-blur-sm">
      <div
        className={`max-h-[92vh] w-full overflow-hidden rounded-[34px] border border-[#eddacf] bg-[#fffaf7] shadow-[0_24px_80px_rgba(88,46,31,0.22)] ${maxWidth}`}
      >
        <div className="flex items-center justify-between border-b border-[#efe0d7] px-6 py-5">
          <div>
            {eyebrow ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#df7b59]">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="mt-1 text-[28px] font-semibold tracking-[-0.05em] text-slate-900">
              {title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white text-slate-500 hover:bg-[#fff2eb]"
            aria-label="Close window"
            type="button"
          >
            ✕
          </button>
        </div>

        {children}
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
  const statusStyles =
    member.status === "joined"
      ? member.contributed
        ? "bg-[#edf6eb] text-[#4a7a3a]"
        : "bg-[#eef4ff] text-[#5676b3]"
      : "bg-[#fff3ee] text-[#d57a58]";

  const statusLabel =
    member.status === "joined"
      ? member.contributed
        ? "Contributed"
        : "Joined"
      : "Invited";

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
            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles}`}>
              {statusLabel}
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
  const joinedCount = circle.members.filter((member) => member.status === "joined").length;
  const invitedCount = circle.members.length;

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

            <div className="rounded-full bg-[#fff4ee] px-3 py-1 text-[11px] font-semibold text-[#df7b59]">
              {joinedCount} of {invitedCount} joined
            </div>
          </div>

          <p className="mt-4 max-w-[60ch] text-[14px] leading-7 text-slate-600">
            {circle.description}
          </p>

          <div className="mt-5 rounded-[24px] border border-dashed border-[#e6d7cd] bg-[#fffaf7] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Members</p>
                <p className="mt-1 text-[13px] text-slate-500">
                  People can be invited now and only become full members once they accept.
                </p>
              </div>

              <div className="rounded-full bg-[#fff1ea] px-3 py-1 text-[11px] font-semibold text-[#df7b59]">
                Circle invite flow
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {circle.members.map((member) => (
                <MemberPill key={`${circle.id}-${member.name}`} member={member} />
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
                      key={`${circle.id}-${member.name}-avatar`}
                      className={`flex h-11 w-11 items-center justify-center rounded-full border-4 border-white bg-gradient-to-b text-[11px] font-bold text-white shadow-sm ${member.colors}`}
                      title={member.name}
                    >
                      {member.initials}
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <span className="rounded-full bg-[#fff4ee] px-3 py-1 text-[11px] font-semibold text-[#df7b59]">
                    {circle.pot.fundingMode}
                  </span>
                  <span className="rounded-full bg-[#f3f6fb] px-3 py-1 text-[11px] font-semibold text-slate-600">
                    Deadline {formatDateLabel(circle.pot.deadline)}
                  </span>
                </div>

                <p className="mt-4 text-[14px] leading-7 text-slate-600">{circle.pot.note}</p>

                <button
                  type="button"
                  className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-[#2f3b2d] px-4 text-sm font-semibold text-white"
                >
                  Edit pot
                </button>
              </>
            ) : (
              <>
                <div className="mt-6 rounded-[24px] border border-dashed border-[#e5d8cf] bg-white p-5 text-left">
                  <p className="text-sm font-semibold text-slate-900">Choose from hints or links</p>
                  <p className="mt-2 text-[14px] leading-7 text-slate-600">
                    Pick a public hint or paste a product link so the circle has one shared goal.
                  </p>
                </div>

                <button
                  type="button"
                  className="mt-5 inline-flex h-10 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-4 text-sm font-medium text-slate-700 hover:bg-[#fff5f0]"
                >
                  Add item
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function PotTypeGuide() {
  const potTypes = [
    {
      title: "Flexible pot",
      text: "Anyone invited can join and contribute what they want. If fewer people join, the group can still continue with a smaller total or switch to a simpler gift.",
      colors: "bg-[#edf6eb] text-[#4a7a3a]",
    },
    {
      title: "All-or-nothing",
      text: "The circle only goes ahead if the target is reached by the deadline. This works best when the item only makes sense at the full amount.",
      colors: "bg-[#fff3ee] text-[#d57a58]",
    },
    {
      title: "Organizer covers gap",
      text: "The organiser can choose to top up the missing amount if not everyone joins or contributes. Useful when the gift matters more than exact participation.",
      colors: "bg-[#eef4ff] text-[#5676b3]",
    },
  ];

  return (
    <section className="rounded-[26px] border border-[#f0dfd6] bg-white p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        Pot guide
      </p>
      <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.04em] text-slate-900">
        How pot types work
      </h2>
      <p className="mt-2 text-[14px] leading-7 text-slate-600">
        Choose the funding style that best fits the gift and how certain you are that everyone will join.
      </p>

      <div className="mt-5 space-y-3">
        {potTypes.map((type) => (
          <div key={type.title} className="rounded-[20px] bg-[#faf7f4] p-4">
            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${type.colors}`}>
              {type.title}
            </span>
            <p className="mt-3 text-[13px] leading-6 text-slate-600">{type.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CreateCircleModal({
  open,
  onClose,
  onSubmit,
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
  linkPreview,
  isFetchingPreview,
  handleFetchPreview,
  selectedHintContactId,
  setSelectedHintContactId,
}) {
  if (!open) return null;

  const selectedHintContact = contacts.find(
    (contact) => String(contact.id) === String(selectedHintContactId)
  );
  const visibleHints = selectedHintContactId
    ? publicHintsByContact[selectedHintContactId] || []
    : [];
  const amountMode = form.goalType === "amount";

  return (
    <ModalShell open={open} onClose={onClose} eyebrow="New circle" title="Create a circle around an event">
      <div className="grid gap-0 lg:grid-cols-[1.06fr_0.94fr]">
        <div className="max-h-[calc(92vh-90px)] space-y-6 overflow-y-auto p-6">
          <div className="rounded-[24px] border border-[#eedfd6] bg-white p-5">
            <p className="text-sm font-semibold text-slate-900">1. Goal type</p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">What are you aiming for?</span>
                <select
                  value={form.goalType}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      goalType: nextValue,
                      itemSource: nextValue === "amount" ? "" : prev.itemSource || "hint",
                      selectedHintId: nextValue === "amount" ? "" : prev.selectedHintId,
                      itemUrl: nextValue === "amount" ? "" : prev.itemUrl,
                    }));
                  }}
                  className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
                >
                  <option value="item">Specific item</option>
                  <option value="amount">Target amount</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">
                  {form.goalType === "item" ? "Item or label" : "Target amount"}
                </span>
                <input
                  type="text"
                  value={form.goalValue}
                  onChange={(e) => setForm((prev) => ({ ...prev, goalValue: e.target.value }))}
                  className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
                  placeholder={form.goalType === "item" ? "Weekend cabin stay" : "£220"}
                />
              </label>
            </div>
          </div>

          <div className="rounded-[24px] border border-[#eedfd6] bg-white p-5">
            <p className="text-sm font-semibold text-slate-900">2. Choose the event</p>

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
                        setForm((prev) => ({
                          ...prev,
                          eventTitle: event.title,
                          eventDate: event.date,
                          deadline: event.date,
                        }));
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
                      setForm((prev) => ({
                        ...prev,
                        eventDate: e.target.value,
                        deadline: e.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="rounded-[24px] border border-[#eedfd6] bg-white p-5">
            <p className="text-sm font-semibold text-slate-900">3. Circle details</p>

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
                <span className="text-sm font-medium text-slate-700">Contribution deadline</span>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm((prev) => ({ ...prev, deadline: e.target.value }))}
                  className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
                />
                <p className="text-[12px] text-slate-400">
                  Defaults to the event day, but you can close contributions earlier.
                </p>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">If people do not join</span>
                <select
                  value={form.fundingMode}
                  onChange={(e) => setForm((prev) => ({ ...prev, fundingMode: e.target.value }))}
                  className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
                >
                  <option value="flexible">Flexible pot</option>
                  <option value="all_or_nothing">All-or-nothing</option>
                  <option value="organizer_covers">Organizer covers gap</option>
                </select>
              </label>
            </div>
          </div>

          <div
            className={`rounded-[24px] border p-5 transition ${
              amountMode
                ? "border-[#efe4dd] bg-[#faf7f5] opacity-60"
                : "border-[#eedfd6] bg-white opacity-100"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">4. Choose the item</p>
                <p className="mt-1 text-[13px] leading-6 text-slate-500">
                  Pick from a contact’s public hints or paste a link from anywhere on the internet.
                </p>
              </div>

              {amountMode ? (
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-500">
                  Skipped for target amount
                </span>
              ) : null}
            </div>

            {!amountMode ? (
              <>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        itemSource: "hint",
                        itemUrl: "",
                      }))
                    }
                    className={`inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-semibold ${
                      form.itemSource === "hint"
                        ? "bg-[#2f3b2d] text-white"
                        : "border border-[#ead8ce] bg-white text-slate-700"
                    }`}
                  >
                    From public hints
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        itemSource: "url",
                        selectedHintId: "",
                      }))
                    }
                    className={`inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-semibold ${
                      form.itemSource === "url"
                        ? "bg-[#2f3b2d] text-white"
                        : "border border-[#ead8ce] bg-white text-slate-700"
                    }`}
                  >
                    Paste a link
                  </button>
                </div>

                {form.itemSource === "hint" ? (
                  <div className="mt-4 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                    <div className="rounded-[22px] border border-[#efe1d9] bg-[#fffdfa] p-3">
                      <p className="px-2 pb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Contacts
                      </p>
                      <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                        {contacts.map((contact) => {
                          const selected = String(contact.id) === String(selectedHintContactId);

                          return (
                            <button
                              key={contact.id}
                              type="button"
                              onClick={() => {
                                setSelectedHintContactId(contact.id);
                                setForm((prev) => ({
                                  ...prev,
                                  selectedHintId: "",
                                }));
                              }}
                              className={`flex w-full items-center gap-3 rounded-[18px] border px-3 py-3 text-left transition ${
                                selected
                                  ? "border-[#f0a384] bg-[#fff4ee]"
                                  : "border-[#efe1d9] bg-white hover:bg-[#fff8f4]"
                              }`}
                            >
                              <div
                                className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-b text-[11px] font-bold text-white ${contact.colors}`}
                              >
                                {contact.initials}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900">{contact.name}</p>
                                <p className="text-[12px] text-slate-500">{contact.role}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-[#efe1d9] bg-[#fffdfa] p-4">
                      {selectedHintContact ? (
                        <>
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-b text-[12px] font-bold text-white ${selectedHintContact.colors}`}
                            >
                              {selectedHintContact.initials}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {selectedHintContact.name}'s public hints
                              </p>
                              <p className="text-[13px] text-slate-500">
                                Choose one shared goal for this circle.
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 max-h-[320px] space-y-3 overflow-y-auto pr-1">
                            {visibleHints.length ? (
                              visibleHints.map((hint) => (
                                <label
                                  key={hint.id}
                                  className={`flex cursor-pointer items-center justify-between rounded-[20px] border p-4 ${
                                    form.selectedHintId === hint.id
                                      ? "border-[#f0a384] bg-[#fff4ee]"
                                      : "border-[#efe1d9] bg-white"
                                  }`}
                                >
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">{hint.title}</p>
                                    <p className="mt-1 text-[13px] text-slate-500">{hint.subtitle}</p>
                                  </div>

                                  <input
                                    type="radio"
                                    name="selectedHint"
                                    className="h-4 w-4 accent-[#f36f64]"
                                    checked={form.selectedHintId === hint.id}
                                    onChange={() =>
                                      setForm((prev) => ({
                                        ...prev,
                                        selectedHintId: hint.id,
                                        goalType: "item",
                                        goalValue: hint.title,
                                      }))
                                    }
                                  />
                                </label>
                              ))
                            ) : (
                              <div className="rounded-[18px] bg-white p-4 text-sm text-slate-500">
                                No public hints available for this contact yet.
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="flex h-full min-h-[220px] items-center justify-center rounded-[18px] bg-white p-6 text-center text-sm text-slate-500">
                          Select a contact to view their public hints.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        type="url"
                        value={form.itemUrl}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, itemUrl: e.target.value }))
                        }
                        placeholder="Paste product or experience link"
                        className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
                      />
                      <button
                        type="button"
                        onClick={handleFetchPreview}
                        className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-5 text-sm font-semibold text-white shadow-lg"
                      >
                        {isFetchingPreview ? "Fetching..." : "Fetch preview"}
                      </button>
                    </div>

                    {linkPreview ? (
                      <div className="rounded-[22px] border border-[#eedfd6] bg-[#fffdfa] p-4">
                        <div className="flex gap-4">
                          {linkPreview.image ? (
                            <img
                              src={linkPreview.image}
                              alt={linkPreview.title || "Linked item preview"}
                              className="h-20 w-20 rounded-[18px] object-cover"
                            />
                          ) : (
                            <div className="h-20 w-20 rounded-[18px] bg-[#f5ebe4]" />
                          )}

                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900">
                              {linkPreview.title || "Untitled item"}
                            </p>
                            <p className="mt-1 text-[13px] leading-6 text-slate-500">
                              {linkPreview.description || "Preview pulled from the linked page."}
                            </p>
                            <p className="mt-2 text-[12px] font-medium text-[#df7b59]">
                              {linkPreview.siteName || linkPreview.url}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </>
            ) : (
              <div className="mt-4 rounded-[20px] border border-dashed border-[#e4d7cf] bg-white p-4 text-sm text-slate-500">
                Because you chose a target amount rather than a specific item, this section is skipped.
              </div>
            )}
          </div>
        </div>

        <div className="max-h-[calc(92vh-90px)] overflow-y-auto border-t border-[#efe0d7] bg-[#fff7f2] p-6 lg:border-l lg:border-t-0">
          <div className="rounded-[24px] border border-dashed border-[#e6d7cd] bg-white p-5">
            <p className="text-sm font-semibold text-slate-900">5. Add people</p>
            <p className="mt-1 text-[13px] leading-6 text-slate-500">
              Invite people now. They only become full members after they accept.
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
              {contacts.map((contact) => {
                const alreadyAdded = selectedPeople.some((person) => person.id === contact.id);

                return (
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
                          alreadyAdded ? prev : [...prev, contact]
                        )
                      }
                      className={`inline-flex h-9 items-center justify-center rounded-full px-3 text-[12px] font-semibold ${
                        alreadyAdded
                          ? "bg-[#edf6eb] text-[#4a7a3a]"
                          : "border border-[#ead8ce] bg-white text-slate-700 hover:bg-[#fff5f0]"
                      }`}
                    >
                      {alreadyAdded ? "Added" : "Invite"}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 rounded-[20px] bg-[#fffaf7] p-4">
              <p className="text-sm font-semibold text-slate-900">What happens if people do not join?</p>
              <p className="mt-2 text-[13px] leading-6 text-slate-500">
                Your funding mode controls the fallback: keep the pot flexible, cancel if the goal is not met, or let the organiser cover the gap.
              </p>
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
                onClick={onSubmit}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-6 text-sm font-semibold text-white shadow-lg"
              >
                Create circle
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function AddContactModal({ open, onClose, onSave, form, setForm }) {
  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave();
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      eyebrow="New contact"
      title="Add a new contact"
      maxWidth="max-w-[720px]"
    >
      <form onSubmit={handleSubmit} className="p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Name</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Jane Smith"
              className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Email address</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="jane@example.com"
              className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Phone number</span>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="07123 456789"
              className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Relationship</span>
            <select
              value={form.role}
              onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
              className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
            >
              <option value="">Select relationship</option>
              <option value="Friend">Friend</option>
              <option value="Family">Family</option>
              <option value="Partner">Partner</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Birthday</span>
            <input
              type="date"
              value={form.birthday}
              onChange={(e) => setForm((prev) => ({ ...prev, birthday: e.target.value }))}
              className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
            />
          </label>
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
            type="submit"
            className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-6 text-sm font-semibold text-white shadow-lg"
          >
            Save contact
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export default function CirclesClient() {
  const [contacts, setContacts] = useState(initialContacts);
  const [circles, setCircles] = useState(initialCircles);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [eventMode, setEventMode] = useState("calendar");
  const [selectedEventId, setSelectedEventId] = useState(String(calendarEvents[0].id));
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [selectedHintContactId, setSelectedHintContactId] = useState(initialContacts[0].id);
  const [linkPreview, setLinkPreview] = useState(null);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);

  const [form, setForm] = useState({
    title: "",
    eventTitle: calendarEvents[0].title,
    eventDate: calendarEvents[0].date,
    deadline: calendarEvents[0].date,
    goalType: "item",
    goalValue: "",
    fundingMode: "flexible",
    itemSource: "hint",
    selectedHintId: "",
    itemUrl: "",
  });

  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    role: "",
    birthday: "",
    phone: "",
  });

  const activeEvent = useMemo(
    () => calendarEvents.find((event) => String(event.id) === selectedEventId) || calendarEvents[0],
    [selectedEventId]
  );

  const resetContactForm = () => {
    setContactForm({
      name: "",
      email: "",
      role: "",
      birthday: "",
      phone: "",
    });
  };

  const resetCircleForm = () => {
    setEventMode("calendar");
    setSelectedEventId(String(calendarEvents[0].id));
    setSelectedPeople([]);
    setSelectedHintContactId(initialContacts[0].id);
    setLinkPreview(null);
    setForm({
      title: "",
      eventTitle: calendarEvents[0].title,
      eventDate: calendarEvents[0].date,
      deadline: calendarEvents[0].date,
      goalType: "item",
      goalValue: "",
      fundingMode: "flexible",
      itemSource: "hint",
      selectedHintId: "",
      itemUrl: "",
    });
  };

  const handleSaveContact = () => {
    const trimmedName = contactForm.name.trim();
    if (!trimmedName) return;

    const role = contactForm.role || "Friend";
    const newContact = {
      id: Date.now(),
      name: trimmedName,
      role,
      note: "New contact",
      initials: getInitials(trimmedName),
      colors: getContactGradient(role),
      email: contactForm.email.trim(),
      phone: contactForm.phone.trim(),
      birthday: contactForm.birthday,
    };

    setContacts((prev) => [newContact, ...prev]);
    resetContactForm();
    setIsAddContactOpen(false);
  };

  const handleFetchPreview = async () => {
    if (!form.itemUrl.trim()) return;

    try {
      setIsFetchingPreview(true);

      const response = await fetch("/api/link-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: form.itemUrl.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch preview");
      }

      setLinkPreview(data);

      if (!form.goalValue) {
        setForm((prev) => ({
          ...prev,
          goalType: "item",
          goalValue: data.title || prev.goalValue,
        }));
      }
    } catch (error) {
      setLinkPreview({
        title: "Preview unavailable",
        description: "We could not pull a preview from that link yet, but you can still use the URL.",
        image: "",
        siteName: form.itemUrl,
        url: form.itemUrl,
      });
    } finally {
      setIsFetchingPreview(false);
    }
  };

  const handleCreateCircle = () => {
    const selectedEvent =
      eventMode === "calendar"
        ? calendarEvents.find((event) => String(event.id) === selectedEventId)
        : null;

    const eventTitle =
      eventMode === "calendar"
        ? selectedEvent?.title || form.eventTitle
        : form.eventTitle.trim();

    const eventDate =
      eventMode === "calendar"
        ? selectedEvent?.date || form.eventDate
        : form.eventDate;

    const title = form.title.trim() || `${eventTitle || "New"} circle`;

    if (!eventDate || !title) return;

    const fundingModeLabel =
      form.fundingMode === "all_or_nothing"
        ? "All-or-nothing"
        : form.fundingMode === "organizer_covers"
          ? "Organizer covers gap"
          : "Flexible pot";

    const targetNumber = Number(String(form.goalValue).replace(/[^\d.]/g, "")) || 0;

    const selectedHint =
      publicHintsByContact[selectedHintContactId]?.find((hint) => hint.id === form.selectedHintId) || null;
    const selectedHintContact =
      contacts.find((contact) => String(contact.id) === String(selectedHintContactId)) || null;

    const itemLabel =
      form.goalType === "amount"
        ? "Shared contribution pot"
        : form.goalValue.trim() || linkPreview?.title || selectedHint?.title || "New shared item";

    const sourceLabel =
      form.goalType === "amount"
        ? "Amount-based goal"
        : form.itemSource === "hint"
          ? `From ${selectedHintContact?.name || "contact"}’s public hints`
          : linkPreview?.siteName || "From pasted link";

    const newCircle = {
      id: Date.now(),
      name: title,
      subtitle: `${eventMode === "calendar" ? selectedEvent?.type || "Event" : "Event"} · ${formatDateLabel(eventDate)}`,
      description:
        "A new shared circle built around one event, one goal, and a clear fallback if invitees do not join.",
      members: [
        {
          name: "You",
          initials: "Y",
          contributed: false,
          amount: 0,
          colors: "from-[#4e596d] to-[#212a3c]",
          status: "joined",
        },
        ...selectedPeople.map((person) => ({
          name: person.name,
          initials: person.initials,
          contributed: false,
          amount: 0,
          colors: person.colors,
          status: "invited",
        })),
      ],
      pot: {
        active: true,
        item: itemLabel,
        source: sourceLabel,
        target: targetNumber,
        raised: 0,
        note:
          form.fundingMode === "all_or_nothing"
            ? "This circle will only proceed if the group reaches the target by the deadline."
            : form.fundingMode === "organizer_covers"
              ? "If the full target is not reached, the organiser can choose to cover the gap."
              : "This circle can stay flexible if fewer people join than expected.",
        fundingMode: fundingModeLabel,
        deadline: form.deadline || eventDate,
      },
    };

    setCircles((prev) => [newCircle, ...prev]);
    setIsCreateOpen(false);
    resetCircleForm();
  };

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
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-4 text-[14px] font-semibold text-slate-700 hover:bg-[#fff5f0] sm:px-5"
              >
                Feed
              </Link>
              <Link
                href="/hints"
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-4 text-[14px] font-semibold text-slate-700 hover:bg-[#fff5f0] sm:px-5"
              >
                Hints
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
                    Invite people into shared circles, then track who has joined and who is still pending.
                  </p>

                  <div className="mt-5 space-y-3">
                    {contacts.map((contact) => (
                      <ContactCard
                        key={contact.id}
                        contact={contact}
                        onAdd={(person) => {
                          setSelectedPeople((prev) =>
                            prev.some((item) => item.id === person.id) ? prev : [...prev, person]
                          );
                          setIsCreateOpen(true);
                        }}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAddContactOpen(true)}
                    className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-4 text-sm font-semibold text-white shadow-lg"
                  >
                    Add new contact
                  </button>
                </div>

                <PotTypeGuide />
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
                      Create a circle around an event, invite people, choose a public hint or pasted link, and let the pot stay flexible if everyone does not join.
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
        onClose={() => {
          setIsCreateOpen(false);
          resetCircleForm();
        }}
        onSubmit={handleCreateCircle}
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
        linkPreview={linkPreview}
        isFetchingPreview={isFetchingPreview}
        handleFetchPreview={handleFetchPreview}
        selectedHintContactId={selectedHintContactId}
        setSelectedHintContactId={setSelectedHintContactId}
      />

      <AddContactModal
        open={isAddContactOpen}
        onClose={() => {
          resetContactForm();
          setIsAddContactOpen(false);
        }}
        onSave={handleSaveContact}
        form={contactForm}
        setForm={setContactForm}
      />
    </main>
  );
}
