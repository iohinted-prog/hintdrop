"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
import AvatarMenu from "../components/AvatarMenu";

const currencyOptions = [
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar" },
  { code: "NZD", symbol: "NZ$", label: "New Zealand Dollar" },
  { code: "ZAR", symbol: "R", label: "South African Rand" },
  { code: "CAD", symbol: "C$", label: "Canadian Dollar" },
];

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
    {
      id: "maya-1",
      title: "Silk pillowcase set",
      subtitle: "£45 · Public hint",
      amount: 45,
      currency: "GBP",
      description: "A soft silk set that feels elevated, useful, and easy for a group to contribute toward.",
      image:
        "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=800&q=80",
      url: "https://example.com/silk-pillowcase-set",
    },
    {
      id: "maya-2",
      title: "Aesop hand wash duo",
      subtitle: "£62 · Public hint",
      amount: 62,
      currency: "GBP",
      description: "A practical but premium home gift with a recognisable brand and easy shared target.",
      image:
        "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80",
      url: "https://example.com/aesop-hand-wash-duo",
    },
  ],
  5: [
    {
      id: "sarah-1",
      title: "Weekend cabin stay",
      subtitle: "£220 · Public hint",
      amount: 220,
      currency: "GBP",
      description: "A memorable shared experience with a clear target that works naturally as a circle goal.",
      image:
        "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
      url: "https://example.com/weekend-cabin-stay",
    },
  ],
};

const initialCircles = [
  {
    id: 1,
    name: "Sarah's Birthday",
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
    ],
    pot: {
      active: true,
      item: "Weekend cabin stay",
      source: "From Sarah’s public hints",
      sourceUrl: "https://example.com/weekend-cabin-stay",
      previewImage:
        "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
      previewDescription:
        "A memorable shared experience with a clear target that works naturally as a circle goal.",
      target: 220,
      currency: "GBP",
      raised: 95,
      note: "Selected from Sarah’s own hints so the group has a clear goal.",
      fundingMode: "Flexible pot",
      deadline: "2026-06-29",
      goalType: "item",
    },
  },
];

function getInitials(name) {
  return name
    .trim()
    .split(/\\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function getContactGradient(role) {
  if (role === "Family") return "from-[#eac8b8] to-[#9d6957]";
  if (role === "Partner") return "from-[#e8b9a7] to-[#bf755f]";
  if (role === "Brother") return "from-[#4e596d] to-[#212a3c]";
  return "from-[#efcdbf] to-[#bb8168]";
}

function formatDateLabel(dateString) {
  if (!dateString) return "No date";
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
  });
}

function getCurrencyMeta(code) {
  return currencyOptions.find((currency) => currency.code === code) || currencyOptions[0];
}

function formatMoney(amount, currency = "GBP") {
  const safeAmount = Number(amount) || 0;
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: safeAmount % 1 === 0 ? 0 : 2,
    }).format(safeAmount);
  } catch {
    const fallback = getCurrencyMeta(currency);
    return `${fallback.symbol}${safeAmount}`;
  }
}

function parseAmount(value) {
  const cleaned = String(value || "").replace(/[^\\d.]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function LogoMark() {
  return (
    <div className="relative flex h-11 w-11 items-center justify-center rounded-[16px] bg-gradient-to-b from-[#ffa47f] to-[#ff875d] text-white shadow-lg">
      <span className="text-lg">🎁</span>
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

function MemberPill({ member, currency = "GBP" }) {
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
              {member.contributed ? formatMoney(member.amount, currency) : "—"}
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
    </div>
  );
}

function PotPreviewCard({ image, title, description, url, sourceLabel, compact = false }) {
  if (!title && !description && !url && !image) return null;

  return (
    <div className={`rounded-[22px] border border-[#eedfd6] bg-[#fffdfa] ${compact ? "p-3" : "p-4"}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        Linked item
      </p>

      <div className={`mt-3 flex ${compact ? "gap-3" : "gap-4"}`}>
        {image ? (
          <img
            src={image}
            alt={title || "Linked item preview"}
            className={`${compact ? "h-16 w-16 rounded-[16px]" : "h-20 w-20 rounded-[18px]"} object-cover`}
          />
        ) : (
          <div className={`${compact ? "h-16 w-16 rounded-[16px]" : "h-20 w-20 rounded-[18px]"} bg-[#f5ebe4]`} />
        )}

        <div className="min-w-0 flex-1">
          <p className={`${compact ? "text-[13px]" : "text-sm"} font-semibold text-slate-900`}>
            {title || "Untitled item"}
          </p>

          {description ? (
            <p className={`mt-1 ${compact ? "text-[12px] leading-5" : "text-[13px] leading-6"} text-slate-500`}>
              {description}
            </p>
          ) : null}

          {sourceLabel ? (
            <p className="mt-2 text-[12px] font-medium text-[#df7b59]">{sourceLabel}</p>
          ) : null}

          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block truncate text-[12px] text-slate-500 underline decoration-[#e8b4a0] underline-offset-4"
            >
              {url}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CircleCard({ circle, onEditPot }) {
  const joinedCount = circle.members.filter((member) => member.status === "joined").length;
  const invitedCount = circle.members.length;
  const moneyLabel = formatMoney(circle.pot.target, circle.pot.currency);
  const raisedLabel = formatMoney(circle.pot.raised, circle.pot.currency);
  const showItemPreview =
    circle.pot.active &&
    circle.pot.goalType === "item" &&
    (circle.pot.previewImage || circle.pot.previewDescription || circle.pot.sourceUrl);

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
                <MemberPill
                  key={`${circle.id}-${member.name}`}
                  member={member}
                  currency={circle.pot.currency}
                />
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

                <p className="mt-3 text-sm text-slate-500">
                  {raisedLabel} of {moneyLabel}
                </p>

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
                  <span className="rounded-full bg-[#edf3ff] px-3 py-1 text-[11px] font-semibold text-slate-600">
                    {circle.pot.currency}
                  </span>
                </div>

                {showItemPreview ? (
                  <div className="mt-5 w-full text-left">
                    <PotPreviewCard
                      image={circle.pot.previewImage}
                      title={circle.pot.item}
                      description={circle.pot.previewDescription}
                      url={circle.pot.sourceUrl}
                      sourceLabel={circle.pot.source}
                      compact
                    />
                  </div>
                ) : null}

                <p className="mt-4 text-[14px] leading-7 text-slate-600">{circle.pot.note}</p>

                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => onEditPot(circle)}
                    className="inline-flex h-10 items-center justify-center rounded-full bg-[#2f3b2d] px-4 text-sm font-semibold text-white"
                  >
                    Edit pot
                  </button>
                </div>
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
                  onClick={() => onEditPot(circle)}
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

function CurrencyAmountInput({
  currency,
  amount,
  onCurrencyChange,
  onAmountChange,
  label = "Target amount",
}) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="grid gap-3 sm:grid-cols-[170px_minmax(0,1fr)]">
        <select
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value)}
          className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
        >
          {currencyOptions.map((option) => (
            <option key={option.code} value={option.code}>
              {option.code} · {option.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder="220"
          className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
        />
      </div>
    </div>
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
          {/* event */}
          {/* details */}
          {/* goal type */}
          {/* choose item from public hints or link */}
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
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No one added yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

export default function CirclesClient() {
  const [contacts, setContacts] = useState(initialContacts);
  const [circles, setCircles] = useState(initialCircles);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8f3ef]">
      <header className="border-b border-[#eadfd8] bg-[#fcf8f5]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <LogoMark />
            <div>
              <p className="text-sm font-semibold text-slate-900">Hinted</p>
              <p className="text-xs text-slate-500">Circles</p>
            </div>
          </div>
          <AvatarMenu />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="space-y-4">
            {contacts.map((contact) => (
              <ContactCard key={contact.id} contact={contact} onAdd={() => {}} />
            ))}
          </aside>

          <section className="space-y-6">
            {circles.map((circle) => (
              <CircleCard key={circle.id} circle={circle} onEditPot={() => {}} />
            ))}
          </section>
        </div>
      </main>
    </div>
  );
}
