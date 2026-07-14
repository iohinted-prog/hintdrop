"use client";
import ContactCard from "../components/ContactCard";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { createClient } from "../../lib/supabase/client";
import AvatarMenu from "../components/AvatarMenu";
import AddContactModal from "../components/AddContactModal";
import EditContactModal from "../components/EditContactModal";
import ContactsManagerModal from "../components/ContactsManagerModal";
import { useCurrencyFormatter } from "../../lib/useCurrencyFormatter";

const ESTIMATED_STRIPE_FEE_RATE = 0.0175;
const HINTED_PLATFORM_FEE_RATE = 0.02;
const HINTED_PLATFORM_FIXED_FEE = 1.50;
const SELF_SELECTOR_ID = "__self__";
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const currencyOptions = [
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar" },
  { code: "NZD", symbol: "NZ$", label: "New Zealand Dollar" },
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
    recommendedContribution: 61.2,
    note: "Example only.",
    fundingMode: "Flexible pot",
    deadline: "2026-07-01",
    goalType: "item",
  },
};

function toMinorUnits(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100);
}

function fromMinorUnits(value) {
  return Number(value || 0) / 100;
}

function roundCurrency(value) {
  return fromMinorUnits(toMinorUnits(value));
}

function roundCurrencyUp(value) {
  return Math.ceil((Number(value || 0) - Number.EPSILON) * 100) / 100;
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
  const normalized = String(status || "").toLowerCase();

  if (normalized === "accepted" || normalized === "user" || normalized === "member") {
    return "accepted";
  }

  if (normalized === "invitee" || normalized === "invited" || normalized === "pending") {
    return "invitee";
  }

  return "contact";
}

function getStatusLabel(status) {
  const avatarState = getAvatarState(status);
  if (avatarState === "accepted") return "Accepted";
  if (avatarState === "invitee") return "Invitee";
  return "Contact";
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

  if (avatarState === "invitee") {
    return `flex items-center justify-center rounded-full border-2 border-dashed border-[#dfb39d] bg-[#fff5ef] ${sizeClasses} font-bold text-[#c87150]`;
  }

  return `flex items-center justify-center rounded-full border border-[#e8ddd6] bg-[#faf7f4] ${sizeClasses} font-bold text-slate-600`;
}

function relationshipLabelFromArray(relationshipTypes) {
  if (!Array.isArray(relationshipTypes) || relationshipTypes.length === 0) return "Friend";
  return relationshipTypes[0] || "Friend";
}

function calculateFeeBreakdown(baseAmount) {
  const safeBaseAmountMinor = toMinorUnits(baseAmount);
  const stripeFeeMinor = Math.ceil(safeBaseAmountMinor * ESTIMATED_STRIPE_FEE_RATE);
  const platformFeeMinor = Math.ceil(safeBaseAmountMinor * HINTED_PLATFORM_FEE_RATE) + toMinorUnits(HINTED_PLATFORM_FIXED_FEE);
  const totalFeeMinor = stripeFeeMinor + platformFeeMinor;
  const totalAmountMinor = safeBaseAmountMinor + totalFeeMinor;

  return {
    itemAmount: fromMinorUnits(safeBaseAmountMinor),
    stripeFeeAmount: fromMinorUnits(stripeFeeMinor),
    platformFeeAmount: fromMinorUnits(platformFeeMinor),
    feeAmount: fromMinorUnits(totalFeeMinor),
    totalAmount: fromMinorUnits(totalAmountMinor),
  };
}

function calculateCircleTotals(itemAmount) {
  return calculateFeeBreakdown(itemAmount);
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
  const publicState = row?.public_state || row?.status;
  const avatarState = getAvatarState(publicState);

  return {
    id: row.contact_id || row.id,
    type: "contact",
    profileConnectionId: row.contact_id || row.id,
    matchedProfileId: row?.profile_id || row?.matched_profile_id || null,
    hasHintedAccount:
      avatarState === "accepted" || Boolean(row?.profile_id || row?.matched_profile_id),
    name: safeName,
    role: relationship || "Friend",
    note: getStatusLabel(publicState),
    initials: getInitials(safeName),
    colors: getRelationshipGradient(relationship || "Friend"),
    email: row?.email || "",
    phone: row?.phone || "",
    birthday: row?.birthday || "",
    avatarUrl: row?.avatar_url || null,
    status: avatarState,
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

function buildCircleViewModel(circleRow, inviteRows = [], currentUserName = "You", ownerAvatar = null, ownerUserId = null) {
  const members = [
    {
      name: currentUserName || "You",
      initials: getInitials(currentUserName || "You"),
      contributed: false,
      amount: 0,
      colors: "from-[#4e596d] to-[#212a3c]",
      status: "accepted",
      email: "__self__",
      avatarUrl: ownerAvatar,
      userId: ownerUserId,
    },
    ...inviteRows.map((invite) => ({
      name: invite.invite_name || invite.invite_email || "Invited person",
      initials: getInitials(invite.invite_name || invite.invite_email || "Invited person"),
      contributed: false,
      amount: 0,
      colors: getRelationshipGradient(invite.invite_name || "Friend"),
      status: getAvatarState(invite.status),
      email: invite.invite_email_normalized || invite.invite_email || "",
      userId: invite.invited_user_id || invite.matched_profile_id || null,
    })),
  ];

  const totalTarget = Number(circleRow.item_price_amount || circleRow.item_target_amount || circleRow.total_target_amount || 0);
  const fullItemTitle = circleRow.item_title || "Shared gift";
  const peopleInPotCount = Math.max(members.length, 1);
  const recommendedContribution =
    totalTarget > 0 ? roundCurrencyUp(totalTarget / peopleInPotCount) : 0;

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
      recommendedContribution,
      note:
        circleRow.funding_mode === "all_or_nothing"
          ? "This circle will only proceed if the full target is reached by the deadline. The total already includes payment processing and our platform fee, and once the pot is filled the organiser receives the funds to make the purchase."
          : circleRow.funding_mode === "organiser_covers"
            ? "If the full target is not reached, the organiser can choose to cover the gap. The total already includes payment processing and our platform fee, and once the pot is filled the organiser receives the funds to make the purchase."
            : "Anyone invited can contribute flexibly. The total already includes payment processing and our platform fee, and once the pot is filled the organiser receives the funds to make the purchase.",
      fundingMode: fundingModeToLabel(circleRow.funding_mode),
      deadline: circleRow.deadline_at || circleRow.event_date || "",
      goalType:
        circleRow.item_title && circleRow.item_title !== "Shared contribution pot" ? "item" : "amount",
    },
    raw: circleRow,
    invites: inviteRows,
  };
}

function buildContributionMap(rows = []) {
  return rows.reduce((acc, row) => {
    const circleId = row.circle_id;
    if (!circleId) return acc;

    if (!acc[circleId]) {
      acc[circleId] = {
        raised: 0,
        count: 0,
        byUserId: {},
      };
    }

    const amount = Number(row.amount || 0);
    const isPaid = String(row.payment_status || "").toLowerCase() === "paid";

    if (isPaid) {
      acc[circleId].raised = roundCurrency(acc[circleId].raised + amount);
      acc[circleId].count += 1;

      if (row.user_id) {
        acc[circleId].byUserId[row.user_id] = roundCurrency(
          (acc[circleId].byUserId[row.user_id] || 0) + amount
        );
      }
    }

    return acc;
  }, {});
}

function applyContributionDataToCircle(circleVm, contributionState, currentUserId, currentUserName) {
  const safeState = contributionState || { raised: 0, byUserId: {} };
  const paidByUserId = safeState.byUserId || {};
  const raised = roundCurrency(safeState.raised || 0);

  const members = Array.isArray(circleVm.members)
    ? circleVm.members.map((member) => {
        if (member.name === currentUserName || member.name === "You") {
          const myAmount = roundCurrency(paidByUserId[currentUserId] || 0);
          return {
            ...member,
            contributed: myAmount > 0,
            amount: myAmount,
          };
        }
        return member;
      })
    : [];

  return {
    ...circleVm,
    members,
    pot: {
      ...circleVm.pot,
      raised,
    },
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

function buildContactBirthdayEvents(contacts) {
  const now = new Date();
  const rows = [];
  for (const contact of (contacts || [])) {
    if (!contact.birthday) continue;
    const bday = new Date(contact.birthday);
    if (isNaN(bday.getTime())) continue;
    const month = bday.getMonth();
    const day = bday.getDate();
    // Generate for this year and next year, pick the next upcoming one
    for (let y = now.getFullYear(); y <= now.getFullYear() + 1; y++) {
      const date = new Date(Date.UTC(y, month, day));
      if (date >= now) {
        rows.push({
          id: `birthday-${contact.id}-${y}`,
          title: `${contact.name || "Contact"}'s Birthday`,
          event_date: date.toISOString().slice(0, 10),
          type: "Birthday",
          source: "contact",
          profile_id: contact.profileId || null,
        });
        break; // only add next upcoming occurrence
      }
    }
  }
  return rows;
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
  useEffect(() => {
    if (!open) return undefined;

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(42,26,20,0.38)] px-4 py-4 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center">
        <div
          className={`flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-[34px] border border-[#eddacf] bg-[#fffaf7] shadow-[0_24px_80px_rgba(88,46,31,0.22)] ${maxWidth}`}
        >
          <div
            className={`flex shrink-0 items-center justify-between px-6 py-5 ${
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

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}



const MEMBER_COLORS = [
  "#ff8060", "#4e9e6e", "#5b8dd9", "#c97ad4", "#e8a23a",
  "#e05c7a", "#4db8b0", "#9b7fd4", "#d4875c", "#5c9e8a",
];

function ContributionChart({ members, target, raised, currency, formatCurrency }) {
  const contributed = members.filter(m => m.contributed && m.amount > 0);
  const unraised = Math.max(0, target - raised);
  const total = target || raised || 1;

  // Build segments
  const segments = [
    ...contributed.map((m, i) => ({
      name: m.name,
      amount: m.amount,
      color: MEMBER_COLORS[i % MEMBER_COLORS.length],
      pct: (m.amount / total) * 100,
    })),
    ...(unraised > 0 ? [{ name: "Remaining", amount: unraised, color: "#f1e3db", pct: (unraised / total) * 100 }] : []),
  ];

  // Build SVG donut
  const cx = 60, cy = 60, r = 50, stroke = 18;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const paths = segments.map((seg, i) => {
    const dash = (seg.pct / 100) * circ;
    const gap = circ - dash;
    const path = (
      `<circle key="${i}" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="${stroke}" stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${-offset}" />`
    );
    offset += dash;
    return { ...seg, dash, gap, offset: offset - dash };
  });

  return (
    <div className="mt-5 w-full">
      <div className="flex items-center gap-5">
        <div className="shrink-0">
          <svg viewBox="0 0 120 120" width="160" height="160" style={{transform: "rotate(-90deg)"}}>
            {segments.map((seg, i) => {
              const dash = (seg.pct / 100) * circ;
              const segOffset = segments.slice(0, i).reduce((a, s) => a + (s.pct / 100) * circ, 0);
              return (
                <circle
                  key={i}
                  cx={cx} cy={cy} r={r}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${dash} ${circ - dash}`}
                  strokeDashoffset={-segOffset}
                />
              );
            })}
            <text x="60" y="56" textAnchor="middle" dominantBaseline="middle"
              style={{transform: "rotate(90deg) translate(0, -120px)", fontSize: "14px", fontWeight: "600", fill: "#1e293b"}}>
              {Math.round((raised / total) * 100)}%
            </text>
            <text x="60" y="70" textAnchor="middle" dominantBaseline="middle"
              style={{transform: "rotate(90deg) translate(0, -120px)", fontSize: "9px", fill: "#94a3b8"}}>
              funded
            </text>
          </svg>
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          {contributed.map((seg, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{background: MEMBER_COLORS[i % MEMBER_COLORS.length]}} />
              <span className="text-xs font-medium text-slate-700 truncate flex-1">{seg.name}</span>
              <span className="text-xs font-semibold text-slate-900 shrink-0">{formatCurrency(seg.amount, currency)}</span>
            </div>
          ))}
          {contributed.length === 0 && (
            <p className="text-xs text-slate-400">No contributions yet</p>
          )}
          {unraised > 0 && (
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full shrink-0 bg-[#f1e3db]" />
              <span className="text-xs text-slate-400 flex-1">Remaining</span>
              <span className="text-xs font-semibold text-slate-400">{formatCurrency(unraised, currency)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MemberPill({ member, currency = "GBP", formatCurrency }) {
  const avatarState = getAvatarState(member.status);
  const isAccepted = avatarState === "accepted";
  const isInvitee = avatarState === "invitee";
  const avatarUrl = member.avatarUrl || null;

  const statusStyles = isAccepted
    ? member.contributed
      ? "bg-[#edf6eb] text-[#4a7a3a]"
      : "bg-[#eef4ff] text-[#5676b3]"
    : isInvitee
      ? "bg-[#fff3ee] text-[#d57a58]"
      : "bg-[#f3f4f6] text-slate-600";

  const statusLabel = isAccepted ? "Accepted" : isInvitee ? "Invitee" : "Contact";

  return (
    <div className="rounded-[20px] border border-[#eee1d9] bg-[#fffdfa] p-3">
      <div className="flex items-center gap-3">
        {avatarUrl ? (
          <img src={avatarUrl} alt={member.name} className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className={getAvatarClasses(member.colors, member.status)}>
            {member.initials}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{member.name}</p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles}`}
            >
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
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-[180px] w-[180px] items-center justify-center">
        <svg className="h-[180px] w-[180px] -rotate-90" viewBox="0 0 160 160" aria-hidden="true">
          <circle cx="80" cy="80" r={radius} stroke="#f1e3db" strokeWidth="12" fill="none" />
          <circle
            cx="80"
            cy="80"
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
          <span className="text-[32px] font-semibold tracking-[-0.06em] text-slate-900">
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
      text: "Anyone invited can join and contribute what they want. Once the full target is reached, the organiser receives the funds to complete the purchase.",
      colors: "bg-[#edf6eb] text-[#4a7a3a]",
    },
    {
      title: "All-or-nothing",
      text: "The circle only goes ahead if the full target is reached by the deadline. Once it is filled, the organiser receives the funds to complete the purchase.",
      colors: "bg-[#fff3ee] text-[#d57a58]",
    },
    {
      title: "Organizer covers gap",
      text: "The organiser can choose to top up the missing amount. Once the full target is reached, the organiser receives the funds to complete the purchase.",
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

      <div className="mt-3 rounded-[20px] border border-[#f2e1d8] bg-[#fff8f4] p-4">
        <p className="text-[13px] leading-6 text-slate-600">
          When a pot reaches its full target, the organiser receives the funds to make the purchase for the group. That target already includes payment processing and our platform fee.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {potTypes.map((type) => (
          <div key={type.title} className="rounded-[20px] bg-[#faf7f4] p-4">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${type.colors}`}
            >
              {type.title}
            </span>
            <p className="mt-3 text-[13px] leading-6 text-slate-600">{type.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PotTypeSummary() {
  const [open, setOpen] = useState(false);
  const types = [
    { label: "Flexible pot", color: "bg-[#edf6eb] text-[#4a7a3a]", text: "Anyone can contribute what they want. Funds release when the target is reached." },
    { label: "All-or-nothing", color: "bg-[#fff3ee] text-[#d57a58]", text: "Only goes ahead if the full target is met by the deadline. Otherwise everyone is refunded." },
    { label: "Organiser covers gap", color: "bg-[#eef4ff] text-[#5676b3]", text: "The organiser tops up any shortfall. The gift happens regardless." },
  ];
  return (
    <div className="mt-4">
      <button type="button" onClick={() => setOpen(p => !p)}
        className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#df7b59] hover:text-[#b14f43] transition">
        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#f0a384] text-[11px]">?</span>
        How do pot types work?
        <span className="text-[10px]">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-3 rounded-[20px] border border-[#f0dfd6] bg-[#fffaf7] p-4 space-y-3">
          <p className="text-[12px] text-slate-500">When a pot reaches its target, the organiser receives the funds to make the purchase. The target already includes our platform fee.</p>
          {types.map(t => (
            <div key={t.label} className="flex items-start gap-3">
              <span className={`mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${t.color}`}>{t.label}</span>
              <p className="text-[13px] text-slate-600 leading-6">{t.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CircleCard({
  circle,
  onDeleteCircleClick,
  deletingCircleId,
  formatCurrency,
  onContributeClick,
  sessionUser,
  contacts = [],
  onOpenProfile,
}) {
  const [showAllMembers, setShowAllMembers] = useState(false);
  const MAX_VISIBLE = 4;

  const safeMembers = (Array.isArray(circle?.members) ? circle.members : []).map((member) => {
    if (member.avatarUrl) return member;
    const matched = contacts.find((c) => c.email && member.email && c.email.toLowerCase() === member.email.toLowerCase());
    return matched?.avatarUrl ? { ...member, avatarUrl: matched.avatarUrl } : member;
  });

  const joinedCount = safeMembers.filter(m => getAvatarState(m.status) === "accepted").length;
  const invitedCount = safeMembers.length;
  const potCurrency = circle?.pot?.currency || "GBP";
  const moneyLabel = formatCurrency(circle?.pot?.target, potCurrency);
  const raisedLabel = formatCurrency(circle?.pot?.raised, potCurrency);
  const showItemPreview = circle?.pot?.active && circle?.pot?.goalType === "item" && (circle?.pot?.previewImage || circle?.pot?.sourceUrl);
  const overflowCount = safeMembers.length - MAX_VISIBLE;

  const daysLeft = circle?.pot?.deadline
    ? Math.ceil((new Date(circle.pot.deadline) - new Date()) / (1000 * 60 * 60 * 24))
    : null;
  const deadlineUrgent = daysLeft !== null && daysLeft <= 3;
  const deadlineWarning = daysLeft !== null && daysLeft <= 7;

  return (
    <article className="rounded-[30px] border border-[#f0dfd6] bg-white p-5 shadow-sm sm:p-6">
      {showAllMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(42,26,20,0.38)] px-4 backdrop-blur-sm" onClick={() => setShowAllMembers(false)}>
          <div className="w-full max-w-[480px] rounded-[28px] border border-[#efdcd2] bg-[#fffaf7] shadow-[0_24px_80px_rgba(88,46,31,0.22)] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#efe0d7]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#df7b59]">Circle</p>
                <h3 className="mt-1 text-[20px] font-semibold text-slate-900">All members</h3>
              </div>
              <button type="button" onClick={() => setShowAllMembers(false)} className="h-9 w-9 flex items-center justify-center rounded-full border border-[#eaded6] text-slate-500 hover:bg-slate-50">✕</button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
              {safeMembers.map((member, i) => {
                const isAccepted = getAvatarState(member.status) === "accepted";
                const isInvitee = getAvatarState(member.status) === "invitee";
                const clickable = Boolean(member.userId && onOpenProfile);
                return (
                  <div key={i}
                    className={`flex items-center gap-3 rounded-[16px] border border-[#f0e4dd] bg-white px-4 py-3 ${clickable ? "cursor-pointer hover:border-[#e8c9bc] transition-colors" : ""}`}
                    onClick={clickable ? () => { setShowAllMembers(false); onOpenProfile({ userId: member.userId, name: member.name, avatarUrl: member.avatarUrl, initials: member.initials }); } : undefined}
                  >
                    <div className={`h-9 w-9 shrink-0 rounded-full overflow-hidden flex items-center justify-center ${member.avatarUrl ? "" : `bg-gradient-to-b ${member.colors || "from-[#efcdbf] to-[#bb8168]"}`}`}>
                      {member.avatarUrl ? <img src={member.avatarUrl} className="h-9 w-9 object-cover" alt="" /> : <span className="text-[11px] font-bold text-white">{member.initials}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{member.name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {member.contributed && member.amount > 0 && (
                        <span className="text-xs font-semibold text-[#4a7a3a]">{formatCurrency(member.amount, potCurrency)}</span>
                      )}
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${member.contributed ? "bg-[#edf6eb] text-[#4a7a3a]" : isAccepted ? "bg-[#eef4ff] text-[#5676b3]" : isInvitee ? "bg-[#fff3ee] text-[#d57a58]" : "bg-[#f3f4f6] text-slate-500"}`}>
                        {member.contributed ? "Paid" : isAccepted ? "Joined" : isInvitee ? "Invited" : "Pending"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {/* LEFT — info, members, chart, deadline */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Circle</p>
              <h2 className="mt-1 text-[26px] font-semibold tracking-[-0.05em] text-slate-900">{circle?.name || "Untitled circle"}</h2>
              <p className="mt-1 text-sm text-slate-500">{circle?.subtitle || "No subtitle"}</p>
            </div>
            <div className="rounded-full bg-[#fff4ee] px-3 py-1 text-[11px] font-semibold text-[#df7b59]">
              {joinedCount} of {invitedCount} accepted
            </div>
          </div>

          {/* Member list */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">Members</p>
            {safeMembers.slice(0, MAX_VISIBLE).map((member, i) => {
              const isAccepted = getAvatarState(member.status) === "accepted";
              const isInvitee = getAvatarState(member.status) === "invitee";
              const clickable = Boolean(member.userId && onOpenProfile);
              return (
                <div key={i}
                  className={`flex items-center gap-3 rounded-[14px] border border-[#f0e4dd] bg-white px-3 py-2.5 ${clickable ? "cursor-pointer hover:border-[#e8c9bc] transition-colors" : ""}`}
                  onClick={clickable ? () => onOpenProfile({ userId: member.userId, name: member.name, avatarUrl: member.avatarUrl, initials: member.initials }) : undefined}
                >
                  <div className={`h-8 w-8 shrink-0 rounded-full overflow-hidden flex items-center justify-center ${member.avatarUrl ? "" : `bg-gradient-to-b ${member.colors || "from-[#efcdbf] to-[#bb8168]"}`}`}>
                    {member.avatarUrl ? <img src={member.avatarUrl} className="h-8 w-8 object-cover" alt="" /> : <span className="text-[11px] font-bold text-white">{member.initials}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{member.name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {member.contributed && member.amount > 0 && (
                      <span className="text-xs font-semibold text-[#4a7a3a]">{formatCurrency(member.amount, potCurrency)}</span>
                    )}
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${member.contributed ? "bg-[#edf6eb] text-[#4a7a3a]" : isAccepted ? "bg-[#eef4ff] text-[#5676b3]" : isInvitee ? "bg-[#fff3ee] text-[#d57a58]" : "bg-[#f3f4f6] text-slate-500"}`}>
                      {member.contributed ? "Paid" : isAccepted ? "Joined" : isInvitee ? "Invited" : "Pending"}
                    </span>
                  </div>
                </div>
              );
            })}
            {overflowCount > 0 && (
              <button type="button" onClick={() => setShowAllMembers(true)}
                className="w-full rounded-[14px] border border-dashed border-[#e8c9bc] bg-[#fff8f5] py-2 text-[12px] font-semibold text-[#df7b59] hover:bg-[#fff0ea] transition-colors">
                +{overflowCount} more — view all
              </button>
            )}
          </div>

          {/* Contribution chart */}
          {circle?.pot?.active && (
            <ContributionChart
              members={safeMembers}
              target={circle?.pot?.target || 0}
              raised={circle?.pot?.raised || 0}
              currency={potCurrency}
              formatCurrency={formatCurrency}
            />
          )}

          {/* Deadline */}
          {daysLeft !== null && (
            <div className={`rounded-[16px] px-4 py-3 flex items-center justify-between ${deadlineUrgent ? "bg-[#fff1f0] border border-[#fcc]" : deadlineWarning ? "bg-[#fff8ee] border border-[#fde8b0]" : "bg-[#f7fbf5] border border-[#dce8d8]"}`}>
              <div>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.1em] ${deadlineUrgent ? "text-[#b14f43]" : deadlineWarning ? "text-[#b07a30]" : "text-[#4e684d]"}`}>Deadline</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{formatDateLabel(circle.pot.deadline)}</p>
              </div>
              <span className={`text-2xl font-bold ${deadlineUrgent ? "text-[#b14f43]" : deadlineWarning ? "text-[#b07a30]" : "text-[#4e684d]"}`}>
                {daysLeft <= 0 ? "Today!" : `${daysLeft}d`}
              </span>
            </div>
          )}

          {/* Action buttons */}
          {circle?.id !== "example-circle" && (
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => onContributeClick(circle)}
                className="inline-flex h-10 items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-4 text-sm font-semibold text-white shadow-lg">
                Contribute
              </button>
              {circle?.raw?.user_id === sessionUser?.id && (
                <button type="button" onClick={() => onDeleteCircleClick(circle)} disabled={deletingCircleId === circle.id}
                  className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold ${deletingCircleId === circle.id ? "cursor-not-allowed bg-[#f3d6d1] text-[#b14f43]" : "border border-[#efc0ba] bg-[#fff4f2] text-[#b14f43] hover:bg-[#ffe9e5]"}`}>
                  {deletingCircleId === circle.id ? "Deleting..." : "Delete circle"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* RIGHT — pot image, title, price only */}
        <div className="rounded-[30px] border border-[#eedfd6] bg-[radial-gradient(circle_at_top,_#fff7f2,_#fffdfa_62%)] p-5">
          <div className="flex flex-col items-center text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Shared pot</p>
            <h3 className="mt-1 text-[22px] font-semibold tracking-[-0.04em] text-slate-900">
              {circle?.pot?.active ? circle.pot.item : "No pot created yet"}
            </h3>
            <p className="mt-2 max-w-[28ch] text-[13px] leading-6 text-slate-500">
              {circle?.pot?.active ? circle?.pot?.source : circle?.pot?.note}
            </p>
            {circle?.pot?.active && (
              <>
                {(() => {
                  const acceptedCount = Math.max(safeMembers.filter(m => getAvatarState(m.status) === "accepted").length, 1);
                  const itemPrice = circle?.pot?.target || 0;
                  const hintdropFee = 1.50 / acceptedCount + (itemPrice / acceptedCount) * 0.02;
                  const perPerson = roundCurrency(itemPrice / acceptedCount + hintdropFee);
                  return (
                    <>
                      <p className="mt-4 text-2xl font-bold text-slate-900">{formatCurrency(perPerson, potCurrency)}</p>
                      <p className="text-sm text-slate-500">per person · {acceptedCount} {acceptedCount === 1 ? "contributor" : "contributors"}</p>
                      <p className="text-[11px] text-slate-400 mt-1">+Stripe fee at payment · inc. HintDrop fee</p>
                    </>
                  );
                })()}
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <span className="rounded-full bg-[#fff4ee] px-3 py-1 text-[11px] font-semibold text-[#df7b59]">{circle?.pot?.fundingMode}</span>
                  <span className="rounded-full bg-[#edf3ff] px-3 py-1 text-[11px] font-semibold text-slate-600">{potCurrency}</span>
                </div>
                {showItemPreview && (
                  <div className="mt-5 w-full min-w-0 text-left">
                    <PotPreviewCard
                      image={circle?.pot?.previewImage}
                      title={circle?.pot?.fullItemTitle || circle?.pot?.item}
                      url={circle?.pot?.sourceUrl}
                      compact
                    />
                  </div>
                )}
                <p className="mt-4 text-[13px] leading-6 text-slate-500">{circle?.pot?.note}</p>
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
      <input
        type="text"
        inputMode="decimal"
        value={amount}
        onChange={(e) => onAmountChange(e.target.value)}
        placeholder="220"
        className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
      />
    </div>
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

function CirclePaymentForm({
  circle,
  amount,
  setAmount,
  onClose,
  onSuccess,
  setInlineError,
  formatCurrency,
}) {
  const stripe = useStripe();
  const elements = useElements();

  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!stripe || !elements) return;

    setSubmitting(true);
    setInlineError("");

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setInlineError(submitError.message || "Please check your payment details.");
      setSubmitting(false);
      return;
    }

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/circles?paid=1&circle=${circle.id}`,
      },
      redirect: "if_required",
    });

    if (result.error) {
      setInlineError(result.error.message || "Payment failed.");
      setSubmitting(false);
      return;
    }

    if (
      result.paymentIntent?.status === "succeeded" ||
      result.paymentIntent?.status === "processing"
    ) {
      await onSuccess();
      return;
    }

    setInlineError("Payment did not complete.");
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-[22px] border border-[#eedfd6] bg-[#fffdfa] p-4">
        <label className="block">
          <span className="block text-sm font-medium text-slate-900">Contribution amount</span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="25"
            className="mt-2 h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
          />
        </label>

        <p className="mt-2 text-[12px] leading-5 text-slate-500">
          Target: {formatCurrency(circle?.pot?.target || 0, circle?.pot?.currency || "GBP")} · Raised so far:{" "}
          {formatCurrency(circle?.pot?.raised || 0, circle?.pot?.currency || "GBP")}
        </p>
      </div>

      <div className="rounded-[24px] border border-[#ead8ce] bg-white p-4">
        <PaymentElement onReady={() => setReady(true)} />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={!stripe || !elements || !ready || submitting}
          className="inline-flex h-[48px] items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-6 text-sm font-semibold text-white shadow-lg disabled:opacity-70"
        >
          {submitting ? "Processing..." : "Confirm contribution"}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-[48px] items-center justify-center rounded-full border border-[#ead8ce] bg-white px-6 text-sm font-medium text-slate-700 hover:bg-[#fff5f0]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function ContributeModal({
  open,
  onClose,
  circle,
  refreshCircles,
  formatCurrency,
}) {
  const supabase = createClient();

  const [amount, setAmount] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [inlineError, setInlineError] = useState("");

  const livePeopleInPotCount = Math.max(circle?.members?.filter(m => m.status === "accepted")?.length || 1, 1);
  const itemPrice = Number(circle?.pot?.target || 0);
  const hintdropFeePerPerson = roundCurrency(1.50 / livePeopleInPotCount + (itemPrice / livePeopleInPotCount) * 0.02);
  const liveRecommendedContribution = roundCurrencyUp(itemPrice / livePeopleInPotCount + hintdropFeePerPerson);
  const stripeFeeOnContribution = roundCurrency(liveRecommendedContribution * 0.015 + 0.20);
  const totalChargedToCard = roundCurrency(liveRecommendedContribution + stripeFeeOnContribution);

  useEffect(() => {
    if (!open || !circle) {
      setAmount("");
      setClientSecret("");
      setInlineError("");
      return;
    }

    const peopleInPotCount = Math.max(circle?.members?.length || 0, 1);
    const rawSuggestedContribution =
      Number(circle?.pot?.target || 0) / peopleInPotCount;
    const suggestedContribution = roundCurrencyUp(rawSuggestedContribution);

    setAmount(suggestedContribution > 0 ? String(suggestedContribution) : "");
    setClientSecret("");
    setInlineError("");
  }, [open, circle]);

  async function prepareIntent() {
    try {
      setLoadingIntent(true);
      setInlineError("");

      const parsedAmount = parseAmount(amount);
      if (parsedAmount <= 0) {
        throw new Error("Enter a contribution amount greater than 0.");
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("You must be signed in to contribute.");
      }

      const response = await fetch("/api/circles/payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          circleId: circle.id,
          amount: parsedAmount,
          currency: circle?.pot?.currency || "GBP",
        }),
      });

      const rawText = await response.text();
      let data = null;

      if (rawText) {
        try {
          data = JSON.parse(rawText);
        } catch {
          throw new Error("Payment API returned an invalid response.");
        }
      }

      if (!response.ok) {
        throw new Error(data?.error || "Failed to start payment.");
      }

      if (!data?.clientSecret) {
        throw new Error("Missing Stripe client secret.");
      }

      setClientSecret(data.clientSecret);
    } catch (error) {
      setInlineError(error?.message || "Failed to start payment.");
    } finally {
      setLoadingIntent(false);
    }
  }

  async function handleSuccess() {
    await refreshCircles();
    onClose();
  }

  if (!open || !circle) return null;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      eyebrow="Contribute"
      title={`Contribute to ${circle.name}`}
      maxWidth="max-w-[720px]"
    >
      <div className="space-y-5 p-6">
        <div className="rounded-[22px] border border-[#eedfd6] bg-[#fffdfa] p-4">
          <p className="text-sm font-semibold text-slate-900">{circle?.pot?.fullItemTitle || circle?.pot?.item}</p>
          <p className="mt-2 text-[13px] leading-6 text-slate-500">
            Funding mode: {circle?.pot?.fundingMode} · Deadline {formatDateLabel(circle?.pot?.deadline)}
          </p>
        </div>

        {!clientSecret ? (
          <>
            <div className="rounded-[22px] border border-[#eedfd6] bg-white p-4">
              <label className="block">
                <span className="block text-sm font-medium text-slate-900">Contribution amount</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="25"
                  className="mt-2 h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
                />
              </label>

              <div className="mt-3 rounded-[14px] bg-[#fff4ee] px-3 py-2.5 space-y-1.5">
                <div className="flex justify-between text-[12px]">
                  <span className="text-slate-500">Your share ({livePeopleInPotCount} {livePeopleInPotCount === 1 ? "contributor" : "contributors"})</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(liveRecommendedContribution, circle?.pot?.currency || "GBP")}</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-slate-400">Stripe processing fee</span>
                  <span className="text-slate-500">{formatCurrency(stripeFeeOnContribution, circle?.pot?.currency || "GBP")}</span>
                </div>
                <div className="flex justify-between text-[12px] border-t border-[#f0dfd6] pt-1.5">
                  <span className="font-semibold text-slate-700">Total charged to your card</span>
                  <span className="font-bold text-slate-900">{formatCurrency(totalChargedToCard, circle?.pot?.currency || "GBP")}</span>
                </div>
              </div>
            </div>

            {inlineError ? (
              <div className="rounded-[18px] border border-[#efc0ba] bg-[#fff4f2] px-4 py-3 text-sm text-[#b14f43]">
                {inlineError}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={prepareIntent}
                disabled={loadingIntent}
                className="inline-flex h-[48px] items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-6 text-sm font-semibold text-white shadow-lg disabled:opacity-70"
              >
                {loadingIntent ? "Preparing..." : "Continue to payment"}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-[48px] items-center justify-center rounded-full border border-[#ead8ce] bg-white px-6 text-sm font-medium text-slate-700 hover:bg-[#fff5f0]"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: { theme: "stripe" },
            }}
          >
            <CirclePaymentForm
              circle={circle}
              amount={amount}
              setAmount={setAmount}
              onClose={onClose}
              onSuccess={handleSuccess}
              setInlineError={setInlineError}
              formatCurrency={formatCurrency}
            />
            {inlineError ? (
              <div className="mt-4 rounded-[18px] border border-[#efc0ba] bg-[#fff4f2] px-4 py-3 text-sm text-[#b14f43]">
                {inlineError}
              </div>
            ) : null}
          </Elements>
        )}
      </div>
    </ModalShell>
  );
}

function CreateCircleModal({
  open, onClose, onSubmit, contacts, calendarEvents,
  selectedPeople, setSelectedPeople, eventMode, setEventMode,
  selectedEventId, setSelectedEventId, form, setForm,
  linkPreview, setLinkPreview, isFetchingPreview, handleFetchPreview,
  selectedHintOwnerId, setSelectedHintOwnerId, errorMessage, isSubmitting,
  ownHints, publicHintsByContact, selfProfile, formatCurrency,
}) {
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 5;

  if (!open) return null;

  const safeCalendarEvents = Array.isArray(calendarEvents) ? calendarEvents : [];
  const ownerOptions = [buildSelfRecord(selfProfile), ...contacts];
  const selectedOwner = ownerOptions.find(o => String(o.id) === String(selectedHintOwnerId)) || null;
  const visibleHints = String(selectedHintOwnerId) === SELF_SELECTOR_ID
    ? ownHints
    : publicHintsByContact?.[selectedHintOwnerId] || [];

  const liveBaseAmount = parseAmount(form.goalValue);
  const liveTotals = calculateCircleTotals(liveBaseAmount);
  const totalPeopleCount = Math.max((selectedPeople?.length || 0) + 1, 1);
  const recommendedPerPerson = roundCurrencyUp(liveTotals.totalAmount / totalPeopleCount);

  function handleSelectHint(hint) {
    const hintAmount = extractHintAmount(hint);
    const detectedCurrency = String(hint?.currency || '').trim().toUpperCase() || form.currency || 'GBP';
    setForm(prev => ({ ...prev, selectedHintId: hint.id, goalValue: hintAmount > 0 ? String(hintAmount) : '', currency: detectedCurrency }));
    setLinkPreview({ title: hint?.title || 'Shared item', description: hint?.retailer || '', image: hint?.image_url || '', url: hint?.url || '', currency: detectedCurrency });
  }

  function canNext() {
    if (step === 1) return eventMode === 'new' ? !!form.eventDate : !!selectedEventId;
    if (step === 2) return !!form.title?.trim() && !!form.deadline;
    if (step === 3) return parseAmount(form.goalValue) >= 10;
    if (step === 4) return true;
    return true;
  }

  const stepLabels = ['Event', 'Details', 'Gift', 'People', 'Review'];

  return (
    <ModalShell open={open} onClose={() => { setStep(1); onClose(); }} eyebrow="New circle" title="Create a circle" maxWidth="max-w-[620px]">
      {/* Progress */}
      <div className="px-6 pt-4 pb-2">
        <div className="flex items-center gap-2">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div className="flex flex-col items-center gap-1">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${i + 1 < step ? 'bg-[#2f3b2d] text-white' : i + 1 === step ? 'bg-[#ff875d] text-white' : 'bg-[#f0e4dd] text-slate-400'}`}>
                  {i + 1 < step ? '✓' : i + 1}
                </div>
                <span className={`text-[10px] font-semibold ${i + 1 === step ? 'text-[#ff875d]' : 'text-slate-400'}`}>{label}</span>
              </div>
              {i < stepLabels.length - 1 && <div className={`h-px flex-1 mb-4 ${i + 1 < step ? 'bg-[#2f3b2d]' : 'bg-[#f0e4dd]'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="min-h-[360px] px-6 py-4">

        {/* Step 1 — Event */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <p className="text-lg font-semibold text-slate-900">Choose the event</p>
              <p className="text-sm text-slate-500 mt-1">What occasion is this circle for?</p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setEventMode('calendar')} className={`h-10 px-4 rounded-full text-sm font-semibold ${eventMode === 'calendar' ? 'bg-[#2f3b2d] text-white' : 'border border-[#ead8ce] bg-white text-slate-700'}`}>From calendar</button>
              <button type="button" onClick={() => setEventMode('new')} className={`h-10 px-4 rounded-full text-sm font-semibold ${eventMode === 'new' ? 'bg-[#2f3b2d] text-white' : 'border border-[#ead8ce] bg-white text-slate-700'}`}>New event</button>
            </div>
            {eventMode === 'calendar' ? (
              <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                {safeCalendarEvents.filter(e => !e.event_date || new Date(e.event_date) >= new Date(new Date().toDateString())).map(event => (
                  <label key={event.id} className={`flex cursor-pointer items-center justify-between rounded-[20px] border p-4 ${String(event.id) === String(selectedEventId) ? 'border-[#f0a384] bg-[#fff4ee]' : 'border-[#efe1d9] bg-[#fffdfa]'}`}>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                      <p className="mt-1 text-[13px] text-slate-500">{event.type} · {event.event_date}</p>
                    </div>
                    <input type="radio" name="calendarEvent" className="h-4 w-4 accent-[#f36f64]"
                      checked={String(event.id) === String(selectedEventId)}
                      onChange={() => { setSelectedEventId(String(event.id)); setForm(prev => ({ ...prev, eventTitle: event.title, eventDate: event.event_date, deadline: event.event_date, occasionType: event.type || 'Event', title: event.title })); }} />
                  </label>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-700">Event title</span>
                  <input type="text" value={form.eventTitle} onChange={e => setForm(prev => ({ ...prev, eventTitle: e.target.value, title: e.target.value }))}
                    className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]" placeholder="e.g. Dad's 60th birthday" />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-700">Event date</span>
                  <input type="date" min={new Date().toISOString().slice(0,10)} value={form.eventDate}
                    onChange={e => setForm(prev => ({ ...prev, eventDate: e.target.value, deadline: prev.deadline || e.target.value }))}
                    className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]" />
                </label>
              </div>
            )}
          </div>
        )}

        {/* Step 2 — Details */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <p className="text-lg font-semibold text-slate-900">Circle details</p>
              <p className="text-sm text-slate-500 mt-1">Name the circle and set a contribution deadline.</p>
            </div>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Circle name</span>
              <input type="text" value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]" placeholder="e.g. Dad's birthday circle" />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Contribution deadline</span>
              <input type="date" min={new Date().toISOString().slice(0,10)} value={form.deadline}
                onChange={e => setForm(prev => ({ ...prev, deadline: e.target.value }))}
                className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]" />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">If people do not contribute enough</span>
              <select value={form.fundingMode} onChange={e => setForm(prev => ({ ...prev, fundingMode: e.target.value }))}
                className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]">
                <option value="flexible">Flexible pot — release what was raised</option>
                <option value="all_or_nothing">All-or-nothing — refund everyone</option>
                <option value="organiser_covers">Organiser covers gap</option>
              </select>
            </label>
          </div>
        )}

        {/* Step 3 — Gift */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <p className="text-lg font-semibold text-slate-900">The gift</p>
              <p className="text-sm text-slate-500 mt-1">Pick a hint or paste a product link.</p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setForm(prev => ({ ...prev, goalType: 'item', itemSource: 'hint', itemUrl: '', selectedHintId: '' })); setLinkPreview(null); }}
                className={`h-10 px-4 rounded-full text-sm font-semibold ${form.itemSource === 'hint' && form.goalType === 'item' ? 'bg-[#2f3b2d] text-white' : 'border border-[#ead8ce] bg-white text-slate-700'}`}>From hints</button>
              <button type="button" onClick={() => { setForm(prev => ({ ...prev, goalType: 'item', itemSource: 'url', selectedHintId: '' })); }}
                className={`h-10 px-4 rounded-full text-sm font-semibold ${form.itemSource === 'url' && form.goalType === 'item' ? 'bg-[#2f3b2d] text-white' : 'border border-[#ead8ce] bg-white text-slate-700'}`}>Paste a link</button>
              <button type="button" onClick={() => { setForm(prev => ({ ...prev, goalType: 'amount', itemSource: '' })); setLinkPreview(null); }}
                className={`h-10 px-4 rounded-full text-sm font-semibold ${form.goalType === 'amount' ? 'bg-[#2f3b2d] text-white' : 'border border-[#ead8ce] bg-white text-slate-700'}`}>Amount only</button>
            </div>

            {form.goalType === 'amount' && (
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Target amount</span>
                <input type="text" inputMode="decimal" value={form.goalValue} onChange={e => setForm(prev => ({ ...prev, goalValue: e.target.value }))}
                  placeholder="220" className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]" />
              </label>
            )}

            {form.itemSource === 'url' && form.goalType === 'item' && (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <input type="url" value={form.itemUrl} onChange={e => setForm(prev => ({ ...prev, itemUrl: e.target.value }))}
                    placeholder="Paste product link" className="h-12 flex-1 rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]" />
                  <button type="button" onClick={handleFetchPreview} className="h-12 px-4 rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] text-sm font-semibold text-white shadow-lg shrink-0">
                    {isFetchingPreview ? 'Fetching...' : 'Fetch'}
                  </button>
                </div>
                {linkPreview && (
                  <div className="rounded-[18px] border border-[#eedfd6] bg-[#fffdfa] p-3 flex gap-3">
                    {linkPreview.image && <img src={linkPreview.image} className="h-16 w-16 rounded-[12px] object-cover shrink-0" alt="" />}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{linkPreview.title}</p>
                      {form.goalValue && <p className="text-[13px] font-bold text-[#ff8060] mt-1">{formatCurrency(parseAmount(form.goalValue), form.currency)}</p>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {form.itemSource === 'hint' && form.goalType === 'item' && (
              <div className="grid gap-3 grid-cols-[180px_1fr]">
                <div className="rounded-[18px] border border-[#efe1d9] bg-[#fffdfa] p-3 max-h-[280px] overflow-y-auto">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400 px-1 pb-2">People</p>
                  {ownerOptions.map(person => (
                    <button key={person.id} type="button" onClick={() => { setSelectedHintOwnerId(person.id); setForm(prev => ({ ...prev, selectedHintId: '', goalValue: '' })); setLinkPreview(null); }}
                      className={`flex w-full items-center gap-2 rounded-[14px] border px-2 py-2 text-left mb-1 transition ${String(person.id) === String(selectedHintOwnerId) ? 'border-[#f0a384] bg-[#fff4ee]' : 'border-transparent hover:bg-[#fff8f4]'}`}>
                      {person.avatarUrl
                        ? <img src={person.avatarUrl} className="h-8 w-8 rounded-full object-cover shrink-0" alt="" />
                        : <div className={getAvatarClasses(person.colors, person.status, 'sm')}>{person.initials}</div>}
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-slate-900 truncate">{person.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{person.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="rounded-[18px] border border-[#efe1d9] bg-[#fffdfa] p-3 max-h-[280px] overflow-y-auto">
                  {selectedOwner ? (
                    visibleHints.length ? visibleHints.map(hint => (
                      <label key={hint.id} className={`flex cursor-pointer items-start gap-3 rounded-[14px] border p-3 mb-2 ${form.selectedHintId === hint.id ? 'border-[#f0a384] bg-[#fff4ee]' : 'border-[#efe1d9] bg-white'}`}>
                        {hint.image_url && <img src={hint.image_url} className="h-10 w-10 rounded-[8px] object-cover shrink-0" alt="" />}
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-slate-900 line-clamp-2">{hint.title}</p>
                          {extractHintAmount(hint) > 0 && <p className="text-[12px] font-bold text-[#ff8060] mt-0.5">{formatCurrency(extractHintAmount(hint), hint.currency || form.currency)}</p>}
                        </div>
                        <input type="radio" name="hint" className="mt-1 h-4 w-4 accent-[#f36f64] shrink-0" checked={form.selectedHintId === hint.id} onChange={() => handleSelectHint(hint)} />
                      </label>
                    )) : (
                      <p className="text-sm text-slate-400 p-3">No public hints yet.</p>
                    )
                  ) : <p className="text-sm text-slate-400 p-3">Select a person.</p>}
                </div>
              </div>
            )}

            {liveBaseAmount > 0 && liveBaseAmount < 10 && (
              <div className="rounded-[18px] border border-[#fde8b0] bg-[#fff8ee] px-4 py-3 text-sm text-[#b07a30]">
                Minimum item price is £10. HintDrop charges £1.50 + 2% to cover payment processing and platform costs.
              </div>
            )}
            {liveBaseAmount > 0 && liveBaseAmount >= 10 && (
              <div className="rounded-[18px] bg-[#fff4ee] p-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-slate-600">Total target</span><span className="font-bold text-slate-900">{formatCurrency(liveTotals.totalAmount, form.currency || 'GBP')}</span></div>
  
              </div>
            )}
          </div>
        )}

        {/* Step 4 — People */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <p className="text-lg font-semibold text-slate-900">Add people</p>
              <p className="text-sm text-slate-500 mt-1">Invite people to join the circle. They confirm when they accept.</p>
            </div>
            {selectedPeople.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedPeople.map(person => (
                  <div key={person.id} className="inline-flex items-center gap-2 rounded-full border border-[#ead8ce] bg-white px-3 py-1.5">
                    {person.avatarUrl ? <img src={person.avatarUrl} className="h-6 w-6 rounded-full object-cover" alt="" /> : <div className={getAvatarClasses(person.colors, person.status, 'sm')}>{person.initials}</div>}
                    <span className="text-sm font-medium text-slate-700">{person.name}</span>
                    <button type="button" onClick={() => setSelectedPeople(prev => prev.filter(p => p.id !== person.id))} className="text-slate-400 hover:text-slate-600">✕</button>
                  </div>
                ))}
              </div>
            )}
            <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1">
              {contacts.map(contact => {
                const added = selectedPeople.some(p => p.id === contact.id);
                return (
                  <div key={contact.id} className="flex items-center justify-between rounded-[18px] border border-[#f0dfd6] bg-[#fffdfa] p-3">
                    <div className="flex items-center gap-3">
                      {contact.avatarUrl ? <img src={contact.avatarUrl} className="h-9 w-9 rounded-full object-cover" alt="" /> : <div className={getAvatarClasses(contact.colors, contact.status)}>{contact.initials}</div>}
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{contact.name}</p>
                        <p className="text-[12px] text-slate-500">{contact.role}{contact.email ? ` · ${contact.email}` : ''}</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setSelectedPeople(prev => added ? prev : [...prev, contact])}
                      className={`h-9 px-3 rounded-full text-[12px] font-semibold ${added ? 'bg-[#edf6eb] text-[#4a7a3a]' : 'border border-[#ead8ce] bg-white text-slate-700 hover:bg-[#fff5f0]'}`}>
                      {added ? 'Added' : 'Invite'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 5 — Review */}
        {step === 5 && (
          <div className="space-y-4">
            <div>
              <p className="text-lg font-semibold text-slate-900">Review and create</p>
              <p className="text-sm text-slate-500 mt-1">Check everything looks right before sending invites.</p>
            </div>
            <div className="rounded-[18px] border border-[#f0dfd6] bg-[#fffdfa] p-4 space-y-3">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Circle</span><span className="font-semibold text-slate-900">{form.title}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Event date</span><span className="font-semibold text-slate-900">{form.eventDate || '—'}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Deadline</span><span className="font-semibold text-slate-900">{form.deadline || '—'}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Item price</span><span className="font-semibold text-slate-900">{formatCurrency(liveBaseAmount, form.currency || 'GBP')}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Funding</span><span className="font-semibold text-slate-900">{fundingModeToLabel(form.fundingMode)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">People</span><span className="font-semibold text-slate-900">{selectedPeople.length > 0 ? selectedPeople.map(p => p.name).join(', ') : 'Just you'}</span></div>
              {liveBaseAmount > 0 && (
                <>
                  <div className="flex justify-between text-[12px] text-slate-400"><span>HintDrop fee</span><span>{formatCurrency(liveTotals.platformFeeAmount, form.currency || 'GBP')}</span></div>
                  {totalPeopleCount > 0 && (
                    <div className="flex justify-between text-sm font-semibold border-t border-[#f0dfd6] pt-2 mt-1">
                      <span className="text-slate-700">Est. per person</span>
                      <span className="text-[#df7b59]">{formatCurrency(roundCurrencyUp((liveBaseAmount + liveTotals.platformFeeAmount) / totalPeopleCount), form.currency || 'GBP')} + Stripe fee</span>
                    </div>
                  )}
                </>
              )}
            </div>
            {errorMessage && <div className="rounded-[18px] border border-[#efc0ba] bg-[#fff4f2] px-4 py-3 text-sm text-[#b14f43]">{errorMessage}</div>}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 px-6 pb-6">
        {step > 1 ? (
          <button type="button" onClick={() => setStep(s => s - 1)} className="h-12 flex-1 rounded-full border border-[#ead8ce] bg-white text-sm font-semibold text-slate-700 hover:bg-[#fff5f0]">Back</button>
        ) : (
          <button type="button" onClick={() => { setStep(1); onClose(); }} className="h-12 flex-1 rounded-full border border-[#ead8ce] bg-white text-sm font-semibold text-slate-700 hover:bg-[#fff5f0]">Cancel</button>
        )}
        {step < TOTAL_STEPS ? (
          <button type="button" onClick={() => setStep(s => s + 1)} disabled={!canNext()}
            className={`h-12 flex-1 rounded-full text-sm font-semibold text-white shadow-lg ${canNext() ? 'bg-gradient-to-b from-[#ff946d] to-[#f36f64]' : 'bg-[#f0c4b4] cursor-not-allowed'}`}>
            Next
          </button>
        ) : (
          <button type="button" onClick={onSubmit} disabled={isSubmitting}
            className={`h-12 flex-1 rounded-full text-sm font-semibold text-white shadow-lg ${isSubmitting ? 'bg-[#e9a48d] cursor-not-allowed' : 'bg-gradient-to-b from-[#ff946d] to-[#f36f64]'}`}>
            {isSubmitting ? 'Creating...' : 'Create circle'}
          </button>
        )}
      </div>
    </ModalShell>
  );
}

function UserProfileModal({ userId, name, avatarUrl, initials, onClose, currentUserId, isContact, onAddContact }) {
  const [hints, setHints] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState([]);
  const [claimingId, setClaimingId] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    if (!userId) return;
    async function load() {
      setLoading(true);
      const [{ data: profileData }, { data: hintsData }] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url, interests").eq("id", userId).maybeSingle(),
        supabase.from("hints").select("id, title, image_url, numeric_price, currency, retailer, url, starred, occasions").eq("user_id", userId).eq("is_private", false).order("position", { ascending: true }).limit(40),
      ]);
      setProfile(profileData);
      const hintsList = hintsData || [];
      setHints(hintsList);
      if (hintsList.length && currentUserId && currentUserId !== userId) {
        const { data: claimsData } = await supabase
          .from("hint_claims")
          .select("id, hint_id, claimed_by, claim_type")
          .in("hint_id", hintsList.map(h => h.id));
        setClaims(claimsData || []);
      }
      setLoading(false);
    }
    load();
  }, [userId, currentUserId]);

  async function handleToggleClaim(hint) {
    if (!currentUserId || currentUserId === userId) return;
    const myClaim = claims.find(c => c.hint_id === hint.id && c.claimed_by === currentUserId);
    if (myClaim) {
      setClaims(prev => prev.filter(c => c.id !== myClaim.id));
      await supabase.from("hint_claims").delete().eq("id", myClaim.id);
    } else {
      const tempId = crypto.randomUUID();
      setClaims(prev => [...prev, { id: tempId, hint_id: hint.id, claimed_by: currentUserId, claim_type: "solo" }]);
      const { error } = await supabase.from("hint_claims")
        .insert({ hint_id: hint.id, claimed_by: currentUserId, claim_type: "solo" });
      if (error) {
        setClaims(prev => prev.filter(c => c.id !== tempId));
      }
    }
  }

  const displayName = profile?.full_name || name || "User";
  const displayAvatar = profile?.avatar_url || avatarUrl;
  const interests = Array.isArray(profile?.interests) ? profile.interests : [];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(33,24,20,0.42)] backdrop-blur-sm sm:items-center sm:px-4" onClick={onClose}>
      <div
        className="flex w-full max-w-[640px] flex-col overflow-hidden rounded-t-[32px] border border-[#efdcd2] bg-white shadow-[0_28px_80px_rgba(75,45,30,0.18)] sm:rounded-[32px]"
        style={{ maxHeight: "90dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-[#f2e5de] px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {displayAvatar ? (
                <img src={displayAvatar} alt={displayName} className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-[#efcdbf] to-[#bb8168] text-[14px] font-bold text-white">
                  {initials || getInitials(displayName)}
                </div>
              )}
              <div>
                <p className="text-[18px] font-semibold text-slate-900">{displayName}</p>
                {interests.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {interests.slice(0, 5).map((interest) => (
                      <span key={interest} className="rounded-full bg-[#fff4ee] px-2.5 py-0.5 text-[11px] font-semibold text-[#df7b59]">
                        {interest}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#efe0d7] text-slate-500 hover:bg-[#faf6f3]">
              ✕
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-400">Loading hints...</div>
          ) : !isContact && currentUserId && currentUserId !== userId ? (
            <div className="relative">
              <div className="columns-2 gap-3 blur-sm pointer-events-none select-none">
                {hints.slice(0, 4).map((hint) => (
                  <div key={hint.id} className="mb-3 break-inside-avoid">
                    <div className="overflow-hidden rounded-[20px] border border-[#f0dfd6] bg-[#fffaf7]">
                      {hint.image_url ? (
                        <img src={hint.image_url} alt={hint.title} className="w-full object-cover" style={{ aspectRatio: "1/1" }} />
                      ) : (
                        <div className="flex items-center justify-center bg-gradient-to-br from-[#f3d5cc] to-[#d98c76]" style={{ aspectRatio: "1/1" }}>
                          <span className="text-2xl">🎁</span>
                        </div>
                      )}
                      <div className="p-3">
                        <p className="text-[13px] font-semibold text-slate-900 line-clamp-2">{hint.title}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <p className="text-sm font-semibold text-slate-700">Add as a contact to see their hints</p>
                <button type="button" onClick={onAddContact}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-6 text-sm font-semibold text-white shadow-lg">
                  Add contact
                </button>
              </div>
            </div>
          ) : hints.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">No public hints yet.</div>
          ) : (
            <div className="columns-2 gap-3">
              {hints.map((hint) => {
                const myClaim = claims.find(c => c.hint_id === hint.id && c.claimed_by === currentUserId);
                const otherClaim = claims.find(c => c.hint_id === hint.id && c.claimed_by !== currentUserId);
                const isViewingOther = currentUserId && currentUserId !== userId;
                return (
                  <div key={hint.id} className="mb-3 break-inside-avoid">
                    <div className="overflow-hidden rounded-[20px] border border-[#f0dfd6] bg-[#fffaf7] hover:border-[#e8c9bc] transition-colors">
                      <a href={hint.url} target="_blank" rel="noopener noreferrer" className="block">
                        {hint.image_url ? (
                          <img src={hint.image_url} alt={hint.title} className="w-full object-cover" style={{ aspectRatio: "1/1" }} />
                        ) : (
                          <div className="flex items-center justify-center bg-gradient-to-br from-[#f3d5cc] to-[#d98c76]" style={{ aspectRatio: "1/1" }}>
                            <span className="text-2xl">🎁</span>
                          </div>
                        )}
                        <div className="p-3">
                          <p className="text-[13px] font-semibold text-slate-900 line-clamp-2">{hint.title}</p>
                          {hint.numeric_price != null && (
                            <p className="mt-1 text-[12px] text-[#df7b59] font-medium">
                              {new Intl.NumberFormat("en-GB", { style: "currency", currency: hint.currency || "GBP" }).format(hint.numeric_price)}
                            </p>
                          )}
                          <p className="mt-0.5 text-[11px] text-slate-400 truncate">{hint.retailer}</p>
                          {hint.occasions?.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {hint.occasions.slice(0, 2).map(o => (
                                <span key={o} className="rounded-full bg-[#f0f7ee] px-2 py-0.5 text-[10px] font-semibold text-[#4a7a3a]">{o}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </a>
                      {isViewingOther ? (
                        <div className="border-t border-[#f0dfd6] px-3 py-2 flex items-center justify-between gap-2">
                          {otherClaim && !myClaim ? (
                            <span className="text-[11px] text-slate-400">Someone is on it</span>
                          ) : <span />}
                          <button
                            type="button"
                            disabled={claimingId === hint.id}
                            onClick={() => {
                              setClaimingId(hint.id);
                              handleToggleClaim(hint).finally(() => setClaimingId(null));
                            }}
                            className={`ml-auto text-[11px] font-semibold rounded-full px-3 py-1 border transition ${
                              myClaim
                                ? "bg-[#edf6eb] text-[#4a7a3a] border-[#c5dfc0]"
                                : otherClaim
                                  ? "bg-[#fff8ee] text-[#b87a2a] border-[#f0d9a0] hover:bg-[#fff0d6]"
                                  : "bg-[#fff4ee] text-[#df7b59] border-[#f0c9b5] hover:bg-[#ffe9db]"
                            }`}
                          >
                            {myClaim ? "I am on it" : otherClaim ? "Buy anyway?" : "I am getting this"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
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
  const [profileModal, setProfileModal] = useState(null);
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
  const [isContributeOpen, setIsContributeOpen] = useState(false);
  const [selectedContactToDelete, setSelectedContactToDelete] = useState(null);
  const [selectedCircleToDelete, setSelectedCircleToDelete] = useState(null);
  const [selectedCircleForContribution, setSelectedCircleForContribution] = useState(null);
  const [isDeletingContact, setIsDeletingContact] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [isContactsManagerOpen, setIsContactsManagerOpen] = useState(false);
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

  const activeCircles = useMemo(() => {
    return realCircles.filter((c) => c.raw?.status !== "expired" && c.raw?.status !== "cancelled");
  }, [realCircles]);

  const archivedCircles = useMemo(() => {
    return realCircles.filter((c) => c.raw?.status === "expired" || c.raw?.status === "cancelled");
  }, [realCircles]);

  const displayedCircles = useMemo(() => {
    return activeCircles.length > 0 || archivedCircles.length > 0 ? activeCircles : [exampleCircle];
  }, [activeCircles]);

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
        .from("contact_public_state")
        .select("*")
        .eq("owner_user_id", userId)
        .order("name", { ascending: true });

      if (error) throw new Error(normalizeSupabaseError(error, "Failed to load contacts."));

      const rawRows = Array.isArray(data) ? data : [];
      const mapped = rawRows.map(buildContactRecordFromRow);
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
      const { data: memberCircleRows } = await supabase
        .from("circle_members")
        .select("circle_id")
        .eq("user_id", userId);

      const memberCircleIds = (memberCircleRows || []).map((r) => r.circle_id);

      // Auto-expire circles past their deadline on load
      const now = new Date().toISOString();
      await supabase
        .from("circles")
        .update({ status: "expired" })
        .in("status", ["draft", "active"])
        .lt("deadline_at", now)
        .or(`user_id.eq.${userId}${memberCircleIds.length ? `,id.in.(${memberCircleIds.join(",")})` : ""}`);

      const { data: circlesData, error: circlesError } = await supabase
        .from("circles")
        .select("*")
        .or(`user_id.eq.${userId}${memberCircleIds.length ? `,id.in.(${memberCircleIds.join(",")})` : ""}`)
        .order("created_at", { ascending: false });

      if (circlesError) {
        throw new Error(normalizeSupabaseError(circlesError, "Failed to load circles."));
      }

      const circleIds = (circlesData || []).map((circle) => circle.id).filter(Boolean);
      let inviteMap = {};
      let contributionMap = {};

      if (circleIds.length > 0) {
        const [{ data: inviteData, error: inviteError }, { data: contributionData, error: contributionError }] =
          await Promise.all([
            supabase.from("circle_invites").select("*").in("circle_id", circleIds),
            supabase
              .from("circle_contributions")
              .select("id, circle_id, user_id, amount, payment_status")
              .in("circle_id", circleIds),
          ]);

        if (inviteError) {
          throw new Error(normalizeSupabaseError(inviteError, "Failed to load circle invites."));
        }

        if (contributionError) {
          throw new Error(
            normalizeSupabaseError(contributionError, "Failed to load circle contributions.")
          );
        }

        inviteMap = (inviteData || []).reduce((acc, invite) => {
          if (!acc[invite.circle_id]) acc[invite.circle_id] = [];
          acc[invite.circle_id].push(invite);
          return acc;
        }, {});

        contributionMap = buildContributionMap(contributionData || []);
      }

      const currentUserName =
        getGoogleName(currentProfile || {}) ||
        currentProfile?.full_name ||
        currentProfile?.invite_name ||
        "You";

      // Fetch owner profiles for circles not owned by current user
      const ownerIds = [...new Set((circlesData || []).map(c => c.user_id).filter(id => id !== userId))];
      const ownerNameMap = {};
      const ownerAvatarMap = {};
      if (ownerIds.length) {
        const { data: ownerProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', ownerIds);
      (ownerProfiles || []).forEach(p => {
          ownerNameMap[p.id] = p.full_name || 'Organiser';
          ownerAvatarMap[p.id] = p.avatar_url || null;
        });
      }

      const mapped = (circlesData || []).map((circle) => {
        const ownerName = circle.user_id === userId ? currentUserName : (ownerNameMap[circle.user_id] || 'Organiser');
        const ownerAvatar = circle.user_id === userId ? null : (ownerAvatarMap[circle.user_id] || null);
        const ownerUserId = circle.user_id || null;
        const baseVm = buildCircleViewModel(circle, inviteMap[circle.id] || [], ownerName, ownerAvatar, ownerUserId);
        return applyContributionDataToCircle(
          baseVm,
          contributionMap[circle.id],
          userId,
          currentUserName
        );
      });

      // Fetch profile avatars for all members including self
      const allInviteEmails = Object.values(inviteMap)
        .flat()
        .map((i) => (i.invite_email_normalized || i.invite_email || "").toLowerCase())
        .filter(Boolean);

      const { data: selfProfile } = await supabase
        .from("profiles")
        .select("id, email_normalized, avatar_url")
        .eq("id", userId)
        .maybeSingle();

      const avatarByEmail = {};
      if (selfProfile?.avatar_url) avatarByEmail["__self__"] = selfProfile.avatar_url;

      if (allInviteEmails.length) {
        const { data: profileRows } = await supabase
          .from("profiles")
          .select("id, email_normalized, avatar_url")
          .in("email_normalized", allInviteEmails);

        (profileRows || []).forEach((p) => {
          if (p.email_normalized) avatarByEmail[p.email_normalized] = p.avatar_url;
        });
      }

      const mappedWithAvatars = mapped.map((circle) => ({ ...circle, members: circle.members.map((member) => {
          if (member.avatarUrl) return member;
          const emailKey = member.email === "__self__" ? "__self__" : (member.email || "").toLowerCase();
          return avatarByEmail[emailKey]
            ? { ...member, avatarUrl: avatarByEmail[emailKey] }
            : member;
        }), }));

      setRealCircles(mappedWithAvatars);
      return mapped;
    } catch (error) {
      setRealCircles([]);
      setCircleError(error?.message || "Failed to load circles.");
      return [];
    } finally {
      setIsLoadingCircles(false);
    }
  }, [supabase]);

  const refreshCircles = useCallback(async () => {
    if (!sessionUser?.id) return;

    const currentProfile = profile || (await loadProfile(sessionUser.id).catch(() => null));
    await loadCircles(sessionUser.id, currentProfile);
  }, [sessionUser, profile, loadProfile, loadCircles]);

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

        const merged = [...buildGenericCalendarEvents(), ...buildContactBirthdayEvents(loadedContacts), ...(loadedEvents || [])];
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

  function openContributeModal(circle) {
    setSelectedCircleForContribution(circle);
    setIsContributeOpen(true);
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
      const detectedCurrency =
        String(data?.currency || "").trim().toUpperCase() || form.currency || "GBP";

      setLinkPreview({
        ...(data || {}),
        currency: detectedCurrency,
      });

      setForm((prev) => ({
        ...prev,
        goalValue: previewAmount > 0 ? String(previewAmount) : "",
        currency: detectedCurrency,
      }));
    } catch {
      setLinkPreview({
        title: "Preview unavailable",
        description:
          "We could not pull a preview from that link yet, but you can still use the URL.",
        image: "",
        url: form.itemUrl.trim(),
        currency: form.currency || "GBP",
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

    const { data: inviteData, error: inviteError } = await supabase.functions.invoke("send-contact-invite", {
      body: {
        email: cleanedEmail,
        name: contactPayload.name,
        role: Array.isArray(contactPayload.relationshipTypes) && contactPayload.relationshipTypes.length
          ? contactPayload.relationshipTypes[0]
          : "Friend",
      },
    });
    if (inviteError) throw new Error(normalizeSupabaseError(inviteError, "Failed to send contact invite."));

    const reloadedContacts = await loadContacts(sessionUser.id);
    await loadPublicHintsForContacts(reloadedContacts);
  }

  function openEditContactModal(contact) { setEditingContact(contact); }

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
      (person) => !person.matchedProfileId && (!String(person.email || "").trim() || !isValidEmail(person.email))
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
      currency: String(form.currency || "GBP").trim().toUpperCase(),
      item_price_amount: totals.itemAmount,
      item_target_amount: totals.itemAmount,
      organising_fee_amount: totals.feeAmount,
      total_target_amount: totals.totalAmount,
      fee_mode: "per_contributor",
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

      async function sha256Hex(value) {
      const bytes = new TextEncoder().encode(value);
      const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
      const inviteRows = await Promise.all(
        selectedPeople.map(async (person) => {
          const rawEmail = String(person.email || "").trim();
          const normalizedEmail = rawEmail.toLowerCase();
          const inviteToken = crypto.randomUUID();
          const inviteTokenHash = await sha256Hex(inviteToken);
          return {
            circle_id: insertedCircle.id,
            user_id: sessionUser.id,
            contact_id: person.id || null,
            invite_name: person.name || null,
            invite_email: rawEmail,
            invite_email_normalized: normalizedEmail,
            invite_token: inviteToken,
            invite_token_hash: inviteTokenHash,
            status: "pending",
            reminder_count: 0,
            invited_user_id: person.matchedProfileId || null,
          };
        })
      );

      if (inviteRows.length > 0) {
        const { data: inviteData, error: inviteError } = await supabase
          .from("circle_invites")
          .insert(inviteRows)
          .select("*");
        if (inviteError) {
          throw new Error(normalizeSupabaseError(inviteError, "Circle created but invite insert failed."));
        }
        await Promise.all(
          selectedPeople.map(async (person) => {
            try {
              await supabase.functions.invoke("send-circle-invite", {
                body: {
                  circle_id: insertedCircle.id,
                  email: person.email || null,
                  name: person.name || null,
                  target_user_id: person.matchedProfileId || null,
                },
              });
            } catch (e) {
              console.error("Circle invite email failed for", person.name, e);
            }
          })
        );
      }

      const currentUserName =
        getGoogleName(profile || {}) ||
        profile?.full_name ||
        profile?.invite_name ||
        "You";
      await refreshCircles();
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
                  <button type="button" onClick={() => setIsContactsManagerOpen(true)} className="text-[22px] font-semibold tracking-[-0.04em] text-slate-900 hover:text-[#df7b59] transition">Contacts</button>
                  <p className="mt-1 text-xs text-slate-500">Invite people into shared circles.</p>
                  <div className="mt-4 max-h-[400px] overflow-y-auto space-y-3 pr-1">
                    {isLoadingContacts ? (
                      <div className="rounded-[22px] border border-dashed border-[#e5d8cf] bg-[#fffaf7] p-4 text-[13px] leading-6 text-slate-500">
                        Loading contacts...
                      </div>
                    ) : contacts.length ? (
                      contacts.slice(0, 10).map((contact) => (
                        <ContactCard
                          key={contact.id}
                          contact={contact}
                          onOpenProfile={setProfileModal}
                        />
                      ))
                    ) : (
                      <div className="rounded-[22px] border border-dashed border-[#e5d8cf] bg-[#fffaf7] p-4 text-[13px] leading-6 text-slate-500">
                        No contacts added yet.
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={openAddContactModal}
                      className="flex-1 h-10 inline-flex items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-4 text-sm font-semibold text-white shadow-lg">
                      Add contact
                    </button>
                    <button type="button" onClick={() => setIsContactsManagerOpen(true)}
                      className="flex-1 h-10 inline-flex items-center justify-center rounded-full border border-[#f0a384] bg-white px-4 text-sm font-semibold text-[#df7b59] hover:bg-[#fff4ee]">
                      View all
                    </button>
                  </div>
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
                      Create a circle around an event, invite people, choose a hint or paste a product link, and keep the pot warm and flexible.
                    </p>
                    <PotTypeSummary />
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
                        onContributeClick={openContributeModal}
                        sessionUser={sessionUser}
                        contacts={contacts}
                        onOpenProfile={setProfileModal}
                      />
                    ))
                  )}
                  {archivedCircles.length > 0 ? (
                    <div className="mt-8">
                      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Archived circles
                      </p>
                      <div className="space-y-5 opacity-60">
                        {archivedCircles.map((circle) => (
                          <CircleCard
                            key={circle.id}
                            circle={circle}
                            onDeleteCircleClick={openDeleteCircleModal}
                            deletingCircleId={isDeletingCircle ? selectedCircleToDelete?.id : null}
                            formatCurrency={formatCurrency}
                            onContributeClick={openContributeModal}
                            sessionUser={sessionUser}
                            onOpenProfile={setProfileModal}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
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

      <ContactsManagerModal
        open={isContactsManagerOpen}
        onClose={() => setIsContactsManagerOpen(false)}
        contacts={contacts}
        onAdd={() => { setIsContactsManagerOpen(false); openAddContactModal(); }}
        onRefresh={() => loadContacts(sessionUser.id)}
        onDelete={(c) => { setIsContactsManagerOpen(false); openDeleteContactModal(c); }}
        onOpenProfile={(p) => { setIsContactsManagerOpen(false); setProfileModal(p); }}
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

      <ContributeModal
        open={isContributeOpen}
        onClose={() => {
          setIsContributeOpen(false);
          setSelectedCircleForContribution(null);
        }}
        circle={selectedCircleForContribution}
        refreshCircles={refreshCircles}
        formatCurrency={formatCurrency}
      />
      {profileModal && (
        <UserProfileModal
          userId={profileModal.userId}
          name={profileModal.name}
          avatarUrl={profileModal.avatarUrl}
          initials={profileModal.initials}
          onClose={() => setProfileModal(null)}
          currentUserId={sessionUser?.id}
          isContact={contacts.some(c => (c.profileId || c.matchedProfileId) === profileModal.userId)}
          onAddContact={async () => {
            await supabase.functions.invoke('send-contact-invite', {
              body: { target_user_id: profileModal.userId, name: profileModal.name, role: 'Friend' },
            });
            setProfileModal(null);
            if (sessionUser?.id) await loadContacts(sessionUser.id);
          }}
        />
      )}
    </main>
  );
}
