"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import AvatarMenu from "../components/AvatarMenu";

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
    role: "Friend",
    note: "Accepted",
    initials: "M",
    colors: "from-[#efcdbf] to-[#bb8168]",
    email: "maya@example.com",
    phone: "",
    birthday: "",
    status: "accepted",
  },
  {
    id: "demo-2",
    name: "Leo",
    role: "Colleague",
    note: "Invitee",
    initials: "L",
    colors: "from-[#b7c8db] to-[#6b88a7]",
    email: "leo@example.com",
    phone: "",
    birthday: "",
    status: "invitee",
  },
];

const firstLookCard = {
  id: "first-look-card",
  owner_user_id: "demo-user",
  family: "hint",
  item_type: "demo",
  visibility: "private",
  circle_id: null,
  activity_session_id: null,
  source_event_id: null,
  headline: "Welcome to your feed",
  body: "Once contacts, reminders, and circles start flowing in, your activity will show up here.",
  cta_label: "Browse hints",
  cta_href: "/hints",
  occurred_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  metadata: {
    social_enabled: true,
    actor_name: "Hinted",
    demo_comments: [
      { id: "demo-c1", author_name: "Maya", body: "Love this setup." },
      { id: "demo-c2", author_name: "Leo", body: "Looks clean already." },
    ],
  },
  isDemo: true,
};

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

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim().toLowerCase());
}

function normalizeSupabaseError(error, fallback) {
  if (!error) return fallback;
  const parts = [error.message, error.details, error.hint].filter(Boolean);
  return parts.length ? parts.join(" — ") : fallback;
}

function parseDateOnly(value) {
  if (!value) return null;
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function diffInDaysFromToday(value) {
  const parsed = parseDateOnly(value);
  if (!parsed) return null;

  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());

  const diffMs = target.getTime() - startToday.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function formatReminderDistance(diffDays) {
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === 7) return "In 1 week";
  return `In ${diffDays} days`;
}

function getFeedBucket(item) {
  if (item.family === "reminder") return "reminder";
  if (item.family === "circle") return "circle";
  if (item.family === "hint") return "hint";
  if (item.family === "contact") return "contact";
  return "all";
}

function isSocialFeedItem(item) {
  return Boolean(item?.metadata?.social_enabled);
}

function buildContactRecordFromRow(row) {
  const relationship = row?.role || "Friend";
  const safeName = row?.name || row?.email || "Unnamed contact";

  return {
    id: row.id,
    name: safeName,
    role: relationship,
    note: getStatusLabel(row?.status),
    initials: getInitials(safeName),
    colors: getRelationshipGradient(relationship),
    email: row?.email || "",
    phone: "",
    birthday: "",
    status: getAvatarState(row?.status),
    raw: row,
  };
}

function LogoMark() {
  return (
    <div className="relative flex h-11 w-11 items-center justify-center rounded-[16px] bg-gradient-to-b from-[#ffa47f] to-[#ff875d] text-white shadow-lg">
      <span className="text-lg">🎁</span>
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
  const composerOpen = activeComposerId === item.id;
  const reactions = demoReactionsState || item.metadata?.demo_reactions || [];
  const actorName = item.metadata?.actor_name || "Hinted";

  return (
    <article className="rounded-[24px] border border-[#f0dfd6] bg-[#fffdfa] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#df7b59]">
            {item.family}
          </p>
          <h3 className="mt-2 text-[20px] font-semibold tracking-[-0.04em] text-slate-900">
            {item.headline}
          </h3>
          <p className="mt-2 text-[14px] leading-7 text-slate-600">{item.body}</p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-[12px] font-medium text-slate-400">{actorName}</p>
          <p className="mt-1 text-[12px] text-slate-400">
            {new Date(item.occurred_at || item.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })}
          </p>
        </div>
      </div>

      {item.cta_label && item.cta_href ? (
        <div className="mt-4">
          <Link
            href={item.cta_href}
            className="inline-flex h-10 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-[#fff5f0]"
          >
            {item.cta_label}
          </Link>
        </div>
      ) : null}

      {isSocialFeedItem(item) ? (
        <div className="mt-5 border-t border-[#f0e3dc] pt-4">
          {reactions.length ? (
            <div className="mb-4 flex flex-wrap gap-2">
              {reactions.map((reaction) => (
                <button
                  key={reaction.id}
                  type="button"
                  onClick={() => onToggleDemoReaction(item.id, reaction.id)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm ${
                    reaction.active
                      ? "border-[#f19b7e] bg-[#fff1ea] text-[#c96847]"
                      : "border-[#ead8ce] bg-white text-slate-600"
                  }`}
                >
                  <span>{reaction.emoji}</span>
                  <span>{reaction.count}</span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="rounded-[18px] bg-white p-3">
                <p className="text-[13px] font-semibold text-slate-900">
                  {comment.author_name || "Someone"}
                </p>
                <p className="mt-1 text-[13px] leading-6 text-slate-600">{comment.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-4">
            {composerOpen ? (
              <div className="space-y-3">
                <textarea
                  value={draftComment}
                  onChange={(e) => setDraftComment(e.target.value)}
                  placeholder="Add a comment"
                  className="min-h-[96px] w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => onSubmitComment(item)}
                    className="inline-flex h-10 items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-4 text-sm font-semibold text-white shadow-lg"
                  >
                    Post comment
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveComposerId(null);
                      setDraftComment("");
                    }}
                    className="inline-flex h-10 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-4 text-sm font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setActiveComposerId(item.id)}
                className="inline-flex h-10 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-[#fff5f0]"
              >
                Comment
              </button>
            )}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function MiniCalendar({
  eventsByDate,
  calendarLoading,
  calendarError,
  onCreateEvent,
  onDeleteEvent,
}) {
  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    eventDate: "",
    type: "birthday",
  });
  const [localError, setLocalError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const monthCells = useMemo(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];

    for (let i = 0; i < startOffset; i += 1) {
      cells.push({ key: `empty-${i}`, empty: true });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      const key = date.toISOString().slice(0, 10);
      cells.push({
        key,
        empty: false,
        day,
        dateKey: key,
        events: eventsByDate[key] || [],
      });
    }

    return cells;
  }, [monthDate, eventsByDate]);

  async function handleSubmit() {
    if (!form.title.trim()) {
      setLocalError("Event title is required.");
      return;
    }

    if (!form.eventDate) {
      setLocalError("Event date is required.");
      return;
    }

    setLocalError("");
    setIsSubmitting(true);

    try {
      await onCreateEvent(form);
      setForm({
        title: "",
        eventDate: "",
        type: "birthday",
      });
      setIsCreating(false);
    } catch (error) {
      setLocalError(error?.message || "Could not save event.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-[#f0dfd6] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Calendar
          </p>
          <h2 className="mt-1 text-base font-semibold text-slate-900">
            Upcoming occasions
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setIsCreating((prev) => !prev)}
          className="inline-flex h-10 items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-4 text-sm font-semibold text-white shadow-lg"
        >
          {isCreating ? "Close" : "Add event"}
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            setMonthDate(
              (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
            )
          }
          className="rounded-full border border-[#ead8ce] bg-white px-3 py-1.5 text-sm font-semibold text-slate-700"
        >
          ←
        </button>

        <p className="text-sm font-semibold text-slate-900">
          {monthDate.toLocaleDateString("en-GB", {
            month: "long",
            year: "numeric",
          })}
        </p>

        <button
          type="button"
          onClick={() =>
            setMonthDate(
              (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
            )
          }
          className="rounded-full border border-[#ead8ce] bg-white px-3 py-1.5 text-sm font-semibold text-slate-700"
        >
          →
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-7 gap-2">
        {monthCells.map((cell) =>
          cell.empty ? (
            <div key={cell.key} className="h-16 rounded-[14px] bg-[#faf7f4]" />
          ) : (
            <div
              key={cell.key}
              className="min-h-[64px] rounded-[14px] border border-[#efe1d9] bg-[#fffdfa] p-2"
            >
              <p className="text-[12px] font-semibold text-slate-900">{cell.day}</p>

              <div className="mt-1 space-y-1">
                {cell.events.slice(0, 2).map((event) => (
                  <div
                    key={event.id}
                    className="rounded-full bg-[#fff1ea] px-2 py-1 text-[10px] font-semibold text-[#c96d4f]"
                    title={event.title}
                  >
                    {event.title}
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>

      {calendarLoading ? (
        <p className="mt-4 text-sm text-slate-500">Loading calendar...</p>
      ) : null}

      {calendarError ? (
        <div className="mt-4 rounded-[18px] border border-[#efc0ba] bg-[#fff4f2] px-4 py-3 text-sm text-[#b14f43]">
          {calendarError}
        </div>
      ) : null}

      {isCreating ? (
        <div className="mt-5 rounded-[22px] border border-[#efe1d9] bg-[#fffdfa] p-4">
          <div className="space-y-3">
            <label className="block">
              <span className="block text-sm font-medium text-slate-900">Title</span>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className="mt-2 h-11 w-full rounded-[16px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
                placeholder="Mum's birthday"
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-slate-900">Date</span>
              <input
                type="date"
                value={form.eventDate}
                onChange={(e) => setForm((prev) => ({ ...prev, eventDate: e.target.value }))}
                className="mt-2 h-11 w-full rounded-[16px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-slate-900">Type</span>
              <select
                value={form.type}
                onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                className="mt-2 h-11 w-full rounded-[16px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
              >
                <option value="birthday">Birthday</option>
                <option value="anniversary">Anniversary</option>
                <option value="celebration">Celebration</option>
              </select>
            </label>

            {localError ? (
              <div className="rounded-[18px] border border-[#efc0ba] bg-[#fff4f2] px-4 py-3 text-sm text-[#b14f43]">
                {localError}
              </div>
            ) : null}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-semibold text-white shadow-lg ${
                  isSubmitting
                    ? "cursor-not-allowed bg-[#e9a48d]"
                    : "bg-gradient-to-b from-[#ff946d] to-[#f36f64]"
                }`}
              >
                {isSubmitting ? "Saving..." : "Save event"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-5 space-y-2">
        {Object.entries(eventsByDate)
          .flatMap(([dateKey, items]) =>
            items.map((event) => ({
              ...event,
              dateKey,
            }))
          )
          .sort((a, b) => new Date(a.dateKey).getTime() - new Date(b.dateKey).getTime())
          .slice(0, 6)
          .map((event) => (
            <div
              key={`${event.id}-${event.dateKey}`}
              className="flex items-center justify-between rounded-[18px] bg-[#faf7f4] px-3 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                <p className="mt-1 text-[12px] text-slate-500">{event.dateKey}</p>
              </div>

              <button
                type="button"
                onClick={() => onDeleteEvent({ id: event.id })}
                className="inline-flex h-9 items-center justify-center rounded-full border border-[#efc0ba] bg-[#fff4f2] px-3 text-[12px] font-semibold text-[#b14f43]"
              >
                Delete
              </button>
            </div>
          ))}
      </div>
    </section>
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
          name: person.names?.[0]?.displayName || "",
          email: person.emailAddresses?.[0]?.value || "",
        }))
        .filter((person) => person.name || person.email);

      setContactResults(mapped);

      if (mapped.length === 0) {
        setContactsMessage("No matching Google contacts found. You can still type their email manually.");
      }
    } catch (error) {
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
      setSaveError(error?.message || "Failed to save contact.");
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(42,26,20,0.38)] px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-[760px] overflow-hidden rounded-[34px] border border-[#eddacf] bg-[#fffaf7] shadow-[0_24px_80px_rgba(88,46,31,0.22)]">
        <div className="flex items-center justify-between border-b border-[#efe0d7] px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#df7b59]">
              Contact
            </p>
            <h2 className="mt-1 text-[28px] font-semibold tracking-[-0.05em] text-slate-900">
              Add a contact
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
    if (!open) {
      setTypedName("");
    }
  }, [open]);

  if (!open || !contact) return null;

  const expectedName = String(contact.name || "").trim();
  const matches = typedName.trim() === expectedName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(42,26,20,0.38)] px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-[620px] overflow-hidden rounded-[34px] border border-[#eddacf] bg-[#fffaf7] shadow-[0_24px_80px_rgba(88,46,31,0.22)]">
        <div className="flex items-center justify-between border-b border-[#efe0d7] px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#df7b59]">
              Delete contact
            </p>
            <h2 className="mt-1 text-[28px] font-semibold tracking-[-0.05em] text-slate-900">
              Delete {contact.name}
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
      </div>
    </div>
  );
}

export default function FeedPage() {
  const supabase = createClient();

  const [sessionUser, setSessionUser] = useState(null);

  const [contacts, setContacts] = useState([]);
  const [feedItems, setFeedItems] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [commentsByFeedId, setCommentsByFeedId] = useState({});

  const [contactsLoading, setContactsLoading] = useState(true);
  const [feedLoading, setFeedLoading] = useState(true);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(true);

  const [contactError, setContactError] = useState("");
  const [contactSuccess, setContactSuccess] = useState("");
  const [feedError, setFeedError] = useState("");
  const [invitesError, setInvitesError] = useState("");
  const [calendarError, setCalendarError] = useState("");

  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isDeleteContactOpen, setIsDeleteContactOpen] = useState(false);
  const [selectedContactToDelete, setSelectedContactToDelete] = useState(null);
  const [deleteContactError, setDeleteContactError] = useState("");
  const [isDeletingContact, setIsDeletingContact] = useState(false);

  const [activeFilter, setActiveFilter] = useState("all");
  const [activeInvite, setActiveInvite] = useState(null);
  const [inviteActionId, setInviteActionId] = useState(null);

  const [activeComposerId, setActiveComposerId] = useState(null);
  const [draftComment, setDraftComment] = useState("");
  const [demoCommentsByFeedId, setDemoCommentsByFeedId] = useState({});
  const [demoReactionsByFeedId, setDemoReactionsByFeedId] = useState({});

  const loadSession = useCallback(async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      throw new Error(normalizeSupabaseError(error, "Failed to load session."));
    }

    setSessionUser(user || null);
    return user || null;
  }, [supabase]);

  const loadContacts = useCallback(
    async (userId) => {
      setContactsLoading(true);
      setContactError("");

      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        setContacts([]);
        setContactsLoading(false);
        throw new Error(normalizeSupabaseError(error, "Failed to load contacts."));
      }

      setContacts((data || []).map(buildContactRecordFromRow));
      setContactsLoading(false);
    },
    [supabase]
  );

  const loadFeedItems = useCallback(async () => {
    setFeedLoading(true);
    setFeedError("");

    const { data, error } = await supabase
      .from("feed_items")
      .select("*")
      .order("occurred_at", { ascending: false });

    if (error) {
      setFeedItems([]);
      setFeedLoading(false);
      throw new Error(normalizeSupabaseError(error, "Failed to load feed."));
    }

    setFeedItems(data || []);
    setFeedLoading(false);
  }, [supabase]);

  const loadInvites = useCallback(async () => {
    setInvitesLoading(true);
    setInvitesError("");

    const { data, error } = await supabase
      .from("circle_invites")
      .select("*")
      .in("status", ["pending", "viewed"])
      .order("created_at", { ascending: false });

    if (error) {
      setPendingInvites([]);
      setInvitesLoading(false);
      throw new Error(normalizeSupabaseError(error, "Failed to load invites."));
    }

    setPendingInvites(data || []);
    setInvitesLoading(false);
  }, [supabase]);

  const loadCalendarEvents = useCallback(
    async (userId) => {
      setCalendarLoading(true);
      setCalendarError("");

      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", userId)
        .order("event_date", { ascending: true });

      if (error) {
        setCalendarEvents([]);
        setCalendarLoading(false);
        throw new Error(normalizeSupabaseError(error, "Failed to load calendar."));
      }

      setCalendarEvents(data || []);
      setCalendarLoading(false);
    },
    [supabase]
  );

  const loadComments = useCallback(
    async (feedIds) => {
      if (!feedIds.length) {
        setCommentsByFeedId({});
        return;
      }

      const { data, error } = await supabase
        .from("feed_comments")
        .select("*")
        .in("feed_item_id", feedIds)
        .order("created_at", { ascending: true });

      if (error) {
        throw new Error(normalizeSupabaseError(error, "Failed to load comments."));
      }

      const grouped = (data || []).reduce((acc, row) => {
        if (!acc[row.feed_item_id]) acc[row.feed_item_id] = [];
        acc[row.feed_item_id].push(row);
        return acc;
      }, {});

      setCommentsByFeedId(grouped);
    },
    [supabase]
  );

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const user = await loadSession();
        if (!active || !user) return;

        await Promise.all([
          loadContacts(user.id),
          loadFeedItems(),
          loadInvites(),
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
    } else {
      setCommentsByFeedId({});
    }
  }, [feedItems, loadComments]);

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

    const relationshipTypes =
      Array.isArray(payload.relationshipTypes) && payload.relationshipTypes.length
        ? payload.relationshipTypes
        : ["Friend"];

    const insertPayload = {
      user_id: sessionUser.id,
      name: payload.name,
      email: cleanedEmail,
      role: relationshipTypes[0],
      status: "invitee",
      source: "manual",
    };

    const { error } = await supabase.from("contacts").insert(insertPayload);

    if (error) {
      throw new Error(normalizeSupabaseError(error, "Failed to save contact."));
    }

    await loadContacts(sessionUser.id);
    setContactSuccess("Contact saved successfully.");
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

      await loadContacts(sessionUser.id);
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

  async function handleInviteDecision(invite, nextStatus) {
    setInviteActionId(invite.id);
    setInvitesError("");

    try {
      const { error } = await supabase
        .from("circle_invites")
        .update({ status: nextStatus })
        .eq("id", invite.id);

      if (error) throw new Error(normalizeSupabaseError(error, "Could not update invite."));

      await loadInvites();
      setActiveInvite(null);
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
    };

    const { data, error } = await supabase
      .from("calendar_events")
      .insert(insertPayload)
      .select()
      .single();

    if (error) throw new Error(normalizeSupabaseError(error, "Could not save event."));

    setCalendarEvents((prev) => {
      const next = [...prev, data];
      next.sort((a, b) => {
        const aTime = new Date(a.event_date).getTime();
        const bTime = new Date(b.event_date).getTime();
        return aTime - bTime;
      });
      return next;
    });
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
          headline:
            diffDays === 0
              ? `${event.title} is today`
              : diffDays === 1
                ? `${event.title} is tomorrow`
                : diffDays === 7
                  ? `${event.title} is in 1 week`
                  : `${event.title} is in ${diffDays} days`,
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
    return (calendarEvents || []).reduce((acc, row) => {
      const key = row.event_date;
      if (!key) return acc;
      if (!acc[key]) acc[key] = [];
      acc[key].push({
        id: row.id,
        title: row.title,
        type: row.type || "celebration",
        source: row.source || "user",
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
                <div className="mt-4 space-y-3">
                  {pendingInvites.map((invite) => (
                    <article
                      key={invite.id}
                      className="rounded-[22px] border border-[#ecd9cf] bg-[#fcf8f5] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">
                            {invite.invite_name || invite.invite_email || "Circle invite"}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {invite.invite_email || "No email attached"}
                          </p>
                        </div>

                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#e77756]">
                          {invite.status}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveInvite(invite)}
                          disabled={inviteActionId === invite.id}
                          className="inline-flex items-center justify-center rounded-full border border-[#ee8d69] bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                        >
                          {inviteActionId === invite.id ? "Working..." : "View invite"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleInviteDecision(invite, "viewed")}
                          disabled={inviteActionId === invite.id}
                          className="inline-flex items-center justify-center rounded-full border border-[#dbe8d4] bg-[#eef8e9] px-4 py-2 text-sm font-semibold text-[#4b7a39] disabled:opacity-60"
                        >
                          {inviteActionId === invite.id ? "Working..." : "Mark viewed"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleInviteDecision(invite, "declined")}
                          disabled={inviteActionId === invite.id}
                          className="inline-flex items-center justify-center rounded-full border border-[#ead7cd] bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
                        >
                          {inviteActionId === invite.id ? "Working..." : "Decline"}
                        </button>
                      </div>
                    </article>
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
              <div>
                <h2 className="text-base font-semibold text-slate-900">Contacts</h2>
                <p className="mt-1 text-xs text-slate-500">Invitees and contacts live here.</p>
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

                  <div className="rounded-[20px] border border-[#f3dfd6] bg-[#fffaf7] px-4 py-3 text-[13px] leading-6 text-slate-600">
                    Only automatic user updates can be commented on.
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
          setSelectedContactToDelete(null);
          setDeleteContactError("");
        }}
        onConfirm={handleConfirmDeleteContact}
        contact={selectedContactToDelete}
        isDeleting={isDeletingContact}
        errorMessage={deleteContactError}
      />
    </main>
  );
}
