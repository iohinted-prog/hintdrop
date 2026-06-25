"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
import AvatarMenu from "../components/AvatarMenu";
import { useCurrencyFormatter } from "../../lib/useCurrencyFormatter";

const HINTED_SERVICE_FEE_RATE = 0.02;
const SELF_SELECTOR_ID = "__self__";

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
      status: "accepted",
    },
    {
      name: "Example friend",
      initials: "E",
      contributed: false,
      amount: 0,
      colors: "from-[#efcdbf] to-[#bb8168]",
      status: "invitee",
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

function parseAmount(value) {
  const cleaned = String(value || "").replace(/[^\d.]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
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

function getGoogleName(metadata = {}) {
  return (
    metadata.full_name ||
    metadata.name ||
    [metadata.given_name, metadata.family_name].filter(Boolean).join(" ") ||
    ""
  ).trim();
}

function getPrimaryContactField(person, field) {
  const items = person?.[field];
  if (!Array.isArray(items) || items.length === 0) return "";
  return items[0]?.value || items[0]?.displayName || "";
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

function formatDateLabel(dateString) {
  if (!dateString) return "No date";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
  });
}

function getAvatarState(status) {
  return String(status || "").toLowerCase() === "accepted" ? "accepted" : "invitee";
}

function getStatusLabel(status) {
  return getAvatarState(status) === "accepted" ? "Accepted" : "Invitee";
}

function getAvatarClasses(colors, status, size = "md") {
  const avatarState = getAvatarState(status);
  const sizeClasses =
    size === "sm"
      ? "h-8 w-8 text-[11px]"
      : size === "lg"
        ? "h-11 w-11 text-[12px]"
        : "h-10 w-10 text-[11px]";

  if (avatarState === "accepted") {
    return `flex items-center justify-center rounded-full bg-gradient-to-b ${sizeClasses} font-bold text-white ${colors}`;
  }

  return `flex items-center justify-center rounded-full border-2 border-dashed border-[#dfb39d] bg-[#fff5ef] ${sizeClasses} font-bold text-[#c87150]`;
}

function relationshipLabelFromArray(relationshipTypes) {
  if (!Array.isArray(relationshipTypes) || relationshipTypes.length === 0) return "Friend";
  return relationshipTypes[0] || "Friend";
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

function toDisplayPotTitle(value) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "Shared gift";

  const cleaned = text
    .replace(/[|–—•,:;()[\]{}]+/g, " ")
    .replace(
      /\b(with|for|and|the|from|your|this|that|into|gift|voucher|experience|set|kit|duo|edition)\b/gi,
      " "
    )
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

function extractHintAmount(hint) {
  const directCandidates = [
    hint?.numeric_price,
    hint?.amount,
    hint?.price,
    hint?.targetAmount,
    hint?.priceAmount,
  ];

  for (const candidate of directCandidates) {
    const cleaned = String(candidate ?? "").replace(/[^\d.]/g, "");
    const amount = Number(cleaned);
    if (Number.isFinite(amount) && amount > 0) return roundCurrency(amount);
  }

  const textCandidates = [hint?.price_text, hint?.priceText];
  for (const text of textCandidates) {
    const match = String(text || "").match(/(\d+(?:\.\d{1,2})?)/);
    if (match?.[1]) {
      const amount = Number(match[1]);
      if (Number.isFinite(amount) && amount > 0) return roundCurrency(amount);
    }
  }

  return 0;
}

function extractPreviewAmount(preview) {
  const directCandidates = [
    preview?.price,
    preview?.amount,
    preview?.targetAmount,
    preview?.priceAmount,
    preview?.numeric_price,
  ];

  for (const candidate of directCandidates) {
    const amount = Number(String(candidate ?? "").replace(/[^\d.]/g, ""));
    if (Number.isFinite(amount) && amount > 0) return roundCurrency(amount);
  }

  const textCandidates = [preview?.priceText, preview?.price_text];
  for (const text of textCandidates) {
    const match = String(text || "").match(/(\d+(?:\.\d{1,2})?)/);
    if (match?.[1]) {
      const amount = Number(match[1]);
      if (Number.isFinite(amount) && amount > 0) return roundCurrency(amount);
    }
  }

  return 0;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim().toLowerCase());
}

function buildContactRecordFromRow(row) {
  const relationship = row?.role || relationshipLabelFromArray(row?.relationship_types);
  const safeName = row?.name || row?.email || "Unnamed contact";

  return {
    id: row.id,
    type: "contact",
    profileConnectionId: row.id,
    matchedProfileId: row?.matched_profile_id || null,
    hasHintedAccount: Boolean(row?.matched_profile_id),
    name: safeName,
    role: relationship || "Friend",
    note: getStatusLabel(row?.status),
    initials: getInitials(safeName),
    colors: getRelationshipGradient(relationship || "Friend"),
    email: row?.email || "",
    phone: row?.phone || "",
    birthday: row?.birthday || "",
    status: getAvatarState(row?.status),
    raw: row,
  };
}

function buildSelfRecord(profile) {
  const safeName =
    getGoogleName(profile || {}) ||
    profile?.full_name ||
    profile?.invite_name ||
    "You";

  return {
    id: SELF_SELECTOR_ID,
    type: "self",
    name: safeName,
    role: "You",
    note: "Accepted",
    initials: getInitials(safeName || "You"),
    colors: "from-[#4e596d] to-[#212a3c]",
    email: profile?.invite_email || "",
    status: "accepted",
    raw: profile || null,
  };
}

function buildCircleViewModel(circleRow, inviteRows = [], currentUserName = "You") {
  const members = [
    {
      name: currentUserName || "You",
      initials: getInitials(currentUserName || "You"),
      contributed: false,
      amount: 0,
      colors: "from-[#4e596d] to-[#212a3c]",
      status: "accepted",
    },
    ...inviteRows.map((invite) => ({
      name: invite.invite_name || invite.invite_email || "Invited person",
      initials: getInitials(invite.invite_name || invite.invite_email || "Invited person"),
      contributed: false,
      amount: 0,
      colors: "from-[#efcdbf] to-[#bb8168]",
      status: getAvatarState(invite.status),
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
            : circleRow.source_type === "organiser_private_hint"
              ? "From your hints"
              : "Shared goal",
      sourceUrl: circleRow.item_url || "",
      previewImage: circleRow.item_image_url || "",
      previewDescription: circleRow.item_description || "",
      target: totalTarget,
      currency: circleRow.currency || "GBP",
      raised: 0,
      note:
        circleRow.funding_mode === "all_or_nothing"
          ? "This circle will only proceed if the target is reached by the deadline."
          : circleRow.funding_mode === "organiser_covers"
            ? "If the target is not reached, the organiser can choose to cover the gap."
            : "This circle can stay flexible if fewer people join than expected.",
      fundingMode: fundingModeToLabel(circleRow.funding_mode),
      deadline: circleRow.deadline_at || circleRow.event_date || "",
      goalType:
        circleRow.item_title && circleRow.item_title !== "Shared contribution pot" ? "item" : "amount",
    },
    raw: circleRow,
    invites: inviteRows,
  };
}

function buildGenericCalendarEvents() {
  const now = new Date();
  const end = new Date();
  end.setMonth(end.getMonth() + 12);

  const year = now.getFullYear();

  const recurring = [
    { title: "Halloween", type: "Holiday", month: 10, day: 31 },
    { title: "Bonfire Night", type: "Holiday", month: 11, day: 5 },
    { title: "Christmas", type: "Holiday", month: 12, day: 25 },
    { title: "New Year's Eve", type: "Holiday", month: 12, day: 31 },
    { title: "Valentine's Day", type: "Occasion", month: 2, day: 14 },
    { title: "Mother's Day", type: "Occasion", month: 3, day: 30 },
    { title: "Father's Day", type: "Occasion", month: 6, day: 21 },
  ];

  const rows = [];

  for (let y = year; y <= year + 1; y += 1) {
    for (const item of recurring) {
      const date = new Date(Date.UTC(y, item.month - 1, item.day));
      if (date >= now && date <= end) {
        rows.push({
          id: `generic-${item.title}-${y}`,
          title: item.title,
          event_date: date.toISOString().slice(0, 10),
          type: item.type,
          source: "generic",
        });
      }
    }
  }

  return rows.sort((a, b) => String(a.event_date).localeCompare(String(b.event_date)));
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
    <article className="rounded-[22px] border border-[#f0dfd6] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={getAvatarClasses(contact.colors, contact.status, "lg")}>
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

function MemberPill({ member, currency = "GBP", formatCurrency }) {
  const isAccepted = getAvatarState(member.status) === "accepted";

  const statusStyles = isAccepted
    ? member.contributed
      ? "bg-[#edf6eb] text-[#4a7a3a]"
      : "bg-[#eef4ff] text-[#5676b3]"
    : "bg-[#fff3ee] text-[#d57a58]";

  const statusLabel = isAccepted ? "Accepted" : "Invitee";

  return (
    <div className="rounded-[20px] border border-[#eee1d9] bg-[#fffdfa] p-3">
      <div className="flex items-center gap-3">
        <div className={getAvatarClasses(member.colors, member.status)}>
          {member.initials}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{member.name}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles}`}>
              {statusLabel}
            </span>
            <span className="text-[11px] text-slate-400">
              {member.contributed ? formatCurrency(member.amount, currency || "GBP") : "—"}
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
      text: "Anyone invited can join and contribute what they want.",
      colors: "bg-[#edf6eb] text-[#4a7a3a]",
    },
    {
      title: "All-or-nothing",
      text: "The circle only goes ahead if the target is reached by the deadline.",
      colors: "bg-[#fff3ee] text-[#d57a58]",
    },
    {
      title: "Organizer covers gap",
      text: "The organiser can choose to top up the missing amount.",
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

function CircleCard({ circle, onDeleteCircleClick, deletingCircleId, formatCurrency }) {
  const safeMembers = Array.isArray(circle?.members) ? circle.members : [];
  const joinedCount = safeMembers.filter(
    (member) => getAvatarState(member.status) === "accepted"
  ).length;
  const invitedCount = safeMembers.length;
  const potCurrency = circle?.pot?.currency || "GBP";
  const moneyLabel = formatCurrency(circle?.pot?.target, potCurrency);
  const raisedLabel = formatCurrency(circle?.pot?.raised, potCurrency);
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
              {joinedCount} of {invitedCount} accepted
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
                  currency={potCurrency}
                  formatCurrency={formatCurrency}
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
                      className={`${getAvatarClasses(member.colors, member.status, "lg")} border-4 border-white shadow-sm`}
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
                    {potCurrency}
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
            ) : null}
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

function AddContactModal({ open, onClose, onSave, supabase, modalKey }) {
  const [contactSearch, setContactSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [contactResults, setContactResults] = useState([]);
  const [searchingContacts, setSearchingContacts] = useState(false);
  const [contactsMessage, setContactsMessage] = useState("");
  const [selectedRelationships, setSelectedRelationships] = useState(["Friend"]);
  const [form, setForm] = useState({ name: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => setDebouncedSearch(contactSearch.trim()), 250);
    return () => clearTimeout(timer);
  }, [contactSearch, open]);

  useEffect(() => {
    if (!open) return;
    if (!debouncedSearch) {
      setContactResults([]);
      setContactsMessage("");
      setSearchingContacts(false);
      return;
    }

    let cancelled = false;

    async function runSearch() {
      setSearchingContacts(true);
      setContactsMessage("");

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const providerToken = session?.provider_token;

        if (!providerToken) {
          if (!cancelled) {
            setContactResults([]);
            setContactsMessage("We couldn’t access your linked Google contacts right now.");
          }
          return;
        }

        const url = new URL("https://people.googleapis.com/v1/people:searchContacts");
        url.searchParams.set("query", debouncedSearch);
        url.searchParams.set("pageSize", "8");
        url.searchParams.set("readMask", "names,emailAddresses");

        const response = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${providerToken}`,
          },
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error?.message || "Couldn’t search contacts.");
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

        if (!cancelled) {
          setContactResults(mapped);
          setContactsMessage(mapped.length ? "" : "No matching Google contacts found.");
        }
      } catch (error) {
        if (!cancelled) {
          setContactResults([]);
          setContactsMessage(error?.message || "Couldn’t search contacts.");
        }
      } finally {
        if (!cancelled) setSearchingContacts(false);
      }
    }

    runSearch();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, open, supabase, modalKey]);

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
        relationshipTypes: selectedRelationships,
      });
      onClose();
    } catch (error) {
      setSaveError(error?.message || "Failed to save contact.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

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
              onChange={(e) => setContactSearch(e.target.value)}
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
    if (!open) setTypedName("");
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
  setLinkPreview,
  isFetchingPreview,
  handleFetchPreview,
  selectedHintOwnerId,
  setSelectedHintOwnerId,
  errorMessage,
  isSubmitting,
  ownHints,
  publicHintsByContact,
  selfProfile,
  formatCurrency,
}) {
  if (!open) return null;

  const safeCalendarEvents = Array.isArray(calendarEvents) ? calendarEvents : [];
  const ownerOptions = [buildSelfRecord(selfProfile), ...contacts];
  const selectedOwner =
    ownerOptions.find((option) => String(option.id) === String(selectedHintOwnerId)) || null;

  const selectedOwnerPublicHints =
    selectedOwner && selectedOwner.type !== "self"
      ? publicHintsByContact?.[selectedOwner.id] || []
      : [];

  const visibleHints = String(selectedHintOwnerId) === SELF_SELECTOR_ID ? ownHints : selectedOwnerPublicHints;
  const amountMode = form.goalType === "amount";

  const liveBaseAmount = parseAmount(form.goalValue);
  const liveTotals = calculateCircleTotals(liveBaseAmount);

  function handleSelectHint(hint) {
    const hintAmount = extractHintAmount(hint);
    const nextAmount = hintAmount > 0 ? String(hintAmount) : "";

    setForm((prev) => ({
      ...prev,
      selectedHintId: hint.id,
      goalValue: nextAmount,
      currency: hint?.currency || prev.currency,
    }));

    setLinkPreview({
      title: hint?.title || "Shared item",
      description: hint?.retailer || "",
      image: hint?.image_url || "",
      url: hint?.url || "",
    });
  }

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
              <div className="mt-4 max-h-[280px] space-y-3 overflow-y-auto pr-1">
                {safeCalendarEvents.map((event) => (
                  <label
                    key={event.id}
                    className={`flex cursor-pointer items-center justify-between rounded-[20px] border p-4 ${
                      String(event.id) === String(selectedEventId)
                        ? "border-[#f0a384] bg-[#fff4ee]"
                        : "border-[#efe1d9] bg-[#fffdfa]"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                      <p className="mt-1 text-[13px] text-slate-500">
                        {event.type} · {event.event_date}
                      </p>
                    </div>
                    <input
                      type="radio"
                      name="calendarEvent"
                      className="h-4 w-4 accent-[#f36f64]"
                      checked={String(event.id) === String(selectedEventId)}
                      onChange={() => {
                        setSelectedEventId(String(event.id));
                        setForm((prev) => ({
                          ...prev,
                          eventDate: event.event_date,
                          deadline: prev.deadline || event.event_date,
                          occasionType: event.type || prev.occasionType,
                          title: prev.title?.trim() ? prev.title : event.title,
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
                      setForm((prev) => ({
                        ...prev,
                        eventTitle: e.target.value,
                        title: prev.title?.trim() ? prev.title : e.target.value,
                      }))
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
                        deadline: prev.deadline || e.target.value,
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
              <label className="space-y-2 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">Circle name</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
                  placeholder="Jules birthday circle"
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
                    if (nextValue === "amount") {
                      setLinkPreview(null);
                    }
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
                  label="Target amount"
                />
              ) : (
                <div className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Amount</span>
                  <div className="flex h-12 w-full items-center rounded-[18px] border border-[#efe1d9] bg-[#faf7f5] px-4 text-sm text-slate-500">
                    Clicking different hints will update the amount below.
                  </div>
                </div>
              )}
            </div>
          </div>

          {!amountMode ? (
            <div className="rounded-[24px] border border-[#eedfd6] bg-white p-5">
              <div>
                <p className="text-sm font-semibold text-slate-900">4. Choose the item</p>
                <p className="mt-1 text-[13px] leading-6 text-slate-500">
                  Pick the person on the left, then choose one hint or paste a link.
                </p>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      itemSource: "hint",
                      itemUrl: "",
                      selectedHintId: "",
                      goalValue: "",
                    }));
                    setLinkPreview(null);
                  }}
                  className={`inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-semibold ${
                    form.itemSource === "hint"
                      ? "bg-[#2f3b2d] text-white"
                      : "border border-[#ead8ce] bg-white text-slate-700"
                  }`}
                >
                  From hints
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      itemSource: "url",
                      selectedHintId: "",
                      goalValue: prev.itemSource === "url" ? prev.goalValue : "",
                    }));
                    setLinkPreview(null);
                  }}
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
                      People
                    </p>

                    <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                      {ownerOptions.map((person) => {
                        const selected = String(person.id) === String(selectedHintOwnerId);

                        return (
                          <button
                            key={person.id}
                            type="button"
                            onClick={() => {
                              setSelectedHintOwnerId(person.id);
                              setForm((prev) => ({
                                ...prev,
                                selectedHintId: "",
                                goalValue: "",
                              }));
                              setLinkPreview(null);
                            }}
                            className={`flex w-full items-center gap-3 rounded-[18px] border px-3 py-3 text-left transition ${
                              selected
                                ? "border-[#f0a384] bg-[#fff4ee]"
                                : "border-[#efe1d9] bg-white hover:bg-[#fff8f4]"
                            }`}
                          >
                            <div className={getAvatarClasses(person.colors, person.status)}>
                              {person.initials}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900">{person.name}</p>
                              <p className="text-[12px] text-slate-500">{person.role}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-[#efe1d9] bg-[#fffdfa] p-4">
                    {selectedOwner ? (
                      <>
                        <div className="flex items-center gap-3">
                          <div className={getAvatarClasses(selectedOwner.colors, selectedOwner.status, "lg")}>
                            {selectedOwner.initials}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {selectedOwner.type === "self" ? "Your hints" : `${selectedOwner.name}'s hints`}
                            </p>
                            <p className="text-[13px] text-slate-500">
                              {selectedOwner.type === "self"
                                ? "Private and public hints from your own account."
                                : selectedOwner.hasHintedAccount
                                  ? "Public hints from this hinted account."
                                  : "This contact is not linked to a hinted account yet, so their public hints cannot be loaded."}
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
                                  <p className="text-sm font-semibold text-slate-900">
                                    {hint.title}
                                  </p>
                                  <p className="mt-1 text-[13px] text-slate-500">
                                    {selectedOwner.type === "self"
                                      ? hint.is_private
                                        ? "Private"
                                        : "Public"
                                      : "Public"}
                                    {hint.retailer ? ` · ${hint.retailer}` : ""}
                                    {extractHintAmount(hint) > 0
                                      ? ` · ${formatCurrency(
                                          extractHintAmount(hint),
                                          hint.currency || form.currency || "GBP"
                                        )}`
                                      : ""}
                                  </p>
                                  <p className="mt-2 text-[12px] leading-5 text-slate-500">
                                    {hint.url || "No link saved"}
                                  </p>
                                </div>

                                <input
                                  type="radio"
                                  name="selectedHint"
                                  className="mt-1 h-4 w-4 accent-[#f36f64]"
                                  checked={form.selectedHintId === hint.id}
                                  onChange={() => handleSelectHint(hint)}
                                />
                              </label>
                            ))
                          ) : selectedOwner.type === "self" ? (
                            <div className="rounded-[18px] bg-white p-4 text-sm text-slate-500">
                              No hints available yet.
                            </div>
                          ) : selectedOwner.hasHintedAccount ? (
                            <div className="rounded-[18px] border border-dashed border-[#e5d8cf] bg-white p-5 text-sm leading-6 text-slate-500">
                              No public hints yet for this contact.
                            </div>
                          ) : (
                            <div className="rounded-[18px] border border-dashed border-[#e5d8cf] bg-white p-5 text-sm leading-6 text-slate-500">
                              This contact is not linked to a hinted user account yet.
                            </div>
                          )}
                        </div>

                        {form.itemSource === "hint" && linkPreview ? (
                          <div className="mt-4">
                            <PotPreviewCard
                              image={linkPreview.image}
                              title={linkPreview.title}
                              url={linkPreview.url}
                            />
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="flex h-full min-h-[220px] items-center justify-center rounded-[18px] bg-white p-6 text-center text-sm text-slate-500">
                        Select a person to continue.
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

            <div className="mt-4 space-y-4 rounded-[18px] bg-[#fff4ee] p-4">
              {form.goalType === "item" ? (
                <CurrencyAmountInput
                  currency={form.currency}
                  amount={form.goalValue}
                  onCurrencyChange={(value) => setForm((prev) => ({ ...prev, currency: value }))}
                  onAmountChange={(value) => setForm((prev) => ({ ...prev, goalValue: value }))}
                  label="Item target"
                />
              ) : null}

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#df7b59]">
                  Total
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {formatCurrency(liveTotals.totalAmount, form.currency || "GBP")}
                </p>
                <p className="mt-2 text-[12px] leading-5 text-slate-500">
                  When you create this circle, we will add our 2% fee for helping you avoid those awkward interactions. This will be split by all members.
                </p>
              </div>
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
                      <div className={getAvatarClasses(person.colors, person.status, "sm")}>
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
                      <div className={getAvatarClasses(contact.colors, contact.status)}>
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

export default function CirclesClient() {
  const supabase = createClient();
  const { formatCurrency } = useCurrencyFormatter();

  const [sessionUser, setSessionUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [contacts, setContacts] = useState([]);
  const [ownHints, setOwnHints] = useState([]);
  const [publicHintsByContact, setPublicHintsByContact] = useState({});
  const [realCircles, setRealCircles] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);

  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isLoadingCircles, setIsLoadingCircles] = useState(true);

  const [pageError, setPageError] = useState("");
  const [contactError, setContactError] = useState("");
  const [circleError, setCircleError] = useState("");
  const [circleSuccess, setCircleSuccess] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [addContactModalKey, setAddContactModalKey] = useState(0);

  const [isDeleteContactOpen, setIsDeleteContactOpen] = useState(false);
  const [isDeleteCircleOpen, setIsDeleteCircleOpen] = useState(false);
  const [selectedContactToDelete, setSelectedContactToDelete] = useState(null);
  const [selectedCircleToDelete, setSelectedCircleToDelete] = useState(null);
  const [isDeletingContact, setIsDeletingContact] = useState(false);
  const [isDeletingCircle, setIsDeletingCircle] = useState(false);
  const [deleteContactError, setDeleteContactError] = useState("");
  const [deleteCircleError, setDeleteCircleError] = useState("");

  const [eventMode, setEventMode] = useState("calendar");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [selectedHintOwnerId, setSelectedHintOwnerId] = useState(SELF_SELECTOR_ID);
  const [linkPreview, setLinkPreview] = useState(null);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const [isCreatingCircle, setIsCreatingCircle] = useState(false);

  const [form, setForm] = useState({
    title: "",
    eventTitle: "",
    eventDate: "",
    occasionType: "Event",
    deadline: "",
    goalType: "item",
    goalValue: "",
    currency: "GBP",
    fundingMode: "flexible",
    itemSource: "hint",
    selectedHintId: "",
    itemUrl: "",
  });

  const didBootstrap = useRef(false);

  const mergedCalendarEvents = useMemo(() => {
    const generic = buildGenericCalendarEvents();
    const real = Array.isArray(calendarEvents) ? calendarEvents : [];
    const map = new Map();

    [...generic, ...real].forEach((event) => {
      const date = event.event_date || event.date || "";
      const title = event.title || "Event";
      const type = event.type || event.occasion_type || "Event";
      const key = `${title}-${date}`;

      if (!map.has(key)) {
        map.set(key, {
          id: event.id,
          title,
          event_date: date,
          type,
          source: event.source || "user",
        });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      String(a.event_date).localeCompare(String(b.event_date))
    );
  }, [calendarEvents]);

  const displayedCircles = useMemo(() => {
    return realCircles.length > 0 ? realCircles : [exampleCircle];
  }, [realCircles]);

  const initialiseCircleForm = useCallback((profileValue, eventsValue) => {
    const safeEvents = Array.isArray(eventsValue) ? eventsValue : [];
    const fallback = safeEvents[0] || buildGenericCalendarEvents()[0] || null;

    setEventMode("calendar");
    setSelectedEventId(fallback?.id ? String(fallback.id) : "");
    setSelectedPeople([]);
    setSelectedHintOwnerId(SELF_SELECTOR_ID);
    setLinkPreview(null);
    setCircleError("");
    setForm({
      title: fallback?.title || "",
      eventTitle: fallback?.title || "",
      eventDate: fallback?.event_date || "",
      occasionType: fallback?.type || "Event",
      deadline: fallback?.event_date || "",
      goalType: "item",
      goalValue: "",
      currency: profileValue?.currency || "GBP",
      fundingMode: "flexible",
      itemSource: "hint",
      selectedHintId: "",
      itemUrl: "",
    });
  }, []);

  const loadProfile = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw new Error(normalizeSupabaseError(error, "Failed to load profile."));
    return data || null;
  }, [supabase]);

  const loadContacts = useCallback(async (userId) => {
    setIsLoadingContacts(true);
    setContactError("");

    try {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(normalizeSupabaseError(error, "Failed to load contacts."));

      const rawRows = Array.isArray(data) ? data : [];
      const emails = rawRows
        .map((row) => String(row?.email || "").trim().toLowerCase())
        .filter(Boolean);

      let profileMatches = [];
      if (emails.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, invite_email")
          .in("invite_email", emails);

        if (profilesError) {
          throw new Error(normalizeSupabaseError(profilesError, "Failed to match contacts to profiles."));
        }

        profileMatches = Array.isArray(profilesData) ? profilesData : [];
      }

      const profileIdByEmail = profileMatches.reduce((acc, row) => {
        const key = String(row?.invite_email || "").trim().toLowerCase();
        if (key) acc[key] = row.id;
        return acc;
      }, {});

      const enrichedRows = rawRows.map((row) => {
        const emailKey = String(row?.email || "").trim().toLowerCase();
        return {
          ...row,
          matched_profile_id: emailKey ? profileIdByEmail[emailKey] || null : null,
        };
      });

      const mapped = enrichedRows.map(buildContactRecordFromRow);
      setContacts(mapped);
      return mapped;
    } catch (error) {
      setContacts([]);
      setContactError(error?.message || "Failed to load contacts.");
      return [];
    } finally {
      setIsLoadingContacts(false);
    }
  }, [supabase]);

  const loadCalendarEvents = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", userId)
        .order("event_date", { ascending: true });

      if (error) throw new Error(normalizeSupabaseError(error, "Failed to load calendar events."));

      const rows = data || [];
      setCalendarEvents(rows);
      return rows;
    } catch {
      setCalendarEvents([]);
      return [];
    }
  }, [supabase]);

  const loadOwnHints = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from("hints")
        .select("id, user_id, title, url, image_url, created_at, is_private, retailer, price_text, numeric_price, currency")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(normalizeSupabaseError(error, "Failed to load hints."));

      setOwnHints(data || []);
      return data || [];
    } catch {
      setOwnHints([]);
      return [];
    }
  }, [supabase]);

  const loadPublicHintsForContacts = useCallback(async (contactRows) => {
    const safeContacts = Array.isArray(contactRows) ? contactRows : [];
    const matchedContacts = safeContacts.filter((contact) => contact?.matchedProfileId);

    if (!matchedContacts.length) {
      setPublicHintsByContact({});
      return {};
    }

    try {
      const matchedProfileIds = matchedContacts.map((contact) => contact.matchedProfileId);

      const { data, error } = await supabase
        .from("hints")
        .select("id, user_id, title, url, image_url, created_at, is_private, retailer, price_text, numeric_price, currency")
        .in("user_id", matchedProfileIds)
        .eq("is_private", false)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(normalizeSupabaseError(error, "Failed to load public hints."));
      }

      const hintsByProfileId = (Array.isArray(data) ? data : []).reduce((acc, hint) => {
        const key = String(hint.user_id);
        if (!acc[key]) acc[key] = [];
        acc[key].push(hint);
        return acc;
      }, {});

      const nextMap = matchedContacts.reduce((acc, contact) => {
        acc[contact.id] = hintsByProfileId[String(contact.matchedProfileId)] || [];
        return acc;
      }, {});

      setPublicHintsByContact(nextMap);
      return nextMap;
    } catch {
      setPublicHintsByContact({});
      return {};
    }
  }, [supabase]);

  const loadCircles = useCallback(async (userId, currentProfile) => {
    setIsLoadingCircles(true);
    setCircleError("");

    try {
      const { data: circlesData, error: circlesError } = await supabase
        .from("circles")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (circlesError) {
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
        currentProfile?.invite_name ||
        "You";

      const mapped = (circlesData || []).map((circle) =>
        buildCircleViewModel(circle, inviteMap[circle.id] || [], currentUserName)
      );

      setRealCircles(mapped);
      return mapped;
    } catch (error) {
      setRealCircles([]);
      setCircleError(error?.message || "Failed to load circles.");
      return [];
    } finally {
      setIsLoadingCircles(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (didBootstrap.current) return;
    didBootstrap.current = true;

    let active = true;

    async function bootstrap() {
      try {
        setPageError("");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw new Error(normalizeSupabaseError(userError, "Failed to get user."));
        if (!user) throw new Error("You must be signed in to view circles.");

        if (!active) return;
        setSessionUser(user);

        let currentProfile = null;
        try {
          currentProfile = await loadProfile(user.id);
          if (active) setProfile(currentProfile);
        } catch {
          if (active) setProfile(null);
        }

        const [loadedContacts, loadedEvents] = await Promise.all([
          loadContacts(user.id),
          loadCalendarEvents(user.id),
          loadOwnHints(user.id),
        ]);

        await loadPublicHintsForContacts(loadedContacts);

        if (!active) return;

        const merged = [...buildGenericCalendarEvents(), ...(loadedEvents || [])];
        initialiseCircleForm(currentProfile, merged);

        await loadCircles(user.id, currentProfile);
      } catch (error) {
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
  }, [
    supabase,
    loadProfile,
    loadContacts,
    loadCalendarEvents,
    loadOwnHints,
    loadPublicHintsForContacts,
    loadCircles,
    initialiseCircleForm,
  ]);

  function openAddContactModal() {
    setAddContactModalKey((prev) => prev + 1);
    setIsAddContactOpen(true);
  }

  function closeAddContactModal() {
    setIsAddContactOpen(false);
  }

  async function handleFetchPreview() {
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

      const previewAmount = extractPreviewAmount(data);
      setLinkPreview(data || null);
      setForm((prev) => ({
        ...prev,
        goalValue: previewAmount > 0 ? String(previewAmount) : "",
        currency: data?.currency || prev.currency,
      }));
    } catch {
      setLinkPreview({
        title: "Preview unavailable",
        description:
          "We could not pull a preview from that link yet, but you can still use the URL.",
        image: "",
        url: form.itemUrl.trim(),
      });
      setForm((prev) => ({
        ...prev,
        goalValue: "",
      }));
    } finally {
      setIsFetchingPreview(false);
    }
  }

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
      user_id: sessionUser.id,
      name: contactPayload.name,
      email: cleanedEmail,
      role:
        Array.isArray(contactPayload.relationshipTypes) && contactPayload.relationshipTypes.length
          ? contactPayload.relationshipTypes[0]
          : "Friend",
      status: "accepted",
    };

    const { error } = await supabase.from("contacts").insert(insertPayload);
    if (error) throw new Error(normalizeSupabaseError(error, "Failed to save contact."));

    const reloadedContacts = await loadContacts(sessionUser.id);
    await loadPublicHintsForContacts(reloadedContacts);
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
    setIsDeletingContact(true);
    setDeleteContactError("");

    try {
      const { error } = await supabase.from("contacts").delete().eq("id", contact.id);
      if (error) throw new Error(normalizeSupabaseError(error, "Failed to delete contact."));

      setContacts((prev) => prev.filter((item) => item.id !== contact.id));
      setPublicHintsByContact((prev) => {
        const next = { ...prev };
        delete next[contact.id];
        return next;
      });
      setSelectedPeople((prev) => prev.filter((item) => item.id !== contact.id));
      if (String(selectedHintOwnerId) === String(contact.id)) {
        setSelectedHintOwnerId(SELF_SELECTOR_ID);
      }
      setSelectedContactToDelete(null);
      setIsDeleteContactOpen(false);
    } catch (error) {
      setDeleteContactError(error?.message || "Failed to delete contact.");
    } finally {
      setIsDeletingContact(false);
    }
  }

  async function handleConfirmDeleteCircle(circle) {
    setIsDeletingCircle(true);
    setDeleteCircleError("");

    try {
      const { error: inviteDeleteError } = await supabase
        .from("circle_invites")
        .delete()
        .eq("circle_id", circle.id);

      if (inviteDeleteError) {
        throw new Error(normalizeSupabaseError(inviteDeleteError, "Failed to delete invites."));
      }

      const { error: circleDeleteError } = await supabase
        .from("circles")
        .delete()
        .eq("id", circle.id);

      if (circleDeleteError) {
        throw new Error(normalizeSupabaseError(circleDeleteError, "Failed to delete circle."));
      }

      setRealCircles((prev) => prev.filter((item) => item.id !== circle.id));
      setSelectedCircleToDelete(null);
      setIsDeleteCircleOpen(false);
    } catch (error) {
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
        ? mergedCalendarEvents.find((event) => String(event.id) === String(selectedEventId))
        : null;

    const fallbackEventTitle =
      eventMode === "calendar"
        ? selectedEvent?.title || form.eventTitle || ""
        : form.eventTitle?.trim() || "";

    const finalCircleTitle = form.title?.trim() || fallbackEventTitle;

    const eventDate =
      eventMode === "calendar"
        ? selectedEvent?.event_date || form.eventDate || ""
        : form.eventDate || "";

    const occasionType =
      eventMode === "calendar"
        ? selectedEvent?.type || form.occasionType || "Event"
        : form.occasionType || "Event";

    if (!sessionUser?.id) {
      setCircleError("You must be signed in to create a circle.");
      return;
    }

    if (!finalCircleTitle.trim()) {
      setCircleError("Circle name is required.");
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

    const manualAmount = parseAmount(form.goalValue);
    if (manualAmount <= 0) {
      setCircleError("Target amount must be greater than 0.");
      return;
    }

    const contactsWithoutEmail = selectedPeople.filter(
      (person) => !String(person.email || "").trim() || !isValidEmail(person.email)
    );

    if (contactsWithoutEmail.length > 0) {
      setCircleError("Every invited contact must have a valid email address.");
      return;
    }

    const selectedOwnerIsSelf = String(selectedHintOwnerId) === SELF_SELECTOR_ID;
    const selectedHintSourceList = selectedOwnerIsSelf
      ? ownHints
      : publicHintsByContact?.[selectedHintOwnerId] || [];

    const selectedHint =
      selectedHintSourceList.find((hint) => String(hint.id) === String(form.selectedHintId)) || null;

    const selectedRecipientContact =
      !selectedOwnerIsSelf
        ? contacts.find((contact) => String(contact.id) === String(selectedHintOwnerId)) || null
        : null;

    const totals = calculateCircleTotals(manualAmount);

    let itemTitle = "Shared contribution pot";
    let itemUrl = null;
    let itemImageUrl = null;
    let itemDescription = null;
    let selectedHintId = null;
    let sourceType = "external_link";

    if (form.goalType === "item") {
      if (form.itemSource === "hint") {
        if (!selectedHint) {
          setCircleError("Choose a hint or switch to pasted link.");
          return;
        }

        if (!selectedOwnerIsSelf && !selectedRecipientContact?.matchedProfileId) {
          setCircleError("This contact is not linked to hinted yet.");
          return;
        }

        itemTitle = buildStoredItemTitle(selectedHint.title || "Shared item");
        itemUrl = selectedHint.url || null;
        itemImageUrl = selectedHint.image_url || null;
        itemDescription = selectedHint.retailer || null;
        selectedHintId = selectedHint.id;
        sourceType = selectedOwnerIsSelf
          ? selectedHint.is_private
            ? "organiser_private_hint"
            : "recipient_public_hint"
          : "recipient_public_hint";
      } else {
        if (!form.itemUrl.trim()) {
          setCircleError("Paste a product or experience link.");
          return;
        }

        itemTitle = buildStoredItemTitle(
          linkPreview?.title && linkPreview.title !== "Preview unavailable"
            ? linkPreview.title
            : "Shared item"
        );
        itemUrl = linkPreview?.url || form.itemUrl.trim();
        itemImageUrl = linkPreview?.image || null;
        itemDescription =
          linkPreview?.title === "Preview unavailable" ? null : linkPreview?.description || null;
        sourceType = "external_link";
      }
    }

    const circleInsertPayload = {
      user_id: sessionUser.id,
      recipient_contact_id: selectedRecipientContact?.id || null,
      title: finalCircleTitle.trim(),
      occasion_type: occasionType,
      event_date: safeIsoDate(eventDate),
      deadline_at: safeIsoTimestampEndOfDay(form.deadline || eventDate),
      source_type: sourceType,
      hint_id: selectedHintId,
      item_title: itemTitle,
      item_url: itemUrl,
      item_image_url: itemImageUrl,
      item_description: itemDescription,
      currency: form.currency || "GBP",
      item_target_amount: totals.itemAmount,
      organising_fee_amount: totals.feeAmount,
      total_target_amount: totals.totalAmount,
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
        throw new Error(normalizeSupabaseError(insertCircleError, "Failed to insert into circles."));
      }

      const insertedCircle = Array.isArray(insertedRows) ? insertedRows[0] : null;
      if (!insertedCircle?.id) {
        throw new Error("Circle was inserted, but the new row could not be returned.");
      }

      const inviteRows = selectedPeople.map((person) => ({
        circle_id: insertedCircle.id,
        user_id: sessionUser.id,
        contact_id: person.id || null,
        invite_name: person.name || null,
        invite_email: String(person.email || "").trim().toLowerCase(),
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
            normalizeSupabaseError(inviteError, "Circle created but invite insert failed.")
          );
        }

        insertedInvites = inviteData || [];
      }

      const currentUserName =
        getGoogleName(profile || {}) ||
        profile?.full_name ||
        profile?.invite_name ||
        "You";

      const mappedCircle = buildCircleViewModel(insertedCircle, insertedInvites, currentUserName);
      setRealCircles((prev) => [mappedCircle, ...prev]);
      setCircleSuccess("Circle created successfully.");
      setIsCreateOpen(false);
      initialiseCircleForm(profile, mergedCalendarEvents);
    } catch (error) {
      setCircleError(error?.message || "Failed to create circle.");
    } finally {
      setIsCreatingCircle(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fffaf7] text-slate-800">
      <div className="mx-auto max-w-[1380px] px-5 py-8 md:px-8">
        {pageError || contactError || circleError || circleSuccess ? (
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
                        No contacts added yet.
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={openAddContactModal}
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
                      Create a circle around an event, invite people, choose a hint or paste a product link, and keep the pot warm and flexible.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      initialiseCircleForm(profile, mergedCalendarEvents);
                      setIsCreateOpen(true);
                    }}
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
                        formatCurrency={formatCurrency}
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
          initialiseCircleForm(profile, mergedCalendarEvents);
        }}
        onSubmit={handleCreateCircle}
        contacts={contacts}
        calendarEvents={mergedCalendarEvents}
        selectedPeople={selectedPeople}
        setSelectedPeople={setSelectedPeople}
        eventMode={eventMode}
        setEventMode={setEventMode}
        selectedEventId={selectedEventId}
        setSelectedEventId={setSelectedEventId}
        form={form}
        setForm={setForm}
        linkPreview={linkPreview}
        setLinkPreview={setLinkPreview}
        isFetchingPreview={isFetchingPreview}
        handleFetchPreview={handleFetchPreview}
        selectedHintOwnerId={selectedHintOwnerId}
        setSelectedHintOwnerId={setSelectedHintOwnerId}
        errorMessage={circleError}
        isSubmitting={isCreatingCircle}
        ownHints={ownHints}
        publicHintsByContact={publicHintsByContact}
        selfProfile={profile}
        formatCurrency={formatCurrency}
      />

      <AddContactModal
        key={addContactModalKey}
        modalKey={addContactModalKey}
        open={isAddContactOpen}
        onClose={closeAddContactModal}
        onSave={handleSaveContact}
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
