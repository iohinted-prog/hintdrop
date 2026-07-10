"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import AvatarMenu from "../components/AvatarMenu";
import AddContactModal from "../components/AddContactModal";
import EditContactModal from "../components/EditContactModal";
import ContactsManagerModal from "../components/ContactsManagerModal";

const supabase = createClient();

const feedFilters = [
  { key: "all", label: "All activity" },
  { key: "hint", label: "Hints" },
  { key: "circle", label: "Circles" },
  { key: "reminder", label: "Reminders" },
  { key: "contact", label: "Contacts" },
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

const demoContacts = [
  {
    id: "demo-1",
    name: "Maya",
    role: "Contact",
    note: "Hinted user",
    initials: "M",
    colors: "from-[#efc3af] to-[#ae6e57]",
    email: "maya@example.com",
    contactState: "user",
    isDemo: true,
  },
  {
    id: "demo-2",
    name: "James",
    role: "Invitee",
    note: "Invitee",
    initials: "J",
    colors: "from-[#4e596d] to-[#212a3c]",
    email: "james@example.com",
    contactState: "invitee",
    isDemo: true,
  },
  {
    id: "demo-3",
    name: "Fiona",
    role: "Contact",
    note: "Hinted user",
    initials: "F",
    colors: "from-[#809168] to-[#41512e]",
    email: "fiona@example.com",
    contactState: "user",
    isDemo: true,
  },
];

const firstLookCard = {
  id: "first-look-card",
  owner_user_id: "demo-owner",
  actor_user_id: "hinted-demo",
  target_user_id: null,
  family: "hint",
  item_type: "first_look",
  visibility: "private",
  circle_id: null,
  activity_session_id: null,
  source_event_id: null,
  headline: "Your feed will fill up as hints, reminders, and circle updates start rolling in.",
  body: "This first-look card helps show how Hinted works before real activity arrives.",
  cta_label: "See hints",
  cta_href: "/hints",
  occurred_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  metadata: {
    social_enabled: true,
    actor_name: "Hinted",
    actor_profile_href: "/hints",
    actor_avatar_initials: "H",
    demo_reactions: [
      { id: "r1", emoji: "❤️", count: 4 },
      { id: "r2", emoji: "👏", count: 2 },
      { id: "r3", emoji: "🎁", count: 3 },
    ],
    demo_comments: [
      { id: "c1", author_name: "Maya", body: "Can already picture this being useful." },
      { id: "c2", author_name: "James", body: "Nice way to make the feed feel alive." },
    ],
  },
  isDemo: true,
};

const eventTypeStyles = {
  birthday: {
    dot: "bg-[#efb39a]",
    pill: "bg-[#fff1ea] text-[#c96d4f]",
    label: "Birthday",
  },
  anniversary: {
    dot: "bg-[#9ec5fe]",
    pill: "bg-[#eef6ff] text-[#4d7fc6]",
    label: "Anniversary",
  },
  celebration: {
    dot: "bg-[#9acb8f]",
    pill: "bg-[#eef8ea] text-[#4f8750]",
    label: "Celebration",
  },
};

const specialEventStyles = {
  valentines: {
    dot: "bg-[#f49ab6]",
    pill: "bg-[#fff1f6] text-[#c85a86]",
    label: "Valentine’s",
  },
  christmas: {
    dot: "bg-[#d95c5c]",
    pill: "bg-[#fff1f1] text-[#b24545]",
    label: "Christmas",
  },
  halloween: {
    dot: "bg-[#f0a14a]",
    pill: "bg-[#fff5e8] text-[#be741d]",
    label: "Halloween",
  },
  mothersDay: {
    dot: "bg-[#caa6ff]",
    pill: "bg-[#f6f0ff] text-[#8660c7]",
    label: "Mother’s Day",
  },
  fathersDay: {
    dot: "bg-[#7bb6d9]",
    pill: "bg-[#edf7fd] text-[#4f87a8]",
    label: "Father’s Day",
  },
  easter: {
    dot: "bg-[#f0c86a]",
    pill: "bg-[#fff8e7] text-[#b28718]",
    label: "Easter",
  },
  newYears: {
    dot: "bg-[#8a8fa8]",
    pill: "bg-[#f2f4f8] text-[#5f667f]",
    label: "New Year",
  },
};

function getInitials(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim().toLowerCase());
}

function normalizeSupabaseError(error, fallback) {
  if (!error) return fallback;
  // Supabase wraps Edge Function errors with a generic message; the real message is in error.context
  if (error.message && error.message.includes("non-2xx")) {
    const ctx = error.context;
    if (ctx && typeof ctx.json === "function") {
      // handled async elsewhere
    }
    const body = error.context?.body || error.details || error.hint;
    if (body && typeof body === "string" && !body.includes("non-2xx")) return body;
    return fallback;
  }
  const parts = [error.message, error.details, error.hint].filter(Boolean);
  return parts.length ? parts.join(" — ") : fallback;
}

function formatRelativeFromDate(dateString) {
  if (!dateString) return "Recently";

  const now = new Date();
  const value = new Date(dateString);
  const diffMs = now.getTime() - value.getTime();

  if (Number.isNaN(diffMs)) return "Recently";

  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 7) return `${days}d ago`;

  return value.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function parseDateOnly(dateString) {
  if (!dateString) return null;
  const [year, month, day] = String(dateString).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function diffInDaysFromToday(dateString) {
  const target = parseDateOnly(dateString);
  if (!target) return null;

  const today = startOfDay(new Date());
  const targetDay = startOfDay(target);
  const diffMs = targetDay.getTime() - today.getTime();

  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function formatReminderDistance(diffDays) {
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === 7) return "In 1 week";
  if (diffDays < 7) return `In ${diffDays} days`;

  const weeks = Math.round(diffDays / 7);
  if (diffDays < 31) return `In ${weeks} week${weeks === 1 ? "" : "s"}`;

  const months = Math.round(diffDays / 30);
  return `In ${months} month${months === 1 ? "" : "s"}`;
}

function getPrimaryContactField(person, field) {
  const values = Array.isArray(person?.[field]) ? person[field] : [];
  if (!values.length) return "";
  return values[0]?.displayName || values[0]?.value || "";
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

function relationshipToRoleLabel(relationshipTypes, fallbackRole) {
  if (Array.isArray(relationshipTypes) && relationshipTypes.length > 0) {
    return relationshipTypes.join(", ");
  }
  if (fallbackRole) return fallbackRole;
  return "Contact";
}

function mapContactState(status) {
  if (status === "user") return "user";
  if (status === "invited") return "invitee";
  return "contact";
}

function getFeedBucket(item) {
  const family = String(item.family || "").toLowerCase();
  const itemType = String(item.item_type || "").toLowerCase();

  if (family.includes("hint") || itemType.includes("hint")) return "hint";
  if (family.includes("circle") || itemType.includes("circle")) return "circle";
  if (family.includes("reminder") || itemType.includes("reminder")) return "reminder";
  if (family.includes("contact") || itemType.includes("contact")) return "contact";

  return "all";
}

function isSocialFeedItem(item) {
  if (item.isDemo) return true;

  const metadata = item.metadata || {};
  if (typeof metadata.social_enabled === "boolean") return metadata.social_enabled;

  return getFeedBucket(item) !== "reminder";
}

function possessiveName(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return "Their";
  return trimmed.endsWith("s") ? `${trimmed}'` : `${trimmed}'s`;
}

function buildReminderHeadline({ title, type, eventDate }) {
  const diffDays = diffInDaysFromToday(eventDate);
  if (diffDays == null) return `${title || "Event"} is coming up`;

  const distance = formatReminderDistance(diffDays).toLowerCase();
  const normalizedType = String(type || "").toLowerCase();
  const typeLabel = eventTypeStyles[normalizedType]?.label?.toLowerCase() || "event";

  return `${possessiveName(title)} ${typeLabel} is ${distance}`;
}

function resolveEventStyle(event) {
  const title = String(event?.title || "").trim().toLowerCase();

  if (title.includes("valentine")) return specialEventStyles.valentines;
  if (title.includes("christmas") || title.includes("xmas")) return specialEventStyles.christmas;
  if (title.includes("halloween")) return specialEventStyles.halloween;
  if (title.includes("mother")) return specialEventStyles.mothersDay;
  if (title.includes("father")) return specialEventStyles.fathersDay;
  if (title.includes("easter")) return specialEventStyles.easter;
  if (title.includes("new year")) return specialEventStyles.newYears;

  return eventTypeStyles[event?.type] || eventTypeStyles.celebration;
}

function getAvatarState(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "accepted" || normalized === "user" || normalized === "member") return "accepted";
  if (normalized === "invitee" || normalized === "invited" || normalized === "pending") return "invitee";
  return "contact";
}

function getRelationshipGradient(role) {
  const normalized = String(role || "").toLowerCase();
  if (normalized.includes("partner") || normalized.includes("spouse")) return "from-[#e8b9a7] to-[#bf755f]";
  if (normalized.includes("family") || normalized.includes("parent") || normalized.includes("child") || normalized.includes("sibling") || normalized.includes("cousin")) return "from-[#eac8b8] to-[#9d6957]";
  if (normalized.includes("colleague")) return "from-[#b7c8db] to-[#6b88a7]";
  return "from-[#efcdbf] to-[#bb8168]";
}

function getAvatarClasses(colors, status, size = "md") {
  const avatarState = getAvatarState(status);
  const sizeClasses = size === "sm" ? "h-8 w-8 text-[11px]" : size === "lg" ? "h-11 w-11 text-[12px]" : "h-10 w-10 text-[11px]";
  if (avatarState === "accepted") return `flex items-center justify-center rounded-full bg-gradient-to-b ${sizeClasses} font-bold text-white ${colors}`;
  if (avatarState === "invitee") return `flex items-center justify-center rounded-full border-2 border-dashed border-[#dfb39d] bg-[#fff5ef] ${sizeClasses} font-bold text-[#c87150]`;
  return `flex items-center justify-center rounded-full border border-[#e8ddd6] bg-[#faf7f4] ${sizeClasses} font-bold text-slate-600`;
}

function getContactVisualState(contact) {
  if (contact.contactState === "user") {
    return {
      avatarClass: "bg-gradient-to-b from-[#8aa587] to-[#4e684d] text-white",
      badgeClass: "bg-[#2f3b2d] text-white",
      badgeLabel: "C",
      cardClass: "border-[#dce8d8] bg-[#f7fbf5]",
      roleLabel: contact.role || "Contact",
      noteLabel: "Hinted user",
    };
  }
  if (contact.contactState === "invitee") {
    return {
      avatarClass: "bg-gradient-to-b from-[#8aa587] to-[#4e684d] text-white",
      badgeClass: "border border-[#d7e4d2] bg-white text-[#4e684d]",
      badgeLabel: "I",
      cardClass: "border-[#e6ddd7] bg-white",
      roleLabel: contact.role || "Invitee",
      noteLabel: "Invitee",
    };
  }
  return {
    avatarClass: "border border-[#e8ddd6] bg-[#faf7f4] text-slate-600",
    badgeClass: "border border-[#e8ddd6] bg-white text-slate-500",
    badgeLabel: "P",
    cardClass: "border-[#f0dfd6] bg-white",
    roleLabel: contact.role || "Contact",
    noteLabel: contact.note || "Contact",
  };
}

function ContactAvatar({ contact }) {
  if (contact.isDemo) {
    return (
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-b text-[11px] font-bold text-white ${contact.colors}`}
      >
        {contact.initials}
      </div>
    );
  }
  return (
    <div className="relative h-11 w-11 shrink-0">
      {contact.avatarUrl ? (
        <img
          src={contact.avatarUrl}
          alt={contact.name || "Contact"}
          className="h-11 w-11 rounded-full object-cover"
        />
      ) : (
        <div className={getAvatarClasses(contact.colors, contact.contactState, "lg")}>
          {contact.initials}
        </div>
      )}
    </div>
  );
}


function ContactCard({ contact, onDeleteClick, onOpenProfile, onEditClick }) {
  const isClickable = Boolean(contact.profileId && !contact.isDemo && onOpenProfile);
  function handleProfileClick() {
    if (isClickable) onOpenProfile({ userId: contact.profileId, name: contact.name, avatarUrl: contact.avatarUrl, initials: contact.initials });
  }
  return (
    <article
      className={`rounded-[22px] border border-[#f0dfd6] bg-white p-4 shadow-sm transition-all duration-200 ${isClickable ? "hover:-translate-y-0.5 hover:shadow-md hover:border-[#e8c9bc] cursor-pointer" : "hover:-translate-y-0.5 hover:shadow-md"}`}
      onClick={isClickable ? handleProfileClick : undefined}
    >
      <div className="flex items-center gap-3">
        <ContactAvatar contact={contact} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 truncate">{contact.name}</p>
          <p className="text-xs text-slate-500 truncate">
            {contact.role}{contact.note ? " · " + contact.note : ""}
          </p>
        </div>
      </div>
    </article>
  );
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
  maxWidth = "max-w-[720px]",
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
              isDeleting || !matches ? "cursor-not-allowed bg-[#e9a48d]" : "bg-[#b14f43]"
            }`}
          >
            {isDeleting ? "Deleting..." : "Delete contact"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}


function UserProfileModal({ userId, name, avatarUrl, initials, onClose, currentUserId }) {
  const [hints, setHints] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState([]);
  const [claimingId, setClaimingId] = useState(null);

  useEffect(() => {
    if (!userId) return;
    async function load() {
      setLoading(true);
      const [{ data: profileData }, { data: hintsData }] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url, interests").eq("id", userId).maybeSingle(),
        supabase.from("hints").select("id, title, image_url, numeric_price, currency, retailer, url, starred").eq("user_id", userId).eq("is_private", false).order("position", { ascending: true }).limit(40),
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
      const data = error ? null : { id: tempId, hint_id: hint.id, claimed_by: currentUserId, claim_type: "solo" };
      if (error) {
        setClaims(prev => prev.filter(c => c.id !== tempId));
      } else if (data) {
        setClaims(prev => prev.map(c => c.id === tempId ? data : c));
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
                            {myClaim ? "I am on it ✓" : otherClaim ? "Buy anyway?" : "I am getting this"}
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

function FeedItem({
  item,
  comments,
  activeComposerId,
  setActiveComposerId,
  draftComment,
  setDraftComment,
  onSubmitComment,
  demoReactionsState,
  onToggleDemoReaction,
  onOpenProfile,
  sessionUser,
  reactions = [],
  onToggleReaction,
  onDeleteComment,
}) {
  const metadata = item.metadata || {};
  const socialEnabled = isSocialFeedItem(item);
  const bucket = getFeedBucket(item);

  const bucketStyle =
    bucket === "hint"
      ? "bg-[#f5f3ff] text-[#7c5cbf]"
      : bucket === "circle"
        ? "bg-[#eef6ea] text-[#5b7a3c]"
        : bucket === "reminder"
          ? "bg-[#fff3ee] text-[#e07c54]"
          : "bg-[#fff7e8] text-[#af7b14]";

  const bucketLabel =
    bucket === "hint"
      ? "Hint"
      : bucket === "circle"
        ? "Circle"
        : bucket === "reminder"
          ? "Reminder"
          : "Contact";

  const actorHref = metadata.actor_profile_href || item.cta_href || "#";
  const actorInitials = metadata.actor_avatar_initials || getInitials(metadata.actor_name || item.headline || "H");
  const actorUserId = item.actor_user_id && item.actor_user_id !== "hinted-demo" ? item.actor_user_id : null;
  const actorAvatarUrl = metadata.actor_avatar_url || null;
  const demoReactions = item.isDemo
    ? demoReactionsState || []
    : Array.isArray(metadata.demo_reactions)
      ? metadata.demo_reactions
      : [];
  const canInteract = item.isDemo || socialEnabled;

  return (
    <article className="rounded-[28px] border border-[#f0dfd6] bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        {actorUserId ? (
          <button
            type="button"
            onClick={() => onOpenProfile && onOpenProfile({ userId: actorUserId, name: metadata.actor_name, avatarUrl: actorAvatarUrl, initials: actorInitials })}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#efcdbf] to-[#bb8168] text-[12px] font-bold text-white transition hover:scale-[1.03] overflow-hidden"
          >
            {actorAvatarUrl ? <img src={actorAvatarUrl} alt={metadata.actor_name || ""} className="h-full w-full object-cover" /> : actorInitials}
          </button>
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#efcdbf] to-[#bb8168] text-[12px] font-bold text-white">
            {actorInitials}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {metadata.actor_name ? (
                  actorUserId ? (
                    <button
                      type="button"
                      onClick={() => onOpenProfile && onOpenProfile({ userId: actorUserId, name: metadata.actor_name, avatarUrl: actorAvatarUrl, initials: actorInitials })}
                      className="text-[13px] font-semibold text-slate-900 hover:text-[#d96d4f]"
                    >
                      {metadata.actor_name}
                    </button>
                  ) : (
                    <span className="text-[13px] font-semibold text-slate-900">
                      {metadata.actor_name}
                    </span>
                  )
                ) : null}
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${bucketStyle}`}>
                  {bucketLabel}
                </span>
                {item.isDemo ? (
                  <span className="rounded-full border border-[#eadfd7] bg-[#fffaf7] px-2.5 py-1 text-[11px] font-medium text-slate-500">
                    Demo
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-[15px] leading-7 text-slate-700">{item.headline}</p>
              {item.body ? <p className="mt-1 text-[14px] leading-6 text-slate-500">{item.body}</p> : null}
            </div>
            <span className="shrink-0 text-[12px] text-slate-400">
              {formatRelativeFromDate(item.occurred_at || item.created_at)}
            </span>
          </div>
          {item.cta_label && item.cta_href ? (
            <div className="mt-4">
              <Link
                href={item.cta_href}
                className="inline-flex h-10 items-center justify-center rounded-full border border-[#ebdfd8] bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                {item.cta_label}
              </Link>
            </div>
          ) : null}

          {canInteract ? (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {item.isDemo ? (
                  demoReactions.map((reaction) => (
                    <button
                      key={reaction.id}
                      type="button"
                      onClick={() => onToggleDemoReaction(item.id, reaction.id)}
                      className={`inline-flex h-9 items-center justify-center rounded-full border px-3 text-sm font-medium ${
                        reaction.active
                          ? "border-[#f1a58a] bg-[#fff1ea] text-[#d96d4f]"
                          : "border-[#ebdfd8] bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="mr-1">{reaction.emoji}</span>
                      {reaction.count}
                    </button>
                  ))
                ) : (
                  ["❤️", "👏", "🎁"].map((emoji) => {
                    const count = reactions.filter(r => r.emoji === emoji).length;
                    const active = reactions.some(r => r.emoji === emoji && r.user_id === sessionUser?.id);
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => onToggleReaction && onToggleReaction(item, emoji)}
                        className={`inline-flex h-9 items-center justify-center rounded-full border px-3 text-sm font-medium transition ${
                          active
                            ? "border-[#f1a58a] bg-[#fff1ea] text-[#d96d4f]"
                            : "border-[#ebdfd8] bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span className="mr-1">{emoji}</span>
                        {count > 0 ? count : ""}
                      </button>
                    );
                  })
                )}
                <button
                  type="button"
                  onClick={() => setActiveComposerId((current) => (current === item.id ? null : item.id))}
                  className="inline-flex h-9 items-center justify-center rounded-full border border-[#ebdfd8] bg-white px-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Comment
                </button>
              </div>

              {comments.length > 0 ? (
                <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-3 rounded-[18px] border border-[#f0e8e3] bg-white px-4 py-3">
                      {comment.author_avatar ? (
                        <img src={comment.author_avatar} alt={comment.author_name} className="h-7 w-7 shrink-0 rounded-full object-cover mt-0.5" />
                      ) : (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#efcdbf] to-[#bb8168] text-[10px] font-bold text-white mt-0.5">
                          {getInitials(comment.author_name || "S")}
                        </div>
                      )}
                      <p className="flex-1 text-[13px] leading-6 text-slate-600">
                        <span className="font-semibold text-slate-900">{comment.author_name || "Someone"}</span>{" "}
                        {comment.body}
                      </p>
                      {comment.user_id === sessionUser?.id ? (
                        <button type="button" onClick={() => onDeleteComment && onDeleteComment(comment)} className="shrink-0 text-[11px] text-slate-400 hover:text-[#b14f43] transition-colors mt-1">✕</button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {activeComposerId === item.id ? (
                <div className="mt-4 flex gap-3">
                  {sessionUser?.user_metadata?.avatar_url ? (
                    <img src={sessionUser.user_metadata.avatar_url} alt="You" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#efcdbf] to-[#bb8168] text-[11px] font-bold text-white">
                      {getInitials(sessionUser?.user_metadata?.full_name || sessionUser?.email || "Y") || "Y"}
                    </div>
                  )}

                  <div className="flex w-full gap-2">
                    <input
                      type="text"
                      value={draftComment}
                      onChange={(e) => setDraftComment(e.target.value)}
                      placeholder="Write a comment..."
                      className="h-11 w-full rounded-full border border-[#e9ddd6] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19a78]/60 focus:ring-4 focus:ring-[#f19a78]/10"
                    />
                    <button
                      type="button"
                      onClick={() => onSubmitComment(item)}
                      className="inline-flex h-11 items-center justify-center rounded-full bg-[#2f3b2d] px-4 text-sm font-semibold text-white"
                    >
                      Send
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function CalendarPopover({
  selectedDate,
  events,
  onClose,
  onAddEvent,
  onRequestDelete,
  draft,
  setDraft,
  isSaving,
}) {
  if (!selectedDate) return null;

  const prettyDate = selectedDate.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mt-4 rounded-[24px] border border-[#efdcd2] bg-[#fffaf7] p-4 shadow-[0_18px_45px_rgba(123,84,64,0.12)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Selected day
          </p>
          <h3 className="mt-1 text-[18px] font-semibold tracking-[-0.03em] text-slate-900">
            {prettyDate}
          </h3>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#eaded6] bg-white text-slate-500 hover:bg-slate-50"
          aria-label="Close calendar event panel"
        >
          ✕
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {events.length > 0 ? (
          events.map((event) => {
            const style = resolveEventStyle(event);
            const canDelete = true;

            return (
              <div key={event.id} className="rounded-[18px] border border-[#eee1da] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${style.pill}`}>
                        {style.label}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{event.title}</p>
                  </div>

                  {canDelete ? (
                    <button
                      type="button"
                      onClick={() => onRequestDelete({ ...event, date: selectedDate })}
                      className="inline-flex h-9 items-center justify-center rounded-full border border-[#efc0ba] bg-[#fff4f2] px-3 text-[12px] font-semibold text-[#b14f43] hover:bg-[#ffe9e5]"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-[18px] bg-white p-4 text-sm text-slate-500">
            No events yet for this day.
          </div>
        )}
      </div>

      <div className="mt-4 rounded-[20px] border border-[#efe2db] bg-white p-4">
        <p className="text-sm font-semibold text-slate-900">Create new event</p>

        <div className="mt-3 space-y-3">
          <input
            type="text"
            value={draft.title}
            onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Event title"
            className="h-11 w-full rounded-[16px] border border-[#eaded6] bg-white px-4 text-sm outline-none focus:border-[#f19a78]/60 focus:ring-4 focus:ring-[#f19a78]/10"
          />

          <select
            value={draft.type}
            onChange={(e) => setDraft((prev) => ({ ...prev, type: e.target.value }))}
            className="h-11 w-full rounded-[16px] border border-[#eaded6] bg-white px-4 text-sm outline-none focus:border-[#f19a78]/60 focus:ring-4 focus:ring-[#f19a78]/10"
          >
            <option value="birthday">Birthday</option>
            <option value="anniversary">Anniversary</option>
            <option value="celebration">Celebration</option>
          </select>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Repeat</p>
            <div className="flex gap-2">
              {["none", "monthly", "yearly"].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDraft((prev) => ({ ...prev, recurring: option }))}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    (draft.recurring || "none") === option
                      ? "border-[#2f3b2d] bg-[#2f3b2d] text-white"
                      : "border-[#eaded6] bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {option === "none" ? "No repeat" : option === "monthly" ? "Monthly" : "Yearly"}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onAddEvent}
            disabled={isSaving}
            className="inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-5 text-sm font-semibold text-white shadow-lg disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save event"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniCalendar({
  eventsByDate,
  calendarLoading,
  calendarError,
  onCreateEvent,
  onDeleteEvent,
}) {
  const today = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today);
  const [openPopover, setOpenPopover] = useState(true);
  const [draft, setDraft] = useState({ title: "", type: "birthday", recurring: "none" });
  const [calendarSaving, setCalendarSaving] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
  const [localError, setLocalError] = useState("");

  const monthLabel = useMemo(
    () =>
      currentMonth.toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      }),
    [currentMonth]
  );

  const days = useMemo(() => getMonthData(currentMonth), [currentMonth]);

  const toKey = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const todayKey = toKey(today);
  const selectedKey = selectedDate ? toKey(selectedDate) : null;
  const selectedEvents = selectedKey ? eventsByDate[selectedKey] || [] : [];

  const goMonth = (direction) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
    setOpenPopover(false);
  };

  const handleDayClick = (date) => {
    setSelectedDate(date);
    setOpenPopover(true);
  };

  const handleAddEvent = async () => {
    if (!selectedKey || !draft.title.trim()) return;

    setCalendarSaving(true);
    setLocalError("");

    try {
      await onCreateEvent({
        title: draft.title.trim(),
        type: draft.type,
        eventDate: selectedKey,
        recurring: draft.recurring !== "none" ? draft.recurring : null,
      });
      setDraft({ title: "", type: "birthday" });
    } catch (error) {
      setLocalError(error?.message || "Could not save event.");
    } finally {
      setCalendarSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!eventToDelete?.id) return;

    setIsDeletingEvent(true);
    setLocalError("");

    try {
      await onDeleteEvent(eventToDelete);
      setEventToDelete(null);
    } catch (error) {
      setLocalError(error?.message || "Could not delete event.");
    } finally {
      setIsDeletingEvent(false);
    }
  };

  return (
    <section className="rounded-[28px] border border-[#f0dfd6] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Planner
          </p>
          <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.04em] text-slate-900">
            {monthLabel}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
              setSelectedDate(now);
              setOpenPopover(true);
            }}
            className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Today
          </button>
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

      {calendarError || localError ? (
        <div className="mt-4 rounded-[18px] border border-[#f3d7cc] bg-[#fff4ef] px-4 py-3 text-sm text-[#c46545]">
          {localError || calendarError}
        </div>
      ) : null}

      {calendarLoading ? (
        <div className="mt-4 rounded-[18px] bg-[#faf7f4] px-4 py-3 text-sm text-slate-500">
          Loading calendar...
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-7 gap-2 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
        <div>Sun</div>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-2">
        {days.map((item) => {
          const key = toKey(item.date);
          const selected = key === selectedKey;
          const isToday = key === todayKey;
          const dayEvents = eventsByDate[key] || [];
          const leadEvent = dayEvents[0];
          const dotClass = leadEvent ? resolveEventStyle(leadEvent).dot : null;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleDayClick(item.date)}
              aria-label={item.date.toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              aria-pressed={selected}
              className={`min-h-[58px] rounded-[16px] border p-2 text-left transition ${
                selected
                  ? "border-[#f2b39a] bg-[#fff2ea] shadow-[inset_0_0_0_1px_rgba(242,179,154,0.35)]"
                  : isToday
                    ? "border-[#f3c8b7] bg-[#fff8f4]"
                    : "border-slate-100 bg-[#fffdfa] hover:border-[#efc8b6] hover:bg-[#fff7f2]"
              }`}
            >
              <div
                className={`text-[13px] font-semibold ${
                  selected
                    ? "text-[#d96d4f]"
                    : isToday
                      ? "text-slate-900"
                      : item.currentMonth
                        ? "text-slate-700"
                        : "text-slate-300"
                }`}
              >
                {item.day}
              </div>

              {dayEvents.length > 0 ? (
                <div className="mt-1.5 flex items-center gap-1">
                  <span className={`h-2 w-2 rounded-full ${dotClass}`} />
                  {dayEvents.length > 1 ? (
                    <span className="text-[10px] text-slate-400">{dayEvents.length - 1}+</span>
                  ) : null}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      {openPopover ? (
        <CalendarPopover
          selectedDate={selectedDate}
          events={selectedEvents}
          onClose={() => setOpenPopover(false)}
          onAddEvent={handleAddEvent}
          onRequestDelete={setEventToDelete}
          draft={draft}
          setDraft={setDraft}
          isSaving={calendarSaving}
        />
      ) : null}

      {eventToDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(42,26,20,0.38)] px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-[520px] rounded-[30px] border border-[#eddacf] bg-[#fffaf7] p-6 shadow-[0_24px_80px_rgba(88,46,31,0.22)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#df7b59]">
              Delete event
            </p>
            <h3 className="mt-2 text-[24px] font-semibold tracking-[-0.04em] text-slate-900">
              Remove this event?
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              This will permanently delete <span className="font-semibold text-slate-900">{eventToDelete.title}</span> from your calendar.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEventToDelete(null)}
                disabled={isDeletingEvent}
                className="inline-flex h-[44px] items-center justify-center rounded-full border border-[#ead8ce] bg-white px-6 text-sm font-medium text-slate-700 hover:bg-[#fff5f0] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteEvent}
                disabled={isDeletingEvent}
                className="inline-flex h-[44px] items-center justify-center rounded-full bg-[#b14f43] px-6 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isDeletingEvent ? "Deleting..." : "Delete event"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function InviteCard({ invite, inviteActionId, onAccept, onDelete }) {
  const isWorking = inviteActionId === invite.id;
  const isContactInvite = invite.source === "contact";
  return (
    <article
      className={`rounded-[22px] border p-4 ${
        isContactInvite ? "border-[#e6ddd7] bg-white" : "border-[#dce8d8] bg-[#f7fbf5]"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="relative h-11 w-11 shrink-0">
          {invite.inviter?.avatar_url ? (
            <img src={invite.inviter.avatar_url} alt={invite.inviter.full_name || ""} className="h-11 w-11 rounded-full object-cover" />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-b from-[#8aa587] to-[#4e684d] text-[12px] font-bold text-white">
              {getInitials(invite.inviter?.full_name || invite.invite_name || "?")}
            </div>
          )}
          <span className={`absolute -bottom-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[9px] font-bold ${
            isContactInvite ? "border border-[#d7e4d2] bg-white text-[#4e684d]" : "bg-[#2f3b2d] text-white"
          }`}>
            {isContactInvite ? "I" : "C"}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">
                {invite.inviter?.full_name || invite.inviter?.invite_name || invite.invite_name || "Someone"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {isContactInvite ? "wants to connect with you" : "invited you to a circle"}
              </p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${
              isContactInvite ? "border border-[#d7e4d2] bg-white text-[#4e684d]" : "bg-[#2f3b2d] text-white"
            }`}>
              {isContactInvite ? "Contact" : "Circle"}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onAccept(invite)}
              disabled={isWorking}
              className="inline-flex items-center justify-center rounded-full border border-[#ee8d69] bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
            >
              {isWorking ? "Working..." : "Accept"}
            </button>
            <button
              type="button"
              onClick={() => onDelete(invite)}
              disabled={isWorking}
              className="inline-flex items-center justify-center rounded-full border border-[#ead7cd] bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
            >
              {isWorking ? "Working..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}


function buildGenericCalendarEvents() {
  const now = new Date();
  const end = new Date();
  end.setMonth(end.getMonth() + 14);
  const year = now.getFullYear();
  const recurring = [
    { title: "Halloween", type: "celebration", month: 10, day: 31 },
    { title: "Bonfire Night", type: "celebration", month: 11, day: 5 },
    { title: "Christmas", type: "celebration", month: 12, day: 25 },
    { title: "New Year's Eve", type: "celebration", month: 12, day: 31 },
    { title: "Valentine's Day", type: "celebration", month: 2, day: 14 },
    { title: "Mother's Day", type: "celebration", month: 3, day: 30 },
    { title: "Father's Day", type: "celebration", month: 6, day: 21 },
  ];
  const rows = [];
  for (let y = year; y <= year + 2; y++) {
    for (const item of recurring) {
      const date = new Date(Date.UTC(y, item.month - 1, item.day));
      if (date >= now && date <= end) {
        rows.push({
          id: `generic-${item.title}-${y}`,
          title: item.title,
          event_date: date.toISOString().slice(0, 10),
          type: item.type,
          source: "generic",
          recurring: "yearly",
        });
      }
    }
  }
  return rows.sort((a, b) => String(a.event_date).localeCompare(String(b.event_date)));
}

export default function FeedClient() {
  const [sessionUser, setSessionUser] = useState(null);

  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [contactError, setContactError] = useState("");
  const [contactSuccess, setContactSuccess] = useState("");

  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isDeleteContactOpen, setIsDeleteContactOpen] = useState(false);
  const [selectedContactToDelete, setSelectedContactToDelete] = useState(null);
  const [isDeletingContact, setIsDeletingContact] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [isContactsManagerOpen, setIsContactsManagerOpen] = useState(false);
  const [editContactForm, setEditContactForm] = useState({ name: "", role: "Friend" });
  const [isSavingEditContact, setIsSavingEditContact] = useState(false);
  const [editContactError, setEditContactError] = useState("");
  const [deleteContactError, setDeleteContactError] = useState("");

  const [feedItems, setFeedItems] = useState([]);
  const [profileModal, setProfileModal] = useState(null); // { userId, name, avatarUrl, initials }
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const [commentsByFeedId, setCommentsByFeedId] = useState({});
  const [reactionsByFeedId, setReactionsByFeedId] = useState({});
  const [activeComposerId, setActiveComposerId] = useState(null);
  const [draftComment, setDraftComment] = useState("");
  const [demoCommentsByFeedId, setDemoCommentsByFeedId] = useState({});
  const [demoReactionsByFeedId, setDemoReactionsByFeedId] = useState(() => {
    const initial = {};
    initial[firstLookCard.id] = (firstLookCard.metadata?.demo_reactions || []).map((reaction) => ({
      ...reaction,
      active: false,
    }));
    return initial;
  });

  const [pendingInvites, setPendingInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [invitesError, setInvitesError] = useState("");
  const [activeInvite, setActiveInvite] = useState(null);
  const [inviteActionId, setInviteActionId] = useState(null);

  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarError, setCalendarError] = useState("");

  const loadSession = useCallback(async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      throw new Error(normalizeSupabaseError(error, "Failed to get signed-in user."));
    }

    setSessionUser(user || null);
    return user || null;
  }, []);

  const loadContacts = useCallback(async (userId) => {
    setContactsLoading(true);
    setContactError("");

    const { data, error } = await supabase
      .from("contact_public_state")
      .select("*")
      .eq("owner_user_id", userId)
      .order("name", { ascending: true });

    if (error) {
      setContacts([]);
      setContactsLoading(false);
      throw new Error(normalizeSupabaseError(error, "Failed to load contacts."));
    }

    const mapped = (data || []).map((row) => {
      const contactState = mapContactState(row.public_state);

      return {
        id: row.contact_id,
        name: row.name || row.email || "Unnamed contact",
        role: contactState === "invitee" ? "Invitee" : (row.role || "Friend"),
        note:
          contactState === "user"
            ? "Hinted user"
            : contactState === "invitee"
              ? "Invitee"
              : "Contact",
        initials: getInitials(row.name || row.email || "C"),
        email: row.email || "",
        avatarUrl: row.avatar_url || null,
        colors: getRelationshipGradient(row.role || "Friend"),
        contactState,
        profileId: row.profile_id,
        publicState: row.public_state,
        isDemo: false,
        raw: row,
      };
    });

    setContacts(mapped);
    setContactsLoading(false);
    return mapped;
  }, []);

  const loadFeedItems = useCallback(async (userId, contactList) => {
    setFeedLoading(true);
    setFeedError("");
    const contactUserIds = (contactList || [])
      .filter(c => c.profileId)
      .map(c => c.profileId);
    // Fetch own items and contact items separately then merge
    const [ownResult, contactResult] = await Promise.all([
      supabase
        .from("feed_items")
        .select("*")
        .eq("owner_user_id", userId)
        .order("occurred_at", { ascending: false })
        .limit(50),
      contactUserIds.length ? supabase
        .from("feed_items")
        .select("*")
        .in("actor_user_id", contactUserIds)
        .eq("visibility", "contacts")
        .order("occurred_at", { ascending: false })
        .limit(50) : Promise.resolve({ data: [], error: null }),
    ]);
    const error = ownResult.error || contactResult.error;
    const combined = [...(ownResult.data || []), ...(contactResult.data || [])];
    const seen = new Set();
    const data = combined
      .filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true; })
      .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
      .slice(0, 50);
    if (error) {
      setFeedItems([]);
      setFeedLoading(false);
      throw new Error(normalizeSupabaseError(error, "Failed to load feed."));
    }
    const rows = data || [];
    const actorIds = [...new Set(
      rows.map(r => r.actor_user_id).filter(id => id && id !== "hinted-demo")
    )];
    let avatarByUserId = {};
    if (actorIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, avatar_url")
        .in("id", actorIds);
      (profiles || []).forEach(p => {
        if (p.avatar_url) avatarByUserId[p.id] = p.avatar_url;
      });
    }
    const enriched = rows.map(row => {
      if (!row.actor_user_id || row.actor_user_id === "hinted-demo") return row;
      const avatarUrl = avatarByUserId[row.actor_user_id];
      if (!avatarUrl) return row;
      return {
        ...row,
        metadata: {
          ...(row.metadata || {}),
          actor_avatar_url: row.metadata?.actor_avatar_url || avatarUrl,
        },
      };
    });
    setFeedItems(enriched);
    setFeedLoading(false);
    return enriched;
  }, []);

  const loadReactions = useCallback(async (feedIds) => {
    if (!feedIds.length) { setReactionsByFeedId({}); return; }
    const { data, error } = await supabase
      .from("feed_reactions")
      .select("id, feed_item_id, user_id, emoji")
      .in("feed_item_id", feedIds);
    if (error) return;
    const grouped = (data || []).reduce((acc, row) => {
      if (!acc[row.feed_item_id]) acc[row.feed_item_id] = [];
      acc[row.feed_item_id].push(row);
      return acc;
    }, {});
    setReactionsByFeedId(grouped);
  }, []);

  const loadComments = useCallback(async (feedIds) => {
    if (!feedIds.length) {
      setCommentsByFeedId({});
      return;
    }
    const { data, error } = await supabase
      .from("feed_comments")
      .select("id, feed_item_id, user_id, body, created_at")
      .in("feed_item_id", feedIds)
      .order("created_at", { ascending: true });
    if (error) throw new Error(normalizeSupabaseError(error, "Failed to load comments."));
    const rows = data || [];
    const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))];
    let nameByUserId = {};
    let avatarByUserId = {};
    if (userIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);
      (profiles || []).forEach(p => {
        if (p.full_name) nameByUserId[p.id] = p.full_name;
        if (p.avatar_url) avatarByUserId[p.id] = p.avatar_url;
      });
    }
    const grouped = rows.reduce((acc, row) => {
      if (!acc[row.feed_item_id]) acc[row.feed_item_id] = [];
      acc[row.feed_item_id].push({
        ...row,
        author_name: nameByUserId[row.user_id] || "Someone",
        author_avatar: avatarByUserId[row.user_id] || null,
      });
      return acc;
    }, {});
    setCommentsByFeedId(grouped);
  }, []);

  const loadInvites = useCallback(async (user) => {
    setInvitesLoading(true);
    setInvitesError("");

    const normalizedEmail = user?.email?.trim().toLowerCase();

    const [circleResult, contactResult] = await Promise.all([
      (async () => {
        let query = supabase
          .from("circle_invites")
          .select(`
            id,
            circle_id,
            user_id,
            contact_id,
            invite_name,
            invite_email,
            invite_token,
            status,
            viewed_at,
            paid_at,
            created_at,
            updated_at,
            invited_user_id
          `)
          .eq("status", "pending")
          .order("created_at", { ascending: false });
        query = normalizedEmail
          ? query.or(`invited_user_id.eq.${user.id},invite_email_normalized.eq.${normalizedEmail}`)
          : query.eq("invited_user_id", user.id);
        const { data, error } = await query;
        return { data, error };
      })(),
      (async () => {
        let query = supabase
          .from("contact_invites")
          .select(`
            id,
            inviter_user_id,
            contact_id,
            invite_email,
            invite_name,
            status,
            expires_at,
            accepted_by_user_id,
            accepted_at,
            created_at,
            updated_at,
            token_hash,
            invited_user_id
          `)
          .eq("status", "pending")
          .order("created_at", { ascending: false });
        query = normalizedEmail
          ? query.or(`invited_user_id.eq.${user.id},invite_email.eq.${normalizedEmail}`)
          : query.eq("invited_user_id", user.id);
        const { data, error } = await query;
        return { data, error };
      })(),
    ]);

    if (circleResult.error) {
      setPendingInvites([]);
      setInvitesLoading(false);
      throw new Error(normalizeSupabaseError(circleResult.error, "Failed to load invites."));
    }
    if (contactResult.error) {
      setPendingInvites([]);
      setInvitesLoading(false);
      throw new Error(normalizeSupabaseError(contactResult.error, "Failed to load invites."));
    }

    const contactInvites = (contactResult.data || []).map((invite) => ({
      ...invite,
      source: "contact",
      circle_id: null,
      user_id: invite.inviter_user_id,
      viewed_at: null,
      paid_at: null,
      invite_token: null,
    }));

    // Fetch inviter names separately since PostgREST join is ambiguous
    // due to two foreign keys from contact_invites to profiles.
    const inviterIds = [...new Set(contactInvites.map((i) => i.inviter_user_id).filter(Boolean))];
    let inviterMap = {};
    if (inviterIds.length) {
      const { data: inviterProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, invite_name")
        .in("id", inviterIds);
      (inviterProfiles || []).forEach((p) => {
        inviterMap[p.id] = p;
      });
    }

    const circleInvites = (circleResult.data || []);
    const circleInviterIds = [...new Set(circleInvites.map((i) => i.user_id).filter(Boolean))];
    let circleInviterMap = {};
    if (circleInviterIds.length) {
      const { data: circleInviterProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, invite_name, avatar_url")
        .in("id", circleInviterIds);
      (circleInviterProfiles || []).forEach((p) => {
        circleInviterMap[p.id] = p;
      });
    }

    const merged = [
      ...circleInvites.map((invite) => ({
        ...invite,
        source: "circle",
        inviter: circleInviterMap[invite.user_id] || null,
      })),
      ...contactInvites.map((invite) => ({
        ...invite,
        inviter: inviterMap[invite.inviter_user_id] || null,
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    console.log("merged invites", JSON.stringify(merged.map(i => ({id: i.id, source: i.source, inviter: i.inviter, invite_name: i.invite_name}))));
    setPendingInvites(merged);
    setInvitesLoading(false);
    return merged;
  }, []);

  const loadCalendarEvents = useCallback(async (userId) => {
    setCalendarLoading(true);
    setCalendarError("");

    const { data, error } = await supabase
      .from("calendar_events")
      .select("*")
      .or(`source.eq.system,user_id.eq.${userId}`)
      .order("event_date", { ascending: true });

    if (error) {
      setCalendarEvents([]);
      setCalendarLoading(false);
      throw new Error(normalizeSupabaseError(error, "Could not load calendar events."));
    }

    const generic = buildGenericCalendarEvents();
    const dbRows = data || [];
    const merged = [...generic, ...dbRows].filter((event, index, self) =>
      index === self.findIndex(e => e.title === event.title && e.event_date === event.event_date)
    ).sort((a, b) => String(a.event_date).localeCompare(String(b.event_date)));
    setCalendarEvents(merged);
    setCalendarLoading(false);
    return merged;
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const user = await loadSession();
        if (!active || !user) return;

        const loadedContacts = await loadContacts(user.id);
        await Promise.all([
          loadFeedItems(user.id, loadedContacts),
          loadInvites(user),
          loadCalendarEvents(user.id),
        ]);
      } catch (error) {
        if (active) {
          setFeedError(error?.message || "Failed to load page.");
          setContactsLoading(false);
          setInvitesLoading(false);
          setCalendarLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      active = false;
    };
  }, [loadSession, loadContacts, loadFeedItems, loadInvites, loadCalendarEvents]);

  useEffect(() => {
    const socialFeedIds = feedItems.filter(isSocialFeedItem).map((item) => item.id);
    if (socialFeedIds.length) {
      loadComments(socialFeedIds).catch((error) => {
        setFeedError(error?.message || "Failed to load comments.");
      });
      loadReactions(socialFeedIds);
    } else {
      setCommentsByFeedId({});
      setReactionsByFeedId({});
    }
  }, [feedItems, loadComments, loadReactions]);

  async function handleSaveContact(payload) {
    setContactError("");
    setContactSuccess("");

    if (!sessionUser?.id) {
      throw new Error("You must be signed in to save contacts.");
    }

    const cleanedEmail = String(payload.email || "").trim().toLowerCase();

    if (!cleanedEmail || !isValidEmail(cleanedEmail)) {
      throw new Error("A valid email address is required.");
    }

    const { data: inviteData, error: inviteError } = await supabase.functions.invoke("send-contact-invite", {
      body: {
        email: cleanedEmail,
        name: payload.name,
        role: Array.isArray(payload.relationshipTypes) && payload.relationshipTypes.length
          ? payload.relationshipTypes[0]
          : "Friend",
      },
    });
    if (inviteError) {
      let msg = "Failed to send contact invite.";
      try {
        const body = inviteData || (inviteError.context && await inviteError.context.json());
        if (body?.error) msg = body.error;
        else if (body?.message) msg = body.message;
      } catch {}
      throw new Error(msg);
    }
    await loadContacts(sessionUser.id);
    await loadInvites(sessionUser);
    setContactSuccess("Contact saved successfully.");
  }

  function openEditContactModal(contact) {
    setEditingContact(contact);
    setEditContactForm({ name: contact.name || "", role: contact.role || "Friend" });
    setEditContactError("");
  }

  async function handleSaveEditContact() {
    if (!editingContact) return;
    setIsSavingEditContact(true);
    setEditContactError("");
    try {
      const { error } = await supabase
        .from("contacts")
        .update({ name: editContactForm.name.trim(), role: editContactForm.role })
        .eq("id", editingContact.id);
      if (error) throw new Error(error.message);
      await loadContacts(sessionUser.id);
      setEditingContact(null);
    } catch (err) {
      setEditContactError(err.message || "Failed to save.");
    } finally {
      setIsSavingEditContact(false);
    }
  }

  function openDeleteContactModal(contact) {
    setDeleteContactError("");
    setSelectedContactToDelete(contact);
    setIsDeleteContactOpen(true);
  }

  async function handleConfirmDeleteContact(contact) {
    if (!contact?.id) return;

    setIsDeletingContact(true);
    setDeleteContactError("");
    setContactError("");
    setContactSuccess("");

    try {
      const { error } = await supabase.from("contacts").delete().eq("id", contact.id);
      if (error) throw new Error(normalizeSupabaseError(error, "Failed to delete contact."));

      if (contact.email) {
        await supabase
          .from("contact_invites")
          .update({ status: "revoked" })
          .eq("inviter_user_id", sessionUser.id)
          .eq("invite_email", contact.email)
          .eq("status", "pending");
      }

      if (contact.profileId) {
        await supabase
          .from("calendar_events")
          .delete()
          .eq("user_id", sessionUser.id)
          .eq("source", "contact_sync")
          .eq("profile_id", contact.profileId);
      }

      await loadContacts(sessionUser.id);
      await loadInvites(sessionUser);
      setIsDeleteContactOpen(false);
      setSelectedContactToDelete(null);
      setContactSuccess("Contact deleted successfully.");
    } catch (error) {
      setDeleteContactError(error?.message || "Failed to delete contact.");
    } finally {
      setIsDeletingContact(false);
    }
  }

  async function handleSubmitComment(item) {
    if (!draftComment.trim()) return;

    if (item.isDemo) {
      setDemoCommentsByFeedId((prev) => ({
        ...prev,
        [item.id]: [
          ...(prev[item.id] || []),
          {
            id: `demo-comment-${Date.now()}`,
            author_name: "You",
            body: draftComment.trim(),
          },
        ],
      }));
      setDraftComment("");
      setActiveComposerId(null);
      return;
    }

    if (!sessionUser?.id || !isSocialFeedItem(item)) return;

    try {
      const { error } = await supabase.from("feed_comments").insert({
        feed_item_id: item.id,
        user_id: sessionUser.id,
        body: draftComment.trim(),
      });

      if (error) throw new Error(normalizeSupabaseError(error, "Could not save comment."));

      await loadComments(feedItems.filter(isSocialFeedItem).map((feedItem) => feedItem.id));
      setDraftComment("");
      setActiveComposerId(null);
    } catch (error) {
      setFeedError(error?.message || "Could not save comment.");
    }
  }

  function handleToggleDemoReaction(feedId, reactionId) {
    setDemoReactionsByFeedId((prev) => {
      const current = prev[feedId] || [];
      return {
        ...prev,
        [feedId]: current.map((reaction) => {
          if (reaction.id !== reactionId) return reaction;
          const nextActive = !reaction.active;
          return {
            ...reaction,
            active: nextActive,
            count: nextActive ? reaction.count + 1 : reaction.count - 1,
          };
        }),
      };
    });
  }

  async function handleToggleReaction(item, emoji) {
    if (!sessionUser?.id || item.isDemo) return;
    const existing = (reactionsByFeedId[item.id] || []).find(
      r => r.user_id === sessionUser.id && r.emoji === emoji
    );
    if (existing) {
      setReactionsByFeedId(prev => ({
        ...prev,
        [item.id]: (prev[item.id] || []).filter(r => r.id !== existing.id),
      }));
      const { error } = await supabase.from("feed_reactions").delete().eq("id", existing.id);
      if (error) console.error("reaction delete error", error);
    } else {
      const tempId = crypto.randomUUID();
      setReactionsByFeedId(prev => ({
        ...prev,
        [item.id]: [...(prev[item.id] || []), { id: tempId, feed_item_id: item.id, user_id: sessionUser.id, emoji }],
      }));
      const { data, error } = await supabase.from("feed_reactions").insert({ feed_item_id: item.id, user_id: sessionUser.id, emoji }).select().single();
      if (error) {
        console.error("reaction insert error", error);
        setReactionsByFeedId(prev => ({
          ...prev,
          [item.id]: (prev[item.id] || []).filter(r => r.id !== tempId),
        }));
      } else if (data) {
        setReactionsByFeedId(prev => ({
          ...prev,
          [item.id]: (prev[item.id] || []).map(r => r.id === tempId ? data : r),
        }));
      }
    }
  }

  async function handleDeleteComment(comment) {
    if (!sessionUser?.id || comment.user_id !== sessionUser.id) return;
    const { error } = await supabase.from("feed_comments").delete().eq("id", comment.id);
    if (error) { console.error("comment delete error", error); return; }
    setCommentsByFeedId(prev => ({
      ...prev,
      [comment.feed_item_id]: (prev[comment.feed_item_id] || []).filter(c => c.id !== comment.id),
    }));
  }

  async function handleAcceptInvite(invite) {
    if (!sessionUser?.id) return;
    setInviteActionId(invite.id);
    setInvitesError("");
    try {
      if (invite.source === "contact") {
        const { error } = await supabase.functions.invoke("accept-contact-invite", {
          body: { invite_id: invite.id },
        });
        if (error) throw new Error(normalizeSupabaseError(error, "Could not accept contact invite."));
      } else {
        const { error } = await supabase.functions.invoke("accept-circle-invite", {
          body: { token: invite.invite_token },
        });
        if (error) throw new Error(normalizeSupabaseError(error, "Could not accept circle invite."));
      }
      const refreshedContacts = await loadContacts(sessionUser.id);
    await Promise.all([loadInvites(sessionUser), loadFeedItems(sessionUser.id, refreshedContacts)]);
    } catch (error) {
      setInvitesError(error?.message || "Could not accept invite.");
    } finally {
      setInviteActionId(null);
    }
  }

  async function handleInviteDecision(invite, nextStatus) {
    setInviteActionId(invite.id);
    setInvitesError("");

    try {
      if (invite.source === "contact") {
        const { error } = await supabase
          .from("contact_invites")
          .update({ status: "revoked" })
          .eq("id", invite.id);
        if (error) throw new Error(normalizeSupabaseError(error, "Could not update invite."));
      } else {
        const { error } = await supabase
          .from("circle_invites")
          .update({ status: "declined" })
          .eq("id", invite.id);
        if (error) throw new Error(normalizeSupabaseError(error, "Could not update invite."));
      }
      await Promise.all([loadInvites(sessionUser), loadContacts(sessionUser.id)]);
    } catch (error) {
      setInvitesError(error?.message || "Could not update invite.");
    } finally {
      setInviteActionId(null);
    }
  }

  async function handleCreateCalendarEvent(payload) {
    if (!sessionUser?.id) throw new Error("You need to be signed in to save calendar events.");

    const insertPayload = {
      user_id: sessionUser.id,
      title: payload.title,
      event_date: payload.eventDate,
      type: payload.type,
      source: "user",
      recurring: payload.recurring || null,
    };

    const { data, error } = await supabase
      .from("calendar_events")
      .insert(insertPayload)
      .select()
      .single();

    if (error) throw new Error(normalizeSupabaseError(error, "Could not save event."));

    setCalendarEvents((prev) => [...prev, data]);
  }

  async function handleDeleteCalendarEvent(eventToDelete) {
    const { error } = await supabase.from("calendar_events").delete().eq("id", eventToDelete.id);
    if (error) throw new Error(normalizeSupabaseError(error, "Could not delete event."));
    setCalendarEvents((prev) => prev.filter((item) => item.id !== eventToDelete.id));
  }

  const displayContacts = contacts.length > 0 ? contacts : demoContacts;

  const shortReminderFeedItems = useMemo(() => {
    return (calendarEvents || [])
      .map((event) => {
        const diffDays = diffInDaysFromToday(event.event_date);
        if (diffDays === null || diffDays < 0 || diffDays > 7) return null;

        return {
          id: `reminder-${event.id}-${diffDays}`,
          owner_user_id: sessionUser?.id || "me",
          actor_user_id: null,
          target_user_id: null,
          family: "reminder",
          item_type: "event_reminder",
          visibility: "private",
          circle_id: null,
          activity_session_id: null,
          source_event_id: event.id,
          headline: buildReminderHeadline({
            title: event.title,
            type: event.type,
            eventDate: event.event_date,
          }),
          body: "A reminder so you have time to sort the gift.",
          cta_label: "Shop",
          cta_href: "/shop",
          occurred_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          metadata: {
            social_enabled: false,
            event_date: event.event_date,
          },
          isDemo: false,
        };
      })
      .filter(Boolean);
  }, [calendarEvents, sessionUser]);

  const combinedFeedItems = useMemo(() => {
    const hasRealActivity = feedItems.length > 0;
    const base = hasRealActivity ? feedItems : [firstLookCard];
    const merged = [...shortReminderFeedItems, ...base];

    return merged.sort((a, b) => {
      const aDate = new Date(a.occurred_at || a.created_at).getTime();
      const bDate = new Date(b.occurred_at || b.created_at).getTime();
      return bDate - aDate;
    });
  }, [feedItems, shortReminderFeedItems]);

  const visibleFeedItems = useMemo(() => {
    if (activeFilter === "all") return combinedFeedItems;
    return combinedFeedItems.filter((item) => getFeedBucket(item) === activeFilter);
  }, [combinedFeedItems, activeFilter]);

  const eventsByDate = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const nextYear = currentYear + 1;
    return (calendarEvents || []).reduce((acc, row) => {
      if (!row.event_date) return acc;
      const keysToIndex = [row.event_date];
      if (row.recurring === "yearly") {
        const [, month, day] = row.event_date.split("-");
        const thisYearKey = `${currentYear}-${month}-${day}`;
        const nextYearKey = `${nextYear}-${month}-${day}`;
        if (!keysToIndex.includes(thisYearKey)) keysToIndex.push(thisYearKey);
        if (!keysToIndex.includes(nextYearKey)) keysToIndex.push(nextYearKey);
      } else if (row.recurring === "monthly") {
        const [, , day] = row.event_date.split("-");
        for (let m = 1; m <= 12; m++) {
          const monthStr = String(m).padStart(2, "0");
          const key = `${currentYear}-${monthStr}-${day}`;
          if (!keysToIndex.includes(key)) keysToIndex.push(key);
          const keyNext = `${nextYear}-${monthStr}-${day}`;
          if (!keysToIndex.includes(keyNext)) keysToIndex.push(keyNext);
        }
      }
      keysToIndex.forEach((key) => {
        if (!acc[key]) acc[key] = [];
        acc[key].push({
          id: row.id,
          title: row.title,
          type: row.type || "celebration",
          source: row.source || "user",
          recurring: row.recurring || false,
        });
      });
      return acc;
    }, {});
  }, [calendarEvents]);

  const sidebarReminders = useMemo(() => {
    return (calendarEvents || [])
      .map((event) => {
        const diffDays = diffInDaysFromToday(event.event_date);
        if (diffDays === null || diffDays < 8) return null;

        const eventDate = parseDateOnly(event.event_date);
        if (!eventDate) return null;

        return {
          id: `sidebar-reminder-${event.id}`,
          title: event.title,
          prettyDate: eventDate.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
          }),
          distanceLabel: formatReminderDistance(diffDays),
          diffDays,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.diffDays - b.diffDays)
      .slice(0, 3);
  }, [calendarEvents]);

  return (
    <main className="min-h-screen bg-[#fffaf7] text-slate-800">
      <div className="mx-auto max-w-[1380px] px-5 py-8 md:px-8">
        {contactError || contactSuccess || feedError || invitesError ? (
          <div className="mb-5 space-y-3">
            {contactError ? (
              <div className="rounded-[22px] border border-[#efc0ba] bg-[#fff4f2] px-4 py-3 text-sm text-[#b14f43]">
                {contactError}
              </div>
            ) : null}
            {feedError ? (
              <div className="rounded-[22px] border border-[#efc0ba] bg-[#fff4f2] px-4 py-3 text-sm text-[#b14f43]">
                {feedError}
              </div>
            ) : null}
            {invitesError ? (
              <div className="rounded-[22px] border border-[#efc0ba] bg-[#fff4f2] px-4 py-3 text-sm text-[#b14f43]">
                {invitesError}
              </div>
            ) : null}
            {contactSuccess ? (
              <div className="rounded-[22px] border border-[#d8e8d3] bg-[#f3fbf1] px-4 py-3 text-sm text-[#4a7a3a]">
                {contactSuccess}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
          <aside className="space-y-5">
            <section className="rounded-[28px] border border-[#f0dfd6] bg-white p-5 shadow-sm">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Pending invites
                </p>
                <h2 className="mt-1 text-base font-semibold text-slate-900">
                  Invites waiting for you
                </h2>
              </div>

              {invitesLoading ? (
                <p className="mt-4 text-sm text-slate-500">Loading invites...</p>
              ) : pendingInvites.length === 0 ? (
                <div className="mt-4 rounded-[22px] border border-dashed border-[#ecd9cf] bg-[#fcf8f5] px-4 py-5">
                  <p className="text-sm font-medium text-slate-700">No invites need a response right now.</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    When someone adds you to a circle, it will appear here.
                  </p>
                </div>
              ) : (
                <div className="mt-4 max-h-[400px] overflow-y-auto space-y-3 pr-1">
                  {pendingInvites.map((invite) => (
                    <InviteCard
                      key={invite.id}
                      invite={invite}
                      inviteActionId={inviteActionId}
                      onAccept={handleAcceptInvite}
                      onDelete={(inv) => handleInviteDecision(inv, "revoked")}
                    />
                  ))}
                </div>
              )}
            </section>

            {activeInvite ? (
              <section className="rounded-[28px] border border-[#f0dfd6] bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Selected invite
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-slate-900">
                      {activeInvite.invite_name || activeInvite.invite_email || "Circle invite"}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveInvite(null)}
                    className="rounded-full border border-[#ead7cd] bg-white px-3 py-1.5 text-sm font-semibold text-slate-700"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <p>Email: {activeInvite.invite_email || "No email attached"}</p>
                  <p>Status: {activeInvite.status}</p>
                  <p>Circle ID: {activeInvite.circle_id}</p>
                </div>
              </section>
            ) : null}

            <section className="rounded-[28px] border border-[#f0dfd6] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Contacts</h2>
                  <p className="mt-1 text-xs text-slate-500">Invitees and contacts live here.</p>
                </div>
                <button type="button" onClick={() => setIsContactsManagerOpen(true)} className="inline-flex h-7 items-center justify-center rounded-full border border-[#f0c9b5] bg-[#fff4ee] px-3 text-[11px] font-semibold text-[#df7b59] hover:bg-[#ffe9db]">View contacts</button>
              </div>

              <div className="mt-4 space-y-3">
                {contactsLoading ? (
                  <div className="rounded-[22px] border border-dashed border-[#e5d8cf] bg-[#fffaf7] p-4 text-[13px] leading-6 text-slate-500">
                    Loading contacts...
                  </div>
                ) : displayContacts.length ? (
                  displayContacts.map((contact) => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      onDeleteClick={openDeleteContactModal}
                      onOpenProfile={setProfileModal}
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
                onClick={() => setIsAddContactOpen(true)}
                className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-4 text-sm font-semibold text-white shadow-lg"
              >
                Add contact
              </button>
            </section>

            <section className="rounded-[28px] border border-[#f0dfd6] bg-white p-5 shadow-sm">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Filters
                </p>
                <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.04em] text-slate-900">
                  Activity
                </h1>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                {feedFilters.map((filter) => {
                  const selected = activeFilter === filter.key;

                  return (
                    <button
                      key={filter.key}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setActiveFilter(filter.key)}
                      className={`rounded-[18px] px-4 py-3 text-left text-sm font-medium transition ${
                        selected
                          ? "bg-[#2f3b2d] text-white shadow-sm"
                          : "border border-[#efe4dd] bg-[#fffdfa] text-slate-600 hover:bg-[#faf7f5]"
                      }`}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </section>
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
                  </div>

                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddContactOpen(true)}
                    className="inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-5 text-sm font-semibold text-white shadow-lg"
                  >
                    Add contact
                  </button>

                  <Link
                    href="/circles"
                    className="inline-flex h-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-[#fff5f0]"
                  >
                    Create circle
                  </Link>
                </div>

                <div className="mt-5 space-y-4">
                  {feedLoading ? (
                    <div className="rounded-[24px] border border-[#f0dfd6] bg-[#fffdfa] p-5 text-sm text-slate-500">
                      Loading feed...
                    </div>
                  ) : visibleFeedItems.length > 0 ? (
                    visibleFeedItems.map((item) => {
                      const realComments = commentsByFeedId[item.id] || [];
                      const demoSeedComments = item.metadata?.demo_comments || [];
                      const localDemoComments = demoCommentsByFeedId[item.id] || [];
                      const mergedComments = item.isDemo
                        ? [...demoSeedComments, ...localDemoComments]
                        : realComments;

                      return (
                        <FeedItem
                          key={item.id}
                          item={item}
                          comments={mergedComments}
                          activeComposerId={activeComposerId}
                          setActiveComposerId={setActiveComposerId}
                          draftComment={draftComment}
                          setDraftComment={setDraftComment}
                          onSubmitComment={handleSubmitComment}
                          demoReactionsState={demoReactionsByFeedId[item.id]}
                          onToggleDemoReaction={handleToggleDemoReaction}
                          onOpenProfile={setProfileModal}
                          sessionUser={sessionUser}
                          reactions={reactionsByFeedId[item.id] || []}
                          onToggleReaction={handleToggleReaction}
                          onDeleteComment={handleDeleteComment}
                        />
                      );
                    })
                  ) : (
                    <div className="rounded-[24px] border border-[#f0dfd6] bg-[#fffdfa] p-5 text-sm text-slate-500">
                      No activity matches this filter yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-5">
            <MiniCalendar
              eventsByDate={eventsByDate}
              calendarLoading={calendarLoading}
              calendarError={calendarError}
              onCreateEvent={handleCreateCalendarEvent}
              onDeleteEvent={handleDeleteCalendarEvent}
            />

            <section className="rounded-[28px] border border-[#f0dfd6] bg-white p-5 shadow-sm">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Upcoming reminders
                </p>
                <h2 className="mt-1 text-base font-semibold text-slate-900">
                  Your next 3 events
                </h2>
              </div>

              {sidebarReminders.length === 0 ? (
                <div className="mt-4 rounded-[22px] border border-dashed border-[#ecd9cf] bg-[#fcf8f5] px-4 py-5">
                  <p className="text-sm font-medium text-slate-700">No upcoming events yet.</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Events more than a week away will appear here.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {sidebarReminders.map((reminder) => (
                    <article
                      key={reminder.id}
                      className="rounded-[22px] border border-[#ecd9cf] bg-[#fcf8f5] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{reminder.title}</p>
                          <p className="mt-1 text-sm text-slate-500">{reminder.prettyDate}</p>
                        </div>

                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#e77756]">
                          {reminder.distanceLabel}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>

      <ContactsManagerModal
        open={isContactsManagerOpen}
        onClose={() => setIsContactsManagerOpen(false)}
        contacts={contacts}
        onAdd={() => { setIsContactsManagerOpen(false); setIsAddContactOpen(true); }}
        onRefresh={() => loadContacts(sessionUser.id)}
        onDelete={(c) => { setIsContactsManagerOpen(false); openDeleteContactModal(c); }}
        onOpenProfile={(p) => { setIsContactsManagerOpen(false); setProfileModal(p); }}
      />
      <AddContactModal
        open={isAddContactOpen}
        onClose={() => setIsAddContactOpen(false)}
        onSave={handleSaveContact}
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
      {profileModal && (
        <UserProfileModal
          userId={profileModal.userId}
          name={profileModal.name}
          avatarUrl={profileModal.avatarUrl}
          initials={profileModal.initials}
          onClose={() => setProfileModal(null)}
          currentUserId={sessionUser?.id}
        />
      )}
    </main>
  );
}
