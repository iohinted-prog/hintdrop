"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
import AvatarMenu from "../components/AvatarMenu";

const HINTED_SERVICE_FEE_RATE = 0.02;

const currencyOptions = [
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar" },
  { code: "NZD", symbol: "NZ$", label: "New Zealand Dollar" },
  { code: "ZAR", symbol: "R", label: "South African Rand" },
  { code: "CAD", symbol: "C$", label: "Canadian Dollar" },
];

const relationshipOptions = [
  "Partner",
  "Spouse",
  "Family",
  "Friend",
  "Parent",
  "Child",
  "Sibling",
  "Cousin",
  "Colleague",
  "Roommate",
  "Best friend",
  "Other",
];

const calendarEvents = [
  { id: 1, title: "Sarah's Birthday", date: "2026-06-29", type: "Birthday" },
  { id: 2, title: "Mum & Dad Anniversary", date: "2026-07-10", type: "Anniversary" },
  { id: 3, title: "James Promotion Dinner", date: "2026-07-16", type: "Milestone" },
];

const publicHintsByContact = {};

const exampleCircle = {
  id: "example-circle",
  name: "Example pot",
  subtitle: "Birthday · Example",
  description:
    "A simple example showing how one shared pot could look once a real contact and item have been added.",
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
      name: "Example friend",
      initials: "E",
      contributed: false,
      amount: 0,
      colors: "from-[#efcdbf] to-[#bb8168]",
      status: "invited",
    },
  ],
  pot: {
    active: true,
    item: "Example item",
    fullItemTitle: "Example item",
    source: "Example shared goal",
    sourceUrl: "https://example.com/example-item",
    previewImage:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80",
    previewDescription:
      "This is just a single example pot so the layout still demonstrates the feature without showing multiple fake pots.",
    target: 122.4,
    currency: "GBP",
    raised: 40,
    note: "Example only.",
    fundingMode: "Flexible pot",
    deadline: "2026-07-01",
    goalType: "item",
  },
};

function roundCurrency(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function getInitials(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function getRelationshipGradient(role) {
  const normalized = String(role || "").toLowerCase();

  if (normalized.includes("partner") || normalized.includes("spouse")) {
    return "from-[#e8b9a7] to-[#bf755f]";
  }

  if (
    normalized.includes("family") ||
    normalized.includes("parent") ||
    normalized.includes("child") ||
    normalized.includes("sibling") ||
    normalized.includes("cousin")
  ) {
    return "from-[#eac8b8] to-[#9d6957]";
  }

  if (normalized.includes("colleague")) {
    return "from-[#b7c8db] to-[#6b88a7]";
  }

  return "from-[#efcdbf] to-[#bb8168]";
}

function formatDateLabel(dateString) {
  if (!dateString) return "No date";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString("en-GB", {
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
  const cleaned = String(value || "").replace(/[^\d.]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getPrimaryContactField(person, field) {
  const items = person?.[field];
  if (!Array.isArray(items) || items.length === 0) return "";
  return items[0]?.value || items[0]?.displayName || "";
}

function getGoogleName(metadata = {}) {
  return (
    metadata.full_name ||
    metadata.name ||
    [metadata.given_name, metadata.family_name].filter(Boolean).join(" ") ||
    ""
  ).trim();
}

function normalizeSupabaseError(error, fallback) {
  if (!error) return fallback;
  const parts = [error.message, error.details, error.hint].filter(Boolean);
  return parts.length ? parts.join(" — ") : fallback;
}

function safeIsoDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function safeIsoTimestampEndOfDay(value) {
  const dateOnly = safeIsoDate(value);
  if (!dateOnly) return null;
  return `${dateOnly}T23:59:59.000Z`;
}

function fundingModeToDb(value) {
  if (value === "all_or_nothing" || value === "All-or-nothing") return "all_or_nothing";
  if (value === "organiser_covers" || value === "Organizer covers gap") return "organiser_covers";
  return "flexible";
}

function fundingModeToLabel(value) {
  if (value === "all_or_nothing") return "All-or-nothing";
  if (value === "organiser_covers") return "Organizer covers gap";
  return "Flexible pot";
}

function sourceTypeFromForm(goalType, itemSource) {
  if (goalType === "amount") return "external_link";
  if (itemSource === "url") return "external_link";
  return "recipient_public_hint";
}

function relationshipLabelFromArray(relationshipTypes) {
  if (!Array.isArray(relationshipTypes) || relationshipTypes.length === 0) return "Friend";
  return relationshipTypes[0] || "Friend";
}

function buildContactRecordFromRow(row) {
  const relationship = relationshipLabelFromArray(row?.relationship_types);
  const safeName = row?.name || row?.email || "Unnamed contact";

  return {
    id: row.id,
    profileConnectionId: row.id,
    name: safeName,
    role: relationship,
    note: "Saved to contacts",
    initials: getInitials(safeName),
    colors: getRelationshipGradient(relationship),
    email: row?.email || "",
    phone: "",
    birthday: "",
    raw: row,
  };
}

function calculateHintedFee(itemAmount) {
  return roundCurrency(itemAmount * HINTED_SERVICE_FEE_RATE);
}

function calculateCircleTotals(itemAmount) {
  const safeItemAmount = roundCurrency(itemAmount);
  const feeAmount = calculateHintedFee(safeItemAmount);
  const totalAmount = roundCurrency(safeItemAmount + feeAmount);

  return {
    itemAmount: safeItemAmount,
    feeAmount,
    totalAmount,
  };
}

function extractHintAmount(hint) {
  const amount = Number(hint?.amount);
  return Number.isFinite(amount) && amount > 0 ? roundCurrency(amount) : 0;
}

function extractPreviewAmount(preview) {
  const directCandidates = [
    preview?.price,
    preview?.amount,
    preview?.targetAmount,
    preview?.priceAmount,
  ];

  for (const candidate of directCandidates) {
    const amount = Number(String(candidate ?? "").replace(/[^\d.]/g, ""));
    if (Number.isFinite(amount) && amount > 0) {
      return roundCurrency(amount);
    }
  }

  const textCandidates = [
    preview?.priceText,
    preview?.subtitle,
    preview?.description,
    preview?.title,
  ];

  for (const text of textCandidates) {
    const match = String(text || "").match(/(?:£|\$|€|A\$|NZ\$|C\$|R)?\s*(\d+(?:\.\d{1,2})?)/);
    if (match?.[1]) {
      const amount = Number(match[1]);
      if (Number.isFinite(amount) && amount > 0) {
        return roundCurrency(amount);
      }
    }
  }

  return 0;
}

function toDisplayPotTitle(value) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "Shared gift";

  const cleaned = text
    .replace(/[|–—•,:;()[\]{}]+/g, " ")
    .replace(/\b(with|for|and|the|from|your|this|that|into|gift|voucher|experience|set|kit|duo|edition)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned.split(" ").filter(Boolean);
  if (words.length === 0) return "Shared gift";

  return words.slice(0, 2).join(" ");
}

function buildStoredItemTitle(value) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();

  return text || "Shared gift";
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim().toLowerCase());
}

function buildCircleViewModel(circleRow, inviteRows = [], currentUserName = "You") {
  const members = [
    {
      name: currentUserName || "You",
      initials: getInitials(currentUserName || "You"),
      contributed: false,
      amount: 0,
      colors: "from-[#4e596d] to-[#212a3c]",
      status: "joined",
    },
    ...inviteRows.map((invite) => ({
      name: invite.invite_name || invite.invite_email || "Invited person",
      initials: getInitials(invite.invite_name || invite.invite_email || "Invited person"),
      contributed: false,
      amount: 0,
      colors: "from-[#efcdbf] to-[#bb8168]",
      status: invite.status === "paid" ? "joined" : "invited",
    })),
  ];

  const totalTarget = Number(circleRow.total_target_amount || 0);
  const fullItemTitle = circleRow.item_title || "Shared gift";

  return {
    id: circleRow.id,
    name: circleRow.title || "Untitled circle",
    subtitle: `${circleRow.occasion_type || "Event"} · ${formatDateLabel(circleRow.event_date)}`,
    description: "",
    members,
    pot: {
      active: totalTarget > 0,
      item: toDisplayPotTitle(fullItemTitle),
      fullItemTitle,
      source:
        circleRow.source_type === "external_link"
          ? "From pasted link"
          : circleRow.source_type === "recipient_public_hint"
            ? "From public hints"
            : "Shared goal",
      sourceUrl: circleRow.item_url || "",
      previewImage: circleRow.item_image_url || "",
      previewDescription: circleRow.item_description || "",
      target: totalTarget,
      currency: circleRow.currency || "GBP",
      raised: 0,
      note:
        circleRow.funding_mode === "all_or_nothing"
          ? "This circle will only proceed if the group reaches the target by the deadline."
          : circleRow.funding_mode === "organiser_covers"
            ? "If the full target is not reached, the organiser can choose to cover the gap."
            : "This circle can stay flexible if fewer people join than expected.",
      fundingMode: fundingModeToLabel(circleRow.funding_mode),
      deadline: circleRow.deadline_at || circleRow.event_date || "",
      goalType:
        totalTarget > 0 && fullItemTitle !== "Shared contribution pot"
          ? "item"
          : "amount",
    },
    raw: circleRow,
    invites: inviteRows,
  };
}

function LogoMark() {
  return (
    <div className="relative flex h-11 w-11 items-center justify-center rounded-[16px] bg-gradient-to-b from-[#ffa47f] to-[#ff875d] text-white shadow-lg">
      <span className="text-lg">🎁</span>
    </div>
  );
}

function ModalShell({
  open,
  onClose,
  title,
  eyebrow,
  children,
  maxWidth = "max-w-[1120px]",
  hideHeaderBorder = false,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(42,26,20,0.38)] px-4 py-6 backdrop-blur-sm">
      <div
        className={`max-h-[92vh] w-full overflow-hidden rounded-[34px] border border-[#eddacf] bg-[#fffaf7] shadow-[0_24px_80px_rgba(88,46,31,0.22)] ${maxWidth}`}
      >
        <div
          className={`flex items-center justify-between px-6 py-5 ${
            hideHeaderBorder ? "" : "border-b border-[#efe0d7]"
          }`}
        >
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

function ContactCard({ contact, onDeleteClick }) {
  return (
    <article
      className="rounded-[22px] border border-[#f0dfd6] bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      aria-label={`Manage ${contact.name}`}
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
            {contact.role}
            {contact.note ? ` · ${contact.note}` : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onDeleteClick(contact)}
          className="inline-flex h-9 items-center justify-center rounded-full border border-[#efc0ba] bg-[#fff4f2] px-3 text-[12px] font-semibold text-[#b14f43] hover:bg-[#ffe9e5]"
        >
          Delete
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

function PotPreviewCard({ image, title, url, compact = false }) {
  if (!title && !url && !image) return null;

  return (
    <div
      className={`overflow-hidden rounded-[22px] border border-[#eedfd6] bg-[#fffdfa] ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        Linked item
      </p>

      <div className="mt-3 min-w-0">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[18px] bg-[#f5ebe4]">
          {image ? (
            <img
              src={image}
              alt={title || "Linked item preview"}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[#f5ebe4]" />
          )}
        </div>

        <div className="mt-3 min-w-0">
          <p className="truncate text-[13px] font-semibold text-slate-900">
            {toDisplayPotTitle(title)}
          </p>

          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block max-w-full truncate text-[12px] text-slate-500 underline decoration-[#e8b4a0] underline-offset-4"
            >
              View item
            </a>
          ) : null}
        </div>
      </div>
    </div>
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

function CircleCard({ circle, onDeleteCircleClick, deletingCircleId }) {
  const safeMembers = Array.isArray(circle?.members) ? circle.members : [];
  const joinedCount = safeMembers.filter((member) => member.status === "joined").length;
  const invitedCount = safeMembers.length;
  const moneyLabel = formatMoney(circle?.pot?.target, circle?.pot?.currency);
  const raisedLabel = formatMoney(circle?.pot?.raised, circle?.pot?.currency);
  const showItemPreview =
    circle?.pot?.active &&
    circle?.pot?.goalType === "item" &&
    (circle?.pot?.previewImage || circle?.pot?.sourceUrl);

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
                {circle?.name || "Untitled circle"}
              </h2>
              <p className="mt-2 text-sm text-slate-500">{circle?.subtitle || "No subtitle"}</p>
            </div>

            <div className="rounded-full bg-[#fff4ee] px-3 py-1 text-[11px] font-semibold text-[#df7b59]">
              {joinedCount} of {invitedCount} joined
            </div>
          </div>

          {circle?.description ? (
            <p className="mt-4 max-w-[60ch] text-[14px] leading-7 text-slate-600">
              {circle.description}
            </p>
          ) : null}

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
              {safeMembers.map((member) => (
                <MemberPill
                  key={`${circle?.id}-${member.name}`}
                  member={member}
                  currency={circle?.pot?.currency}
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
              {circle?.pot?.active ? circle.pot.item : "No pot created yet"}
            </h3>
            <p className="mt-2 max-w-[28ch] text-[13px] leading-6 text-slate-500">
              {circle?.pot?.active ? circle?.pot?.source : circle?.pot?.note}
            </p>

            {circle?.pot?.active ? (
              <>
                <div className="mt-5">
                  <ContributionRing
                    raised={circle?.pot?.raised || 0}
                    target={circle?.pot?.target || 0}
                    ringId={`circle-gradient-${circle?.id}`}
                  />
                </div>

                <p className="mt-3 text-sm text-slate-500">
                  {raisedLabel} of {moneyLabel}
                </p>

                <div className="mt-4 flex -space-x-3">
                  {safeMembers.map((member) => (
                    <div
                      key={`${circle?.id}-${member.name}-avatar`}
                      className={`flex h-11 w-11 items-center justify-center rounded-full border-4 border-white bg-gradient-to-b text-[11px] font-bold text-white shadow-sm ${member.colors}`}
                      title={member.name}
                    >
                      {member.initials}
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <span className="rounded-full bg-[#fff4ee] px-3 py-1 text-[11px] font-semibold text-[#df7b59]">
                    {circle?.pot?.fundingMode}
                  </span>
                  <span className="rounded-full bg-[#f3f6fb] px-3 py-1 text-[11px] font-semibold text-slate-600">
                    Deadline {formatDateLabel(circle?.pot?.deadline)}
                  </span>
                  <span className="rounded-full bg-[#edf3ff] px-3 py-1 text-[11px] font-semibold text-slate-600">
                    {circle?.pot?.currency || "GBP"}
                  </span>
                </div>

                {showItemPreview ? (
                  <div className="mt-5 w-full min-w-0 text-left">
                    <PotPreviewCard
                      image={circle?.pot?.previewImage}
                      title={circle?.pot?.fullItemTitle || circle?.pot?.item}
                      url={circle?.pot?.sourceUrl}
                      compact
                    />
                  </div>
                ) : null}

                <p className="mt-4 text-[14px] leading-7 text-slate-600">{circle?.pot?.note}</p>

                {circle?.id !== "example-circle" ? (
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => onDeleteCircleClick(circle)}
                      disabled={deletingCircleId === circle.id}
                      className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold ${
                        deletingCircleId === circle.id
                          ? "cursor-not-allowed bg-[#f3d6d1] text-[#b14f43]"
                          : "border border-[#efc0ba] bg-[#fff4f2] text-[#b14f43] hover:bg-[#ffe9e5]"
                      }`}
                    >
                      {deletingCircleId === circle.id ? "Deleting..." : "Delete circle"}
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <div className="mt-6 rounded-[24px] border border-dashed border-[#e5d8cf] bg-white p-5 text-left">
                  <p className="text-sm font-semibold text-slate-900">Choose from hints or links</p>
                  <p className="mt-2 text-[14px] leading-7 text-slate-600">
                    Pick a public hint or paste a product link so the circle has one shared goal.
                  </p>
                </div>

                {circle?.id !== "example-circle" ? (
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => onDeleteCircleClick(circle)}
                      disabled={deletingCircleId === circle.id}
                      className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold ${
                        deletingCircleId === circle.id
                          ? "cursor-not-allowed bg-[#f3d6d1] text-[#b14f43]"
                          : "border border-[#efc0ba] bg-[#fff4f2] text-[#b14f43] hover:bg-[#ffe9e5]"
                      }`}
                    >
                      {deletingCircleId === circle.id ? "Deleting..." : "Delete circle"}
                    </button>
                  </div>
                ) : null}
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
  errorMessage,
  isSubmitting,
}) {
  if (!open) return null;

  const safeCalendarEvents = Array.isArray(calendarEvents) ? calendarEvents : [];
  const selectedHintContact = contacts.find(
    (contact) => String(contact.id) === String(selectedHintContactId)
  );
  const visibleHints = selectedHintContactId
    ? publicHintsByContact[selectedHintContactId] || []
    : [];
  const amountMode = form.goalType === "amount";
  const selectedHint =
    publicHintsByContact?.[selectedHintContactId]?.find((hint) => hint.id === form.selectedHintId) || null;

  const liveBaseAmount =
    form.goalType === "item"
      ? form.itemSource === "hint"
        ? extractHintAmount(selectedHint)
        : extractPreviewAmount(linkPreview)
      : parseAmount(form.goalValue);

  const liveTotals = calculateCircleTotals(liveBaseAmount);

  return (
    <ModalShell open={open} onClose={onClose} eyebrow="New circle" title="Create a circle around an event">
      <div className="grid gap-0 lg:grid-cols-[1.06fr_0.94fr]">
        <div className="max-h-[calc(92vh-90px)] space-y-6 overflow-y-auto p-6">
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
                {safeCalendarEvents.map((event) => (
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
            <p className="text-sm font-semibold text-slate-900">2. Circle details</p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">Circle title</span>
                <div className="flex h-12 w-full items-center rounded-[18px] border border-[#efe1d9] bg-[#faf7f5] px-4 text-sm font-medium text-slate-700">
                  {form.eventTitle || "Select or create an event first"}
                </div>
              </div>

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
                  <option value="organiser_covers">Organizer covers gap</option>
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-[24px] border border-[#eedfd6] bg-white p-5">
            <p className="text-sm font-semibold text-slate-900">3. Goal type</p>

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

              {form.goalType === "amount" ? (
                <CurrencyAmountInput
                  currency={form.currency}
                  amount={form.goalValue}
                  onCurrencyChange={(value) => setForm((prev) => ({ ...prev, currency: value }))}
                  onAmountChange={(value) => setForm((prev) => ({ ...prev, goalValue: value }))}
                />
              ) : null}
            </div>
          </div>

          {!amountMode ? (
            <div className="rounded-[24px] border border-[#eedfd6] bg-white p-5 transition">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">4. Choose the item</p>
                  <p className="mt-1 text-[13px] leading-6 text-slate-500">
                    Pick from a contact’s public hints or paste a link from anywhere on the internet.
                  </p>
                </div>
              </div>

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

                      {!contacts.length ? (
                        <div className="rounded-[18px] bg-white p-4 text-sm text-slate-500">
                          Add a contact first to choose from public hints.
                        </div>
                      ) : null}
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
                                className={`flex cursor-pointer items-start justify-between rounded-[20px] border p-4 ${
                                  form.selectedHintId === hint.id
                                    ? "border-[#f0a384] bg-[#fff4ee]"
                                    : "border-[#efe1d9] bg-white"
                                }`}
                              >
                                <div className="min-w-0 pr-4">
                                  <p className="text-sm font-semibold text-slate-900">{hint.title}</p>
                                  <p className="mt-1 text-[13px] text-slate-500">{hint.subtitle}</p>
                                  <p className="mt-2 text-[12px] leading-5 text-slate-500">
                                    {hint.description}
                                  </p>
                                </div>

                                <input
                                  type="radio"
                                  name="selectedHint"
                                  className="mt-1 h-4 w-4 accent-[#f36f64]"
                                  checked={form.selectedHintId === hint.id}
                                  onChange={() =>
                                    setForm((prev) => ({
                                      ...prev,
                                      selectedHintId: hint.id,
                                      currency: hint.currency || prev.currency,
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
                    <PotPreviewCard
                      image={linkPreview.image}
                      title={linkPreview.title}
                      url={linkPreview.url}
                    />
                  ) : null}
                </div>
              )}
            </div>
          ) : null}

          <div className="rounded-[24px] border border-[#eedfd6] bg-white p-5">
            <p className="text-sm font-semibold text-slate-900">Total target</p>
            <p className="mt-1 text-[13px] leading-6 text-slate-500">
              This is the amount shown on the circle.
            </p>

            <div className="mt-4 rounded-[18px] bg-[#fff4ee] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#df7b59]">
                Total
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {formatMoney(liveTotals.totalAmount, form.currency)}
              </p>
              <p className="mt-2 text-[12px] leading-5 text-slate-500">
                *includes our 2% service fee so you can avoid the awkward reminders
              </p>
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-[20px] border border-[#efc0ba] bg-[#fff4f2] px-4 py-3 text-sm text-[#b14f43]">
              {errorMessage}
            </div>
          ) : null}
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
                        <p className="text-[12px] text-slate-500">
                          {contact.role}
                          {contact.email ? ` · ${contact.email}` : ""}
                        </p>
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

              {!contacts.length ? (
                <div className="rounded-[18px] border border-[#f0dfd6] bg-[#fffdfa] p-4 text-sm text-slate-500">
                  Add a contact first, then invite them into a circle here.
                </div>
              ) : null}
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
                disabled={isSubmitting}
                className={`inline-flex h-12 flex-1 items-center justify-center rounded-full px-6 text-sm font-semibold text-white shadow-lg ${
                  isSubmitting
                    ? "cursor-not-allowed bg-[#e9a48d]"
                    : "bg-gradient-to-b from-[#ff946d] to-[#f36f64]"
                }`}
              >
                {isSubmitting ? "Creating..." : "Create circle"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function AddContactModal({ open, onClose, onSave, supabase }) {
  const [contactSearch, setContactSearch] = useState("");
  const [contactResults, setContactResults] = useState([]);
  const [searchingContacts, setSearchingContacts] = useState(false);
  const [contactsMessage, setContactsMessage] = useState("");
  const [selectedRelationships, setSelectedRelationships] = useState(["Friend"]);
  const [form, setForm] = useState({
    name: "",
    email: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!open) {
      setContactSearch("");
      setContactResults([]);
      setSearchingContacts(false);
      setContactsMessage("");
      setSelectedRelationships(["Friend"]);
      setForm({ name: "", email: "" });
      setSaving(false);
      setSaveError("");
    }
  }, [open]);

  async function searchGoogleContacts(query) {
    setContactSearch(query);
    setContactsMessage("");
    setSaveError("");

    if (!query.trim()) {
      setContactResults([]);
      return;
    }

    setSearchingContacts(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const providerToken = session?.provider_token;

      if (!providerToken) {
        setContactResults([]);
        setContactsMessage(
          "We couldn’t access your linked Google contacts right now because the Google provider token is missing."
        );
        return;
      }

      const warmupResponse = await fetch(
        "https://people.googleapis.com/v1/people:searchContacts?query=&pageSize=1&readMask=names,emailAddresses",
        {
          headers: {
            Authorization: `Bearer ${providerToken}`,
          },
        }
      );

      if (!warmupResponse.ok) {
        setContactResults([]);
        setContactsMessage("We couldn’t access your linked Google contacts right now.");
        return;
      }

      const url = new URL("https://people.googleapis.com/v1/people:searchContacts");
      url.searchParams.set("query", query);
      url.searchParams.set("pageSize", "8");
      url.searchParams.set("readMask", "names,emailAddresses");

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${providerToken}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Google contact search failed:", result);
        setContactResults([]);
        setContactsMessage(result?.error?.message || "We couldn’t search Google contacts right now.");
        return;
      }

      const people = Array.isArray(result.results) ? result.results : [];
      const mapped = people
        .map((item) => item.person)
        .filter(Boolean)
        .map((person, index) => ({
          id: person.resourceName || String(index),
          name: getPrimaryContactField(person, "names"),
          email: getPrimaryContactField(person, "emailAddresses"),
        }))
        .filter((person) => person.name || person.email);

      setContactResults(mapped);

      if (mapped.length === 0) {
        setContactsMessage("No matching Google contacts found. You can still type their email manually.");
      }
    } catch (error) {
      console.error("Contact search error:", error);
      setContactResults([]);
      setContactsMessage(error?.message || "We couldn’t search Google contacts right now.");
    } finally {
      setSearchingContacts(false);
    }
  }

  function selectContact(contact) {
    setForm({
      name: contact.name || "",
      email: contact.email || "",
    });
    setContactSearch(contact.name || contact.email || "");
    setContactResults([]);
    setContactsMessage("");
    setSaveError("");
  }

  function toggleRelationship(relationship) {
    setSelectedRelationships((prev) => {
      if (prev.includes(relationship)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== relationship);
      }
      return [...prev, relationship];
    });
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setSaveError("Contact name is required.");
      return;
    }

    const cleanedEmail = form.email.trim().toLowerCase();

    if (!cleanedEmail) {
      setSaveError("Email is required.");
      return;
    }

    if (!isValidEmail(cleanedEmail)) {
      setSaveError("Enter a valid email address.");
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      await onSave({
        name: form.name.trim(),
        email: cleanedEmail,
        relationshipTypes: selectedRelationships.length ? selectedRelationships : ["Friend"],
      });
      setSaving(false);
      onClose();
    } catch (error) {
      console.error("Save contact failed:", error);
      setSaveError(error?.message || "Failed to save contact.");
      setSaving(false);
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      eyebrow="Contact"
      title="Add a contact"
      maxWidth="max-w-[760px]"
      hideHeaderBorder
    >
      <div className="border-t border-[#efe0d7] px-6 py-6">
        <div className="rounded-[28px] border border-dashed border-[#e5d8cf] bg-[#fffdfa] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Bring someone in quickly
          </p>
          <h3 className="mt-3 text-[18px] font-semibold tracking-[-0.03em] text-slate-900">
            Add from Gmail or type their email
          </h3>
          <p className="mt-3 max-w-[62ch] text-[15px] leading-8 text-slate-500">
            Use the onboarding-style flow here to browse contacts from your linked Google account, or add someone manually now so they are ready for hints and circles.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={contactSearch}
              onChange={(e) => searchGoogleContacts(e.target.value)}
              placeholder="Search Gmail contacts"
              className="h-[46px] w-full rounded-full border border-[#ead8ce] bg-white px-5 text-sm text-slate-700 outline-none transition focus:border-[#f19b7e]"
            />
          </div>

          {searchingContacts ? (
            <p className="mt-3 text-xs text-slate-500">Searching contacts...</p>
          ) : null}

          {contactResults.length > 0 ? (
            <div className="mt-3 overflow-hidden rounded-[20px] border border-[#efe1d9] bg-white">
              {contactResults.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => selectContact(contact)}
                  className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{contact.name || "No name"}</p>
                    <p className="text-xs text-slate-500">{contact.email || "No email"}</p>
                  </div>
                  <span className="text-xs font-semibold text-[#ea7451]">Use</span>
                </button>
              ))}
            </div>
          ) : null}

          {contactsMessage ? (
            <p className="mt-3 text-xs text-slate-500">{contactsMessage}</p>
          ) : null}
        </div>

        <div className="mt-6 space-y-5">
          <label className="block">
            <span className="block text-sm font-medium text-slate-900">Name</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Maya"
              className="mt-2 h-[48px] w-full rounded-[18px] border border-[#d9dce3] bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-[#f19b7e]"
            />
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-slate-900">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="maya@example.com"
              required
              className="mt-2 h-[48px] w-full rounded-[18px] border border-[#d9dce3] bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-[#f19b7e]"
            />
          </label>

          <div>
            <span className="block text-sm font-medium text-slate-900">Relationship</span>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {relationshipOptions.map((relationship) => {
                const selected = selectedRelationships.includes(relationship);

                return (
                  <button
                    key={relationship}
                    type="button"
                    onClick={() => toggleRelationship(relationship)}
                    className={`rounded-full border px-4 py-2.5 text-sm font-medium transition ${
                      selected
                        ? "border-[#2f3b2d] bg-[#2f3b2d] text-white"
                        : "border-[#d9dce3] bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {relationship}
                  </button>
                );
              })}
            </div>
          </div>

          {saveError ? (
            <div className="rounded-[18px] border border-[#efc0ba] bg-[#fff4f2] px-4 py-3 text-sm text-[#b14f43]">
              {saveError}
            </div>
          ) : null}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-[44px] items-center justify-center rounded-full border border-[#ead8ce] bg-white px-6 text-sm font-medium text-slate-700 hover:bg-[#fff5f0]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !form.name.trim() || !form.email.trim()}
            className={`inline-flex h-[44px] items-center justify-center rounded-full px-6 text-sm font-semibold text-white shadow-lg ${
              saving || !form.name.trim() || !form.email.trim()
                ? "cursor-not-allowed bg-[#e9a48d]"
                : "bg-gradient-to-b from-[#ff946d] to-[#f36f64]"
            }`}
          >
            {saving ? "Saving..." : "Save contact"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function DeleteContactModal({
  open,
  onClose,
  onConfirm,
  contact,
  isDeleting,
  errorMessage,
}) {
  const [typedName, setTypedName] = useState("");

  useEffect(() => {
    if (!open) {
      setTypedName("");
    }
  }, [open]);

  if (!open || !contact) return null;

  const expectedName = String(contact.name || "").trim();
  const matches = typedName.trim() === expectedName;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      eyebrow="Delete contact"
      title={`Delete ${contact.name}`}
      maxWidth="max-w-[620px]"
    >
      <div className="space-y-5 p-6">
        <div className="rounded-[22px] border border-[#efc0ba] bg-[#fff4f2] p-4">
          <p className="text-sm font-semibold text-[#b14f43]">This will permanently remove the contact.</p>
          <p className="mt-2 text-[13px] leading-6 text-slate-600">
            Type <span className="font-semibold text-slate-900">{expectedName}</span> to confirm.
          </p>
        </div>

        <label className="block">
          <span className="block text-sm font-medium text-slate-900">Type the contact name</span>
          <input
            type="text"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder={expectedName}
            className="mt-2 h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
          />
        </label>

        {errorMessage ? (
          <div className="rounded-[18px] border border-[#efc0ba] bg-[#fff4f2] px-4 py-3 text-sm text-[#b14f43]">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-6 text-sm font-semibold text-slate-700 hover:bg-[#fff5f0]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDeleting || !matches}
            onClick={() => onConfirm(contact)}
            className={`inline-flex h-12 flex-1 items-center justify-center rounded-full px-6 text-sm font-semibold text-white ${
              isDeleting || !matches
                ? "cursor-not-allowed bg-[#e9a48d]"
                : "bg-[#b14f43]"
            }`}
          >
            {isDeleting ? "Deleting..." : "Delete contact"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function DeleteCircleModal({
  open,
  onClose,
  onConfirm,
  circle,
  isDeleting,
  errorMessage,
}) {
  if (!open || !circle) return null;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      eyebrow="Delete circle"
      title={`Delete ${circle.name}`}
      maxWidth="max-w-[720px]"
    >
      <div className="space-y-5 p-6">
        <div className="rounded-[22px] border border-[#efc0ba] bg-[#fff4f2] p-4">
          <p className="text-sm font-semibold text-[#b14f43]">This will permanently delete the entire circle.</p>
          <p className="mt-2 text-[13px] leading-6 text-slate-600">
            This removes the circle itself and its invites.
          </p>
        </div>

        <div className="rounded-[20px] bg-[#fffaf7] p-4">
          <p className="text-sm font-semibold text-slate-900">Circle summary</p>
          <p className="mt-2 text-[13px] text-slate-600">
            {circle.name} · {circle.subtitle}
          </p>
          <p className="mt-2 text-[13px] text-slate-500">
            Members and invitees shown on this circle will lose access once it is deleted.
          </p>
        </div>

        {errorMessage ? (
          <div className="rounded-[18px] border border-[#efc0ba] bg-[#fff4f2] px-4 py-3 text-sm text-[#b14f43]">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-6 text-sm font-semibold text-slate-700 hover:bg-[#fff5f0]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => onConfirm(circle)}
            className={`inline-flex h-12 flex-1 items-center justify-center rounded-full px-6 text-sm font-semibold text-white ${
              isDeleting
                ? "cursor-not-allowed bg-[#e9a48d]"
                : "bg-[#b14f43]"
            }`}
          >
            {isDeleting ? "Deleting..." : "Delete circle"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

export default function CirclesClient() {
  const supabase = createClient();

  const safeCalendarEvents = Array.isArray(calendarEvents) ? calendarEvents : [];
  const safeDefaultEvent = safeCalendarEvents[0] || {
    id: "",
    title: "",
    date: "",
    type: "Event",
  };

  const [sessionUser, setSessionUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [contacts, setContacts] = useState([]);
  const [realCircles, setRealCircles] = useState([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isLoadingCircles, setIsLoadingCircles] = useState(true);

  const [pageError, setPageError] = useState("");
  const [contactError, setContactError] = useState("");
  const [circleError, setCircleError] = useState("");
  const [circleSuccess, setCircleSuccess] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);

  const [isDeleteContactOpen, setIsDeleteContactOpen] = useState(false);
  const [isDeleteCircleOpen, setIsDeleteCircleOpen] = useState(false);
  const [selectedContactToDelete, setSelectedContactToDelete] = useState(null);
  const [selectedCircleToDelete, setSelectedCircleToDelete] = useState(null);
  const [isDeletingContact, setIsDeletingContact] = useState(false);
  const [isDeletingCircle, setIsDeletingCircle] = useState(false);
  const [deleteContactError, setDeleteContactError] = useState("");
  const [deleteCircleError, setDeleteCircleError] = useState("");

  const [eventMode, setEventMode] = useState("calendar");
  const [selectedEventId, setSelectedEventId] = useState(String(safeDefaultEvent.id || ""));
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [selectedHintContactId, setSelectedHintContactId] = useState(null);
  const [linkPreview, setLinkPreview] = useState(null);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const [isCreatingCircle, setIsCreatingCircle] = useState(false);

  const [form, setForm] = useState({
    eventTitle: safeDefaultEvent.title || "",
    eventDate: safeDefaultEvent.date || "",
    deadline: safeDefaultEvent.date || "",
    goalType: "item",
    goalValue: "",
    currency: "GBP",
    fundingMode: "flexible",
    itemSource: "url",
    selectedHintId: "",
    itemUrl: "",
  });

  const displayedCircles = useMemo(() => {
    if (realCircles.length > 0) return realCircles;
    return [exampleCircle];
  }, [realCircles]);

  const resetCircleForm = useCallback(() => {
    const fallbackEvent = safeCalendarEvents[0] || {
      id: "",
      title: "",
      date: "",
      type: "Event",
    };

    setEventMode("calendar");
    setSelectedEventId(String(fallbackEvent.id || ""));
    setSelectedPeople([]);
    setSelectedHintContactId((prev) => prev ?? contacts?.[0]?.id ?? null);
    setLinkPreview(null);
    setCircleError("");
    setCircleSuccess("");
    setForm({
      eventTitle: fallbackEvent.title || "",
      eventDate: fallbackEvent.date || "",
      deadline: fallbackEvent.date || "",
      goalType: "item",
      goalValue: "",
      currency: "GBP",
      fundingMode: "flexible",
      itemSource: "url",
      selectedHintId: "",
      itemUrl: "",
    });
  }, [contacts, safeCalendarEvents]);

  const loadProfile = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(normalizeSupabaseError(error, "Failed to load profile."));
    }

    setProfile(data || null);
    return data || null;
  }, [supabase]);

  const loadContacts = useCallback(async (userId) => {
    setIsLoadingContacts(true);
    setContactError("");

    const { data, error } = await supabase
      .from("profile_connections")
      .select("*")
      .eq("profile_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      setContacts([]);
      setIsLoadingContacts(false);
      throw new Error(
        normalizeSupabaseError(
          error,
          "Failed to load contacts from profile_connections."
        )
      );
    }

    const mapped = Array.isArray(data) ? data.map(buildContactRecordFromRow) : [];
    setContacts(mapped);
    setIsLoadingContacts(false);
    return mapped;
  }, [supabase]);

  const loadCircles = useCallback(async (userId, currentProfile) => {
    setIsLoadingCircles(true);
    setCircleError("");

    const { data: circlesData, error: circlesError } = await supabase
      .from("circles")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (circlesError) {
      setRealCircles([]);
      setIsLoadingCircles(false);
      throw new Error(normalizeSupabaseError(circlesError, "Failed to load circles."));
    }

    const circleIds = (circlesData || []).map((circle) => circle.id).filter(Boolean);

    let inviteMap = {};
    if (circleIds.length > 0) {
      const { data: inviteData, error: inviteError } = await supabase
        .from("circle_invites")
        .select("*")
        .in("circle_id", circleIds);

      if (inviteError) {
        setIsLoadingCircles(false);
        throw new Error(normalizeSupabaseError(inviteError, "Failed to load circle invites."));
      }

      inviteMap = (inviteData || []).reduce((acc, invite) => {
        if (!acc[invite.circle_id]) acc[invite.circle_id] = [];
        acc[invite.circle_id].push(invite);
        return acc;
      }, {});
    }

    const currentUserName =
      getGoogleName(currentProfile || {}) ||
      currentProfile?.full_name ||
      currentProfile?.name ||
      "You";

    const mapped = (circlesData || []).map((circle) =>
      buildCircleViewModel(circle, inviteMap[circle.id] || [], currentUserName)
    );

    setRealCircles(mapped);
    setIsLoadingCircles(false);
    return mapped;
  }, [supabase]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        setPageError("");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw new Error(normalizeSupabaseError(userError, "Failed to get logged-in user."));
        }

        if (!user) {
          throw new Error("You must be signed in to view circles.");
        }

        if (!active) return;
        setSessionUser(user);

        const currentProfile = await loadProfile(user.id);
        if (!active) return;

        await loadContacts(user.id);
        if (!active) return;

        await loadCircles(user.id, currentProfile);
      } catch (error) {
        console.error("Circles bootstrap failed:", error);
        if (active) {
          setPageError(error?.message || "Failed to load the Circles page.");
          setIsLoadingContacts(false);
          setIsLoadingCircles(false);
        }
      }
    }

    bootstrap();

    return () => {
      active = false;
    };
  }, [supabase, loadProfile, loadContacts, loadCircles]);

  useEffect(() => {
    if (!selectedHintContactId && contacts.length > 0) {
      setSelectedHintContactId(contacts[0].id);
    }
  }, [contacts, selectedHintContactId]);

  const handleFetchPreview = async () => {
    if (!form.itemUrl.trim()) {
      setCircleError("Paste a product or experience link first.");
      return;
    }

    try {
      setIsFetchingPreview(true);
      setCircleError("");
      setLinkPreview(null);

      const response = await fetch("/api/link-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: form.itemUrl.trim() }),
      });

      const rawText = await response.text();
      let data = null;

      if (rawText) {
        try {
          data = JSON.parse(rawText);
        } catch {
          throw new Error("Link preview API returned an invalid response.");
        }
      }

      if (!response.ok) {
        throw new Error(data?.error || `Failed to fetch preview (${response.status}).`);
      }

      if (!data) {
        throw new Error("Link preview API returned an empty response.");
      }

      setLinkPreview(data);
    } catch (error) {
      console.error("Link preview fetch failed:", error);

      setLinkPreview({
        title: "Preview unavailable",
        description:
          "We could not pull a preview from that link yet, but you can still use the URL.",
        image: "",
        siteName: form.itemUrl,
        url: form.itemUrl,
      });

      setCircleError(error?.message || "Failed to fetch link preview.");
    } finally {
      setIsFetchingPreview(false);
    }
  };

  async function handleSaveContact(contactPayload) {
    setContactError("");

    if (!sessionUser?.id) {
      throw new Error("You must be signed in to save contacts.");
    }

    const cleanedEmail = String(contactPayload.email || "").trim().toLowerCase();

    if (!cleanedEmail || !isValidEmail(cleanedEmail)) {
      throw new Error("A valid email address is required.");
    }

    const insertPayload = {
      profile_id: sessionUser.id,
      name: contactPayload.name,
      email: cleanedEmail,
      relationship_types: contactPayload.relationshipTypes || ["Friend"],
    };

    const { error } = await supabase
      .from("profile_connections")
      .insert(insertPayload);

    if (error) {
      throw new Error(
        normalizeSupabaseError(
          error,
          "Failed to save contact to profile_connections. Check RLS, required fields, and column names."
        )
      );
    }

    await loadContacts(sessionUser.id);
  }

  function openDeleteContactModal(contact) {
    setDeleteContactError("");
    setSelectedContactToDelete(contact);
    setIsDeleteContactOpen(true);
  }

  function openDeleteCircleModal(circle) {
    setDeleteCircleError("");
    setSelectedCircleToDelete(circle);
    setIsDeleteCircleOpen(true);
  }

  async function handleConfirmDeleteContact(contact) {
    setDeleteContactError("");
    setContactError("");
    setCircleSuccess("");

    if (!contact?.id) {
      setDeleteContactError("Missing contact id.");
      return;
    }

    setIsDeletingContact(true);

    try {
      const { error } = await supabase
        .from("profile_connections")
        .delete()
        .eq("id", contact.id);

      if (error) {
        throw new Error(
          normalizeSupabaseError(
            error,
            "Failed to delete contact from profile_connections."
          )
        );
      }

      const remainingContacts = contacts.filter((item) => item.id !== contact.id);

      setContacts(remainingContacts);
      setSelectedPeople((prev) => prev.filter((item) => item.id !== contact.id));

      if (String(selectedHintContactId) === String(contact.id)) {
        setSelectedHintContactId(remainingContacts[0]?.id || null);
        setForm((prev) => ({ ...prev, selectedHintId: "" }));
      }

      setIsDeleteContactOpen(false);
      setSelectedContactToDelete(null);
      setCircleSuccess("Contact deleted successfully.");
    } catch (error) {
      console.error("Delete contact failed:", error);
      setDeleteContactError(error?.message || "Failed to delete contact.");
    } finally {
      setIsDeletingContact(false);
    }
  }

  async function handleConfirmDeleteCircle(circle) {
    setDeleteCircleError("");
    setCircleError("");
    setCircleSuccess("");

    if (!circle?.id) {
      setDeleteCircleError("Missing circle id.");
      return;
    }

    setIsDeletingCircle(true);

    try {
      const { error: inviteDeleteError } = await supabase
        .from("circle_invites")
        .delete()
        .eq("circle_id", circle.id);

      if (inviteDeleteError) {
        throw new Error(
          normalizeSupabaseError(
            inviteDeleteError,
            "Failed to delete related circle invites."
          )
        );
      }

      const { error: circleDeleteError } = await supabase
        .from("circles")
        .delete()
        .eq("id", circle.id);

      if (circleDeleteError) {
        throw new Error(
          normalizeSupabaseError(
            circleDeleteError,
            "Failed to delete circle."
          )
        );
      }

      setRealCircles((prev) => prev.filter((item) => item.id !== circle.id));

      setIsDeleteCircleOpen(false);
      setSelectedCircleToDelete(null);
      setCircleSuccess("Circle deleted successfully.");
    } catch (error) {
      console.error("Delete circle failed:", error);
      setDeleteCircleError(error?.message || "Failed to delete circle.");
    } finally {
      setIsDeletingCircle(false);
    }
  }

  async function handleCreateCircle() {
    setCircleError("");
    setCircleSuccess("");

    const selectedEvent =
      eventMode === "calendar"
        ? safeCalendarEvents.find((event) => String(event.id) === String(selectedEventId))
        : null;

    const eventTitle =
      eventMode === "calendar"
        ? selectedEvent?.title || form.eventTitle || ""
        : form.eventTitle?.trim() || "";

    const eventDate =
      eventMode === "calendar"
        ? selectedEvent?.date || form.eventDate || ""
        : form.eventDate || "";

    if (!sessionUser?.id) {
      setCircleError("You must be signed in to create a circle.");
      return;
    }

    if (!eventTitle.trim()) {
      setCircleError("Event title is required.");
      return;
    }

    if (!safeIsoDate(eventDate)) {
      setCircleError("Event date is required.");
      return;
    }

    if (!safeIsoTimestampEndOfDay(form.deadline || eventDate)) {
      setCircleError("Contribution deadline is required.");
      return;
    }

    const contactsWithoutEmail = selectedPeople.filter(
      (person) => !String(person.email || "").trim() || !isValidEmail(person.email)
    );

    if (contactsWithoutEmail.length > 0) {
      setCircleError("Every invited contact must have a valid email address.");
      return;
    }

    const selectedHint =
      publicHintsByContact?.[selectedHintContactId]?.find((hint) => hint.id === form.selectedHintId) || null;

    let itemTitle = "Shared contribution pot";
    let itemUrl = null;
    let itemImageUrl = null;
    let itemDescription = null;
    let itemTargetAmount = 0;
    let organisingFeeAmount = 0;
    let totalTargetAmount = 0;

    if (form.goalType === "item") {
      if (form.itemSource === "hint") {
        if (!selectedHint) {
          setCircleError("Choose a public hint or switch to pasted link.");
          return;
        }

        const baseAmount = extractHintAmount(selectedHint);

        if (baseAmount <= 0) {
          setCircleError("We couldn’t find a valid item price for that hint.");
          return;
        }

        const totals = calculateCircleTotals(baseAmount);

        itemTitle = buildStoredItemTitle(selectedHint.title || "Shared item");
        itemUrl = selectedHint.url || null;
        itemImageUrl = selectedHint.image || null;
        itemDescription = selectedHint.description || null;
        itemTargetAmount = totals.itemAmount;
        organisingFeeAmount = totals.feeAmount;
        totalTargetAmount = totals.totalAmount;
      } else {
        if (!form.itemUrl.trim()) {
          setCircleError("Paste a product or experience link.");
          return;
        }

        const baseAmount = extractPreviewAmount(linkPreview);

        if (baseAmount <= 0) {
          setCircleError(
            "We couldn’t detect a price from that link preview yet. Add pricing to the preview response or use a hint with a valid amount."
          );
          return;
        }

        const totals = calculateCircleTotals(baseAmount);

        itemTitle = buildStoredItemTitle(linkPreview?.title || "Shared item");
        itemUrl = linkPreview?.url || form.itemUrl.trim();
        itemImageUrl = linkPreview?.image || null;
        itemDescription = linkPreview?.description || null;
        itemTargetAmount = totals.itemAmount;
        organisingFeeAmount = totals.feeAmount;
        totalTargetAmount = totals.totalAmount;
      }
    } else {
      const manualAmount = parseAmount(form.goalValue);

      if (manualAmount <= 0) {
        setCircleError("Target amount must be greater than 0.");
        return;
      }

      itemTitle = "Shared contribution pot";
      itemTargetAmount = roundCurrency(manualAmount);
      organisingFeeAmount = calculateHintedFee(itemTargetAmount);
      totalTargetAmount = roundCurrency(itemTargetAmount + organisingFeeAmount);
    }

    const circleInsertPayload = {
      user_id: sessionUser.id,
      recipient_contact_id: null,
      title: eventTitle.trim(),
      occasion_type: eventMode === "calendar" ? selectedEvent?.type || "Event" : "Event",
      event_date: safeIsoDate(eventDate),
      deadline_at: safeIsoTimestampEndOfDay(form.deadline || eventDate),
      source_type: sourceTypeFromForm(form.goalType, form.itemSource),
      hint_id: null,
      item_title: itemTitle,
      item_url: itemUrl,
      item_image_url: itemImageUrl,
      item_description: itemDescription,
      currency: form.currency || "GBP",
      item_target_amount: itemTargetAmount,
      organising_fee_amount: organisingFeeAmount,
      total_target_amount: totalTargetAmount,
      fee_mode: "included_in_target",
      payout_mode: "release_to_organiser",
      funding_mode: fundingModeToDb(form.fundingMode),
      status: "draft",
    };

    setIsCreatingCircle(true);

    try {
      const { data: insertedRows, error: insertCircleError } = await supabase
        .from("circles")
        .insert(circleInsertPayload)
        .select("*");

      if (insertCircleError) {
        throw new Error(
          normalizeSupabaseError(
            insertCircleError,
            "Failed to insert into circles. Check RLS, schema columns, required values, and date formatting."
          )
        );
      }

      const insertedCircle = Array.isArray(insertedRows) ? insertedRows[0] : null;

      if (!insertedCircle?.id) {
        throw new Error("Circle was inserted, but the new row could not be returned.");
      }

      const inviteRows = selectedPeople.map((person) => ({
        circle_id: insertedCircle.id,
        user_id: sessionUser.id,
        contact_id: null,
        invite_name: person.name || null,
        invite_email: person.email.trim().toLowerCase(),
        status: "pending",
        reminder_count: 0,
      }));

      let insertedInvites = [];
      if (inviteRows.length > 0) {
        const { data: inviteData, error: inviteError } = await supabase
          .from("circle_invites")
          .insert(inviteRows)
          .select("*");

        if (inviteError) {
          throw new Error(
            normalizeSupabaseError(
              inviteError,
              "Circle created but invite insert failed in circle_invites. Check RLS, invite_email, and schema constraints."
            )
          );
        }

        insertedInvites = inviteData || [];
      }

      const currentUserName =
        getGoogleName(profile || {}) ||
        profile?.full_name ||
        profile?.name ||
        "You";

      const mappedCircle = buildCircleViewModel(insertedCircle, insertedInvites, currentUserName);

      setRealCircles((prev) => [mappedCircle, ...prev]);
      setCircleSuccess("Circle created successfully.");
      setIsCreateOpen(false);
      resetCircleForm();
    } catch (error) {
      console.error("Error creating circle:", error);
      setCircleError(error?.message || "Failed to create circle.");
    } finally {
      setIsCreatingCircle(false);
    }
  }

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
              <Link
                href="/circles"
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#2f3b2d] px-4 text-[14px] font-semibold text-white sm:px-5"
              >
                Circles
              </Link>
              <Link
                href="/shop"
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-4 text-[14px] font-semibold text-slate-700 hover:bg-[#fff5f0] sm:px-5"
              >
                Shop
              </Link>
            </nav>

            <AvatarMenu />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1380px] px-5 py-8 md:px-8">
        {(pageError || contactError || circleError || circleSuccess) ? (
          <div className="mb-5 space-y-3">
            {pageError ? (
              <div className="rounded-[22px] border border-[#efc0ba] bg-[#fff4f2] px-4 py-3 text-sm text-[#b14f43]">
                {pageError}
              </div>
            ) : null}

            {contactError ? (
              <div className="rounded-[22px] border border-[#efc0ba] bg-[#fff4f2] px-4 py-3 text-sm text-[#b14f43]">
                {contactError}
              </div>
            ) : null}

            {circleError ? (
              <div className="rounded-[22px] border border-[#efc0ba] bg-[#fff4f2] px-4 py-3 text-sm text-[#b14f43]">
                {circleError}
              </div>
            ) : null}

            {circleSuccess ? (
              <div className="rounded-[22px] border border-[#d8e8d3] bg-[#f3fbf1] px-4 py-3 text-sm text-[#4a7a3a]">
                {circleSuccess}
              </div>
            ) : null}
          </div>
        ) : null}

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
                    {isLoadingContacts ? (
                      <div className="rounded-[22px] border border-dashed border-[#e5d8cf] bg-[#fffaf7] p-4 text-[13px] leading-6 text-slate-500">
                        Loading contacts...
                      </div>
                    ) : contacts.length ? (
                      contacts.map((contact) => (
                        <ContactCard
                          key={contact.id}
                          contact={contact}
                          onDeleteClick={openDeleteContactModal}
                        />
                      ))
                    ) : (
                      <div className="rounded-[22px] border border-dashed border-[#e5d8cf] bg-[#fffaf7] p-4 text-[13px] leading-6 text-slate-500">
                        No contacts added yet. Use the add contact flow to browse from your linked Google account or type someone in manually.
                      </div>
                    )}
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
                  {isLoadingCircles ? (
                    <div className="rounded-[24px] border border-[#f0dfd6] bg-white p-5 text-sm text-slate-500">
                      Loading circles...
                    </div>
                  ) : (
                    displayedCircles.map((circle) => (
                      <CircleCard
                        key={circle.id}
                        circle={circle}
                        onDeleteCircleClick={openDeleteCircleModal}
                        deletingCircleId={isDeletingCircle ? selectedCircleToDelete?.id : null}
                      />
                    ))
                  )}
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
        calendarEvents={safeCalendarEvents}
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
        errorMessage={circleError}
        isSubmitting={isCreatingCircle}
      />

      <AddContactModal
        open={isAddContactOpen}
        onClose={() => setIsAddContactOpen(false)}
        onSave={async (payload) => {
          try {
            await handleSaveContact(payload);
          } catch (error) {
            setContactError(error?.message || "Failed to save contact.");
            throw error;
          }
        }}
        supabase={supabase}
      />

      <DeleteContactModal
        open={isDeleteContactOpen}
        onClose={() => {
          setIsDeleteContactOpen(false);
          setSelectedContactToDelete(null);
          setDeleteContactError("");
        }}
        onConfirm={handleConfirmDeleteContact}
        contact={selectedContactToDelete}
        isDeleting={isDeletingContact}
        errorMessage={deleteContactError}
      />

      <DeleteCircleModal
        open={isDeleteCircleOpen}
        onClose={() => {
          setIsDeleteCircleOpen(false);
          setSelectedCircleToDelete(null);
          setDeleteCircleError("");
        }}
        onConfirm={handleConfirmDeleteCircle}
        circle={selectedCircleToDelete}
        isDeleting={isDeletingCircle}
        errorMessage={deleteCircleError}
      />
    </main>
  );
}
