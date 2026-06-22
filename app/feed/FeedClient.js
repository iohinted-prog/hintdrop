"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import AvatarMenu from "../components/AvatarMenu";

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
    note: "Accepted",
    initials: "M",
    colors: "from-[#efc3af] to-[#ae6e57]",
    email: "maya@example.com",
    contactState: "accepted",
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
    note: "Accepted",
    initials: "F",
    colors: "from-[#809168] to-[#41512e]",
    email: "fiona@example.com",
    contactState: "accepted",
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
    dot: "bg-[#d69aae]",
    pill: "bg-[#fff2f6] text-[#b85c79]",
    label: "Anniversary",
  },
  celebration: {
    dot: "bg-[#e6aa54]",
    pill: "bg-[#fff7e8] text-[#af7b14]",
    label: "Celebration",
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
  return status === "accepted" ? "accepted" : "invitee";
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

function getAvatarState(status) {
  return status === "accepted" ? "accepted" : "invitee";
}

function ContactAvatar({ contact }) {
  const avatarState = getAvatarState(contact.contactState);

  if (contact.isDemo && avatarState === "accepted") {
    return (
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-b text-[11px] font-bold text-white ${contact.colors}`}
      >
        {contact.initials}
      </div>
    );
  }

  if (contact.isDemo) {
    return (
      <div className="relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-[#dfb39d] bg-[#fff5ef] text-[12px] font-bold text-[#c87150]">
        {contact.initials}
        <span className="absolute -bottom-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full border border-[#e6c5b6] bg-[#fff0e8] px-1 text-[9px] font-bold text-[#c87150]">
          I
        </span>
      </div>
    );
  }

  if (avatarState === "accepted") {
    return (
      <div
        className={`relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-b text-[12px] font-bold text-white ${contact.colors}`}
      >
        {contact.initials}
        <span className="absolute -bottom-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full border border-[#e6c5b6] bg-[#2f3b2d] px-1 text-[9px] font-bold text-white">
          C
        </span>
      </div>
    );
  }

  return (
    <div className="relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-[#dfb39d] bg-[#fff5ef] text-[12px] font-bold text-[#c87150]">
      {contact.initials}
      <span className="absolute -bottom-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full border border-[#e6c5b6] bg-[#fff0e8] px-1 text-[9px] font-bold text-[#c87150]">
        I
      </span>
    </div>
  );
}

function ContactCard({ contact, onDeleteClick }) {
  return (
    <article className="rounded-[22px] border border-[#f0dfd6] bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center gap-3">
        <ContactAvatar contact={contact} />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{contact.name}</p>
          <p className="text-xs text-slate-500">
            {contact.role} · {contact.note}
          </p>
        </div>

        {!contact.isDemo ? (
          <button
            type="button"
            onClick={() => onDeleteClick(contact)}
            className="inline-flex h-9 items-center justify-center rounded-full border border-[#efc0ba] bg-[#fff4f2] px-3 text-[12px] font-semibold text-[#b14f43] hover:bg-[#ffe9e5]"
          >
            Delete
          </button>
        ) : null}
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

function AddContactModal({ open, onClose, onSave, supabase }) {
  const [contactSearch, setContactSearch] = useState("");
  const [contactResults, setContactResults] = useState([]);
  const [searchingContacts, setSearchingContacts] = useState(false);
  const [contactsMessage, setContactsMessage] = useState("");
  const [selectedRelationships, setSelectedRelationships] = useState(["Friend"]);
  const [form, setForm] = useState({ name: "", email: "" });
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
          "We couldnt access your linked Google contacts right now because the Google provider token is missing."
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
        setContactsMessage("We couldnt access your linked Google contacts right now.");
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
        setContactResults([]);
        setContactsMessage(result?.error?.message || "We couldnt search Google contacts right now.");
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
      setContactResults([]);
      setContactsMessage(error?.message || "We couldnt search Google contacts right now.");
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

          {contactsMessage ? <p className="mt-3 text-xs text-slate-500">{contactsMessage}</p> : null}
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

function DeleteContactModal({ open, onClose, onConfirm, contact, isDeleting, errorMessage }) {
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

  const actorHref = metadata.actor_profile_href || item.cta_href || "/feed";
  const actorInitials = metadata.actor_avatar_initials || getInitials(metadata.actor_name || item.headline || "H");
  const demoReactions = item.isDemo
    ? demoReactionsState
    : Array.isArray(metadata.demo_reactions)
      ? metadata.demo_reactions
      : [];
  const canInteract = item.isDemo || socialEnabled;

  return (
    <article className="rounded-[28px] border border-[#f0dfd6] bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <Link
          href={actorHref}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#efcdbf] to-[#bb8168] text-[12px] font-bold text-white transition hover:scale-[1.03]"
        >
          {actorInitials}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${bucketStyle}`}>
                  {bucketLabel}
                </span>
                {item.isDemo ? (
                  <span className="rounded-full border border-[#eadfd7] bg-[#fffaf7] px-2.5 py-1 text-[11px] font-medium text-slate-500">
                    Demo
                  </span>
                ) : null}
              </div>

              {metadata.actor_name ? (
                <Link
                  href={actorHref}
                  className="mt-3 inline-block text-[13px] font-semibold text-slate-900 hover:text-[#d96d4f]"
                >
                  {metadata.actor_name}
                </Link>
              ) : null}

              <p className="mt-1 text-[15px] leading-7 text-slate-700">{item.headline}</p>
              {item.body ? (
                <p className="mt-1 text-[14px] leading-6 text-slate-500">{item.body}</p>
              ) : null}
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
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {demoReactions.map((reaction) => (
                <button
                  key={reaction.id}
                  type="button"
                  onClick={() => item.isDemo && onToggleDemoReaction(item.id, reaction.id)}
                  className={`inline-flex h-9 items-center justify-center rounded-full border px-3 text-sm font-medium ${
                    item.isDemo
                      ? reaction.active
                        ? "border-[#f1a58a] bg-[#fff1ea] text-[#d96d4f]"
                        : "border-[#ebdfd8] bg-white text-slate-600 hover:bg-slate-50"
                      : "border-[#ebdfd8] bg-white text-slate-600"
                  }`}
                >
                  <span className="mr-1">{reaction.emoji}</span>
                  {reaction.count}
                </button>
              ))}

              <button
                type="button"
                onClick={() =>
                  setActiveComposerId((current) => (current === item.id ? null : item.id))
                }
                className="inline-flex h-9 items-center justify-center rounded-full border border-[#ebdfd8] bg-white px-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Comment
              </button>
            </div>
          ) : null}

          {comments.length > 0 ? (
            <div className="mt-4 space-y-3 border-t border-[#f2e5de] pt-4">
              {comments.map((comment) => (
                <div key={comment.id} className="rounded-[18px] bg-[#fffaf7] px-4 py-3">
                  <p className="text-[12px] font-semibold text-slate-700">
                    {comment.author_name || "Someone"}{" "}
                    <span className="font-normal text-slate-400">
                      {formatRelativeFromDate(comment.created_at)}
                    </span>
                  </p>
                  <p className="mt-1 text-[13px] leading-6 text-slate-600">{comment.body}</p>
                </div>
              ))}
            </div>
          ) : null}

          {activeComposerId === item.id ? (
            <div className="mt-4 space-y-3 border-t border-[#f2e5de] pt-4">
              <textarea
                value={draftComment}
                onChange={(e) => setDraftComment(e.target.value)}
                rows={3}
                placeholder="Add a comment"
                className="w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveComposerId(null);
                    setDraftComment("");
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-4 text-sm font-medium text-slate-700 hover:bg-[#fff5f0]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => onSubmitComment(item)}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-4 text-sm font-semibold text-white shadow-lg"
                >
                  Post comment
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ReminderCalendar({ events, selectedDate, onSelectDate, currentMonth, setCurrentMonth }) {
  const monthData = getMonthData(currentMonth);

  return (
    <section className="rounded-[28px] border border-[#f0dfd6] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Planner
          </p>
          <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.04em] text-slate-900">
            Calendar
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setCurrentMonth(
                (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
              )
            }
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#ead8ce] bg-white text-slate-500 hover:bg-[#fff5f0]"
          >
            ←
          </button>
          <div className="min-w-[120px] text-center text-sm font-semibold text-slate-700">
            {currentMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          </div>
          <button
            type="button"
            onClick={() =>
              setCurrentMonth(
                (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
              )
            }
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#ead8ce] bg-white text-slate-500 hover:bg-[#fff5f0]"
          >
            →
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-7 gap-2">
        {monthData.map((cell) => {
          const isoDate = cell.date.toISOString().slice(0, 10);
          const isSelected = selectedDate === isoDate;
          const matchingEvents = events.filter((event) => event.date === isoDate);

          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => onSelectDate(isoDate)}
              className={`min-h-[74px] rounded-[18px] border px-2 py-2 text-left transition ${
                isSelected
                  ? "border-[#f0a384] bg-[#fff4ee]"
                  : cell.currentMonth
                    ? "border-[#efe1d9] bg-[#fffdfa] hover:bg-[#fff8f4]"
                    : "border-[#f3ebe6] bg-[#fdf9f7] text-slate-300"
              }`}
            >
              <div className="text-[12px] font-semibold">{cell.day}</div>
              <div className="mt-2 space-y-1">
                {matchingEvents.slice(0, 2).map((event) => {
                  const style =
                    eventTypeStyles[String(event.type || "").toLowerCase()] ||
                    eventTypeStyles.celebration;

                  return (
                    <div
                      key={event.id}
                      className={`truncate rounded-full px-2 py-1 text-[10px] font-semibold ${style.pill}`}
                    >
                      {event.title}
                    </div>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ReminderEventCard({ event, onDeleteClick }) {
  const eventKey = String(event.type || "").toLowerCase();
  const style = eventTypeStyles[eventKey] || eventTypeStyles.celebration;
  const diffDays = diffInDaysFromToday(event.date);

  return (
    <article className="rounded-[24px] border border-[#f0dfd6] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${style.pill}`}>
              {style.label}
            </span>
          </div>

          <h3 className="mt-3 text-[18px] font-semibold tracking-[-0.03em] text-slate-900">
            {event.title}
          </h3>
          <p className="mt-1 text-[13px] text-slate-500">{event.date}</p>
        </div>

        <button
          type="button"
          onClick={() => onDeleteClick(event)}
          className="inline-flex h-9 items-center justify-center rounded-full border border-[#efc0ba] bg-[#fff4f2] px-3 text-[12px] font-semibold text-[#b14f43] hover:bg-[#ffe9e5]"
        >
          Delete
        </button>
      </div>

      <div className="mt-4 rounded-[18px] bg-[#fffaf7] p-4">
        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          Selected day
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-900">{event.title}</p>
        <p className="mt-1 text-[13px] text-slate-500">
          {diffDays === null ? "No timing available" : formatReminderDistance(diffDays)}
        </p>
      </div>
    </article>
  );
}

function AddReminderModal({ open, onClose, onSave, selectedDate }) {
  const [form, setForm] = useState({
    title: "",
    date: selectedDate || "",
    type: "Birthday",
  });

  useEffect(() => {
    if (open) {
      setForm({
        title: "",
        date: selectedDate || "",
        type: "Birthday",
      });
    }
  }, [open, selectedDate]);

  async function handleSave() {
    await onSave(form);
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      eyebrow="Planner"
      title="Create new event"
      maxWidth="max-w-[680px]"
    >
      <div className="space-y-5 p-6">
        <label className="block">
          <span className="block text-sm font-medium text-slate-900">Event title</span>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Dad's birthday"
            className="mt-2 h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="block text-sm font-medium text-slate-900">Date</span>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              className="mt-2 h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
            />
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-slate-900">Type</span>
            <select
              value={form.type}
              onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
              className="mt-2 h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
            >
              <option value="Birthday">Birthday</option>
              <option value="Anniversary">Anniversary</option>
              <option value="Celebration">Celebration</option>
            </select>
          </label>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-5 text-sm font-medium text-slate-700 hover:bg-[#fff5f0]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-5 text-sm font-semibold text-white shadow-lg"
          >
            Save event
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function DeleteReminderModal({ open, onClose, onConfirm, eventToDelete }) {
  if (!open || !eventToDelete) return null;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      eyebrow="Delete event"
      title="Delete reminder"
      maxWidth="max-w-[620px]"
    >
      <div className="space-y-5 p-6">
        <div className="rounded-[22px] border border-[#efc0ba] bg-[#fff4f2] p-4">
          <p className="text-sm font-semibold text-[#b14f43]">
            This will permanently delete {eventToDelete.title} from your calendar.
          </p>
        </div>

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
            onClick={() => onConfirm(eventToDelete)}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-[#b14f43] px-6 text-sm font-semibold text-white"
          >
            Delete event
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

export default function FeedClient() {
  const [contacts, setContacts] = useState(demoContacts);
  const [feedItems, setFeedItems] = useState([firstLookCard]);
  const [commentsByItem, setCommentsByItem] = useState({
    [firstLookCard.id]: firstLookCard.metadata.demo_comments,
  });
  const [demoReactionsByItem, setDemoReactionsByItem] = useState({
    [firstLookCard.id]: firstLookCard.metadata.demo_reactions,
  });

  const [calendarEventsState, setCalendarEventsState] = useState([
    { id: 1, title: "Sarah's Birthday", date: "2026-06-29", type: "Birthday" },
    { id: 2, title: "Mum & Dad Anniversary", date: "2026-07-10", type: "Anniversary" },
    { id: 3, title: "James Promotion Dinner", date: "2026-07-16", type: "Celebration" },
  ]);

  const [selectedFilter, setSelectedFilter] = useState("all");
  const [activeComposerId, setActiveComposerId] = useState(null);
  const [draftComment, setDraftComment] = useState("");

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isDeleteContactOpen, setIsDeleteContactOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState(null);

  const [isAddReminderOpen, setIsAddReminderOpen] = useState(false);
  const [isDeleteReminderOpen, setIsDeleteReminderOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);

  const [pageError, setPageError] = useState("");

  const filteredFeedItems = useMemo(() => {
    if (selectedFilter === "all") return feedItems;
    return feedItems.filter((item) => getFeedBucket(item) === selectedFilter);
  }, [feedItems, selectedFilter]);

  const selectedDateEvents = useMemo(() => {
    return calendarEventsState.filter((event) => event.date === selectedDate);
  }, [calendarEventsState, selectedDate]);

  useEffect(() => {
    async function loadFeedData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { data: contactRows, error: contactError } = await supabase
          .from("contacts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (contactError) {
          throw new Error(normalizeSupabaseError(contactError, "Failed to load contacts."));
        }

        if (Array.isArray(contactRows) && contactRows.length > 0) {
          const mappedContacts = contactRows.map((row) => {
            const roleLabel = relationshipToRoleLabel(row.relationship_types, row.role);
            const contactState = mapContactState(row.status);
            const isAccepted = contactState === "accepted";

            return {
              id: row.id,
              name: row.name || row.email || "Unnamed contact",
              role: roleLabel,
              note: isAccepted ? "Accepted" : "Invitee",
              initials: getInitials(row.name || row.email || "Unnamed contact"),
              colors: isAccepted
                ? "from-[#8aa587] to-[#4e684d]"
                : "from-[#efcdbf] to-[#bb8168]",
              email: row.email || "",
              contactState,
              isDemo: false,
            };
          });

          setContacts(mappedContacts);
        }
      } catch (error) {
        setPageError(error?.message || "Failed to load feed.");
      }
    }

    loadFeedData();
  }, []);

  const handleSaveContact = useCallback(async (payload) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("You must be signed in to save contacts.");
    }

    const cleanedEmail = String(payload.email || "").trim().toLowerCase();

    const insertPayload = {
      user_id: user.id,
      name: payload.name,
      email: cleanedEmail,
      role: Array.isArray(payload.relationshipTypes) ? payload.relationshipTypes[0] : "Friend",
      relationship_types: payload.relationshipTypes,
      status: "invitee",
    };

    const { data, error } = await supabase.from("contacts").insert(insertPayload).select("*").single();

    if (error) {
      throw new Error(normalizeSupabaseError(error, "Failed to save contact."));
    }

    const roleLabel = relationshipToRoleLabel(data.relationship_types, data.role);

    setContacts((prev) => [
      {
        id: data.id,
        name: data.name || data.email || "Unnamed contact",
        role: roleLabel,
        note: "Invitee",
        initials: getInitials(data.name || data.email || "Unnamed contact"),
        colors: "from-[#efcdbf] to-[#bb8168]",
        email: data.email || "",
        contactState: "invitee",
        isDemo: false,
      },
      ...prev.filter((contact) => !contact.isDemo),
    ]);
  }, []);

  const handleDeleteContact = useCallback((contact) => {
    setContactToDelete(contact);
    setIsDeleteContactOpen(true);
  }, []);

  const handleConfirmDeleteContact = useCallback(async (contact) => {
    try {
      const { error } = await supabase.from("contacts").delete().eq("id", contact.id);

      if (error) {
        throw new Error(normalizeSupabaseError(error, "Failed to delete contact."));
      }

      setContacts((prev) => prev.filter((item) => item.id !== contact.id));
      setIsDeleteContactOpen(false);
      setContactToDelete(null);
    } catch (error) {
      setPageError(error?.message || "Failed to delete contact.");
    }
  }, []);

  const handleSubmitComment = useCallback((item) => {
    if (!draftComment.trim()) return;

    setCommentsByItem((prev) => {
      const current = Array.isArray(prev[item.id]) ? prev[item.id] : [];
      return {
        ...prev,
        [item.id]: [
          ...current,
          {
            id: `${item.id}-${Date.now()}`,
            author_name: "You",
            body: draftComment.trim(),
            created_at: new Date().toISOString(),
          },
        ],
      };
    });

    setDraftComment("");
    setActiveComposerId(null);
  }, [draftComment]);

  const handleToggleDemoReaction = useCallback((itemId, reactionId) => {
    setDemoReactionsByItem((prev) => {
      const existing = Array.isArray(prev[itemId]) ? prev[itemId] : [];
      const updated = existing.map((reaction) => {
        if (reaction.id !== reactionId) return reaction;

        const active = !reaction.active;
        return {
          ...reaction,
          active,
          count: active ? reaction.count + 1 : Math.max(0, reaction.count - 1),
        };
      });

      return {
        ...prev,
        [itemId]: updated,
      };
    });
  }, []);

  const handleSaveReminder = useCallback(async (form) => {
    const nextEvent = {
      id: Date.now(),
      title: form.title,
      date: form.date,
      type: form.type,
    };

    setCalendarEventsState((prev) => [...prev, nextEvent]);
    setSelectedDate(form.date);
    setCurrentMonth(parseDateOnly(form.date) || new Date());
    setIsAddReminderOpen(false);
  }, []);

  const handleDeleteReminder = useCallback((event) => {
    setEventToDelete(event);
    setIsDeleteReminderOpen(true);
  }, []);

  const handleConfirmDeleteReminder = useCallback((event) => {
    setCalendarEventsState((prev) => prev.filter((item) => item.id !== event.id));
    setIsDeleteReminderOpen(false);
    setEventToDelete(null);
  }, []);

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
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#2f3b2d] px-4 text-[14px] font-semibold text-white sm:px-5"
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
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-4 text-[14px] font-semibold text-slate-700 hover:bg-[#fff5f0] sm:px-5"
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
        {pageError ? (
          <div className="mb-5 rounded-[22px] border border-[#efc0ba] bg-[#fff4f2] px-4 py-3 text-sm text-[#b14f43]">
            {pageError}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
          <aside className="space-y-5">
            <section className="rounded-[28px] border border-[#f0dfd6] bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Contacts
                  </p>
                  <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.04em] text-slate-900">
                    Your people
                  </h2>
                  <p className="mt-2 text-[14px] leading-7 text-slate-600">
                    Accepted contacts show with a full avatar, while invitees stay dotted until they join.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {contacts.map((contact) => (
                  <ContactCard key={contact.id} contact={contact} onDeleteClick={handleDeleteContact} />
                ))}
              </div>

              <button
                type="button"
                onClick={() => setIsAddContactOpen(true)}
                className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-4 text-sm font-semibold text-white shadow-lg"
              >
                Add contact
              </button>
            </section>
          </aside>

          <section className="min-w-0">
            <div className="mb-5">
              <div className="inline-flex rounded-full bg-[#fff4ee] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#e37b57]">
                Activity
              </div>
              <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.06em] text-slate-900 sm:text-[40px]">
                Keep up with hints, circles, reminders, and contacts.
              </h1>
              <p className="mt-3 max-w-[760px] text-[15px] leading-7 text-slate-600">
                Your feed collects the small moments around gifting, planning, and shared circles so you can spot what matters without digging through separate screens.
              </p>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              {feedFilters.map((filter) => {
                const selected = selectedFilter === filter.key;

                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setSelectedFilter(filter.key)}
                    className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold transition ${
                      selected
                        ? "bg-[#2f3b2d] text-white"
                        : "border border-[#ead8ce] bg-white text-slate-700 hover:bg-[#fff5f0]"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>

            <div className="space-y-5">
              {filteredFeedItems.map((item) => (
                <FeedItem
                  key={item.id}
                  item={item}
                  comments={commentsByItem[item.id] || []}
                  activeComposerId={activeComposerId}
                  setActiveComposerId={setActiveComposerId}
                  draftComment={draftComment}
                  setDraftComment={setDraftComment}
                  onSubmitComment={handleSubmitComment}
                  demoReactionsState={demoReactionsByItem[item.id] || []}
                  onToggleDemoReaction={handleToggleDemoReaction}
                />
              ))}
            </div>
          </section>

          <aside className="space-y-5">
            <ReminderCalendar
              events={calendarEventsState}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              currentMonth={currentMonth}
              setCurrentMonth={setCurrentMonth}
            />

            <section className="rounded-[28px] border border-[#f0dfd6] bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Selected day
                  </p>
                  <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.04em] text-slate-900">
                    Events
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddReminderOpen(true)}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-4 text-sm font-semibold text-white shadow-lg"
                >
                  Add
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {selectedDateEvents.length ? (
                  selectedDateEvents.map((event) => (
                    <ReminderEventCard key={event.id} event={event} onDeleteClick={handleDeleteReminder} />
                  ))
                ) : (
                  <div className="rounded-[20px] border border-dashed border-[#e5d8cf] bg-[#fffdfa] p-4 text-sm text-slate-500">
                    No events saved on this date yet.
                  </div>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>

      <AddContactModal
        open={isAddContactOpen}
        onClose={() => setIsAddContactOpen(false)}
        onSave={handleSaveContact}
        supabase={supabase}
      />

      <DeleteContactModal
        open={isDeleteContactOpen}
        onClose={() => {
          setIsDeleteContactOpen(false);
          setContactToDelete(null);
        }}
        onConfirm={handleConfirmDeleteContact}
        contact={contactToDelete}
        isDeleting={false}
        errorMessage=""
      />

      <AddReminderModal
        open={isAddReminderOpen}
        onClose={() => setIsAddReminderOpen(false)}
        onSave={handleSaveReminder}
        selectedDate={selectedDate}
      />

      <DeleteReminderModal
        open={isDeleteReminderOpen}
        onClose={() => {
          setIsDeleteReminderOpen(false);
          setEventToDelete(null);
        }}
        onConfirm={handleConfirmDeleteReminder}
        eventToDelete={eventToDelete}
      />
    </main>
  );
}
