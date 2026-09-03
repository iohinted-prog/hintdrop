"use client";
import { useState, useEffect } from "react";
import { createClient } from "../../lib/supabase/client";

function toKey(date) {
  return date.toISOString().slice(0, 10);
}

const TITLE_COLORS = {
  "christmas": { dot: "bg-[#2d6a4f]", badge: "bg-[#d8f3dc] text-[#2d6a4f]", border: "border-[#b7e4c7]" },
  "valentine": { dot: "bg-[#e63946]", badge: "bg-[#ffe5e7] text-[#e63946]", border: "border-[#ffb3b8]" },
  "halloween": { dot: "bg-[#e07c00]", badge: "bg-[#fff0d6] text-[#e07c00]", border: "border-[#ffd49e]" },
  "new year": { dot: "bg-[#7c5cbf]", badge: "bg-[#f5f3ff] text-[#7c5cbf]", border: "border-[#d4c9f0]" },
  "mother": { dot: "bg-[#c77dff]", badge: "bg-[#f3e8ff] text-[#7b2d8b]", border: "border-[#e0b8ff]" },
  "father": { dot: "bg-[#4895ef]", badge: "bg-[#e8f4fd] text-[#1a6fb5]", border: "border-[#b8d9f5]" },
  "easter": { dot: "bg-[#80b918]", badge: "bg-[#f0fbd0] text-[#4a7c00]", border: "border-[#c8f09a]" },
  "patrick": { dot: "bg-[#2d6a4f]", badge: "bg-[#d8f3dc] text-[#2d6a4f]", border: "border-[#b7e4c7]" },
  "bonfire": { dot: "bg-[#e07c00]", badge: "bg-[#fff0d6] text-[#e07c00]", border: "border-[#ffd49e]" },
};
const BIRTHDAY_COLOR = { dot: "bg-[#ff966f]", badge: "bg-[#fff1ea] text-[#c9633f]", border: "border-[#f6cbb3]" };
const DEFAULT_COLOR = { dot: "bg-[#e8a06f]", badge: "bg-[#fdf1e7] text-[#b06a3a]", border: "border-[#f0d4b8]" };

// Curated pastel swatches for user-chosen event colors — kept soft/muted
// on purpose rather than a full picker, matching a calm calendar feel.
const PASTEL_PALETTE = [
  { hex: "#ffb3b3", label: "Blush" },
  { hex: "#ffd6a5", label: "Peach" },
  { hex: "#caffbf", label: "Mint" },
  { hex: "#9bf6ff", label: "Sky" },
  { hex: "#a0c4ff", label: "Periwinkle" },
  { hex: "#bdb2ff", label: "Lilac" },
  { hex: "#ffc6ff", label: "Bubblegum" },
];

function pastelColorSet(hex) {
  return { dot: "", badge: "", border: "border-[#f0dfd6]", custom: hex };
}

function eventColor(e) {
  if (e.color) return pastelColorSet(e.color);
  if (e.type === "Birthday") return BIRTHDAY_COLOR;
  const t = (e.title || "").toLowerCase();
  for (const [key, val] of Object.entries(TITLE_COLORS)) {
    if (t.includes(key)) return val;
  }
  return DEFAULT_COLOR;
}

const EVENT_EMOJI = {
  Holiday: "🌴",
  Birthday: "🎂",
  Celebration: "🎉",
  Anniversary: "💍",
  Wedding: "💒",
  Other: "📌",
};
function eventEmoji(e) {
  const t = (e.title || "").toLowerCase();
  if (t.includes("christmas")) return "🎄";
  if (t.includes("halloween")) return "🎃";
  if (t.includes("valentine")) return "💝";
  if (t.includes("easter")) return "🐣";
  if (t.includes("new year")) return "🎆";
  return EVENT_EMOJI[e.type] || "📌";
}

// Same reasoning as eventTypeIcon() in FeedClient.js - substring match
// rather than exact equality, forgiving of messy legacy type values
// (confirmed some events have emoji baked into the stored type string).
function eventTypeIcon(eventType) {
  const normalized = String(eventType || "").toLowerCase();
  if (normalized.includes("birthday")) return "/illustrations/birthday-cake.svg";
  if (normalized.includes("anniversary")) return "/illustrations/anniversary.svg";
  if (normalized.includes("celebration")) return "/illustrations/celebration.svg";
  if (normalized.includes("wedding")) return "/illustrations/wedding-church.svg";
  if (normalized.includes("holiday")) return "/illustrations/holiday-palm.svg";
  return "/illustrations/calendar.svg";
}

function EventDot({ color, className = "h-2 w-2" }) {
  if (color.custom) {
    return <span className={`${className} rounded-full shrink-0`} style={{ backgroundColor: color.custom }} />;
  }
  return <span className={`${className} rounded-full shrink-0 ${color.dot}`} />;
}

function EventBadge({ color, children }) {
  if (color.custom) {
    return (
      <span className="text-[11px] font-semibold rounded-full px-2 py-0.5" style={{ backgroundColor: color.custom + "55", color: "#6b4a2f" }}>
        {children}
      </span>
    );
  }
  return <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${color.badge}`}>{children}</span>;
}

function eventBorderStyle(color) {
  return color.custom ? { borderColor: color.custom } : {};
}

const EVENT_TYPES = ["Holiday", "Birthday", "Celebration", "Anniversary", "Wedding", "Other"];
const RECUR_OPTIONS = ["none", "weekly", "monthly", "yearly"];

function buildContactBirthdayEvents(contacts) {
  const now = new Date();
  const rows = [];
  for (const contact of (contacts || [])) {
    if (!contact.birthday) continue;
    const bday = new Date(contact.birthday + "T00:00:00");
    if (isNaN(bday.getTime())) continue;
    const month = bday.getMonth();
    const day = bday.getDate();
    for (let y = now.getFullYear(); y <= now.getFullYear() + 2; y++) {
      const date = new Date(y, month, day);
      if (date >= now) {
        rows.push({
          id: "birthday-" + (contact.contact_id || contact.id) + "-" + y,
          contact_id: contact.contact_id || contact.id,
          title: (contact.name || "Contact") + "'s Birthday",
          event_date: `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`,
          raw_birthday: contact.birthday,
          type: "Birthday",
          source: "contact",
          cta_label: "See hints",
          cta_href: contact.profileId ? "/profile/" + contact.profileId : "/feed",
        });
        break;
      }
    }
  }
  return rows;
}

export default function CalendarClient() {
  const supabase = createClient();
  const [userId, setUserId] = useState(null);
  const [events, setEvents] = useState([]);
  const [contactsList, setContactsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = new Date();
  const todayKey = toKey(today);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  // Separate from selectedDate on purpose - the desktop sidebar is always
  // visible and needs a default date to show (todayKey), but the mobile
  // bottom sheet should start closed. Reusing selectedDate for both (its
  // previous behavior) meant the sheet's own condition - `{selectedDate &&
  // (<div className="md:hidden ...">` - was true from initial render,
  // since selectedDate defaults to todayKey, not null. Net effect: the
  // mobile sheet showed today's day open immediately on page load, with
  // no tap needed.
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ title: "", date: todayKey, type: "Holiday", recur: "none", color: "" });
  const [saving, setSaving] = useState(false);
  const [addEventError, setAddEventError] = useState("");
  const [editingBirthdayId, setEditingBirthdayId] = useState(null);
  const [birthdayDraft, setBirthdayDraft] = useState("");
  const [monthDirection, setMonthDirection] = useState(0);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const [{ data: calEvents }, { data: contacts }] = await Promise.all([
        Promise.all([
          supabase.from("calendar_events").select("*").eq("user_id", user.id).order("event_date"),
          supabase.from("calendar_events").select("*").eq("is_shared", true).order("event_date"),
        ]).then(([personal, shared]) => ({ data: [...(personal.data || []), ...(shared.data || [])], error: personal.error || shared.error })),
        supabase.from("contact_public_state").select("*").eq("owner_user_id", user.id),
      ]);
      setContactsList(contacts || []);
      const birthdayEvents = buildContactBirthdayEvents(contacts || []);
      setEvents([...(calEvents || []), ...birthdayEvents]);
      setLoading(false);
    }
    load();
  }, []);

  const eventsByDate = events.reduce((acc, e) => {
    const key = (e.event_date || "").slice(0, 10);
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  // "This month at a glance" - count events in the currently displayed
  // month by type, so the header can show a friendly one-line summary
  // instead of just the bare month name.
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthTypeCounts = events
    .filter(e => (e.event_date || "").startsWith(monthPrefix))
    .reduce((acc, e) => {
      const label = EVENT_EMOJI[e.type] ? e.type : "Other";
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});
  const monthSummaryParts = Object.entries(monthTypeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type, count]) => {
      const plurals = { Holiday: "holidays", Birthday: "birthdays", Celebration: "celebrations", Anniversary: "anniversaries", Wedding: "weddings", Other: "others" };
      const singular = { Holiday: "holiday", Birthday: "birthday", Celebration: "celebration", Anniversary: "anniversary", Wedding: "wedding", Other: "other" };
      const label = count > 1 ? plurals[type] : singular[type];
      return `${EVENT_EMOJI[type] || "📌"} ${count} ${label}`;
    });

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] || []) : [];

  const upcoming = events
    .filter(e => e.event_date >= todayKey)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
    .slice(0, 3);

  async function handleAddEvent(e) {
    e.preventDefault();
    if (!addForm.title || !addForm.date || !userId) return;
    setSaving(true);
    setAddEventError("");
    // Was only destructuring `data`, never checking `error` - if the
    // insert failed for any reason (RLS, a bad value, anything), this
    // silently did nothing: the event never got added, but the form
    // still closed and reset right below as if it had succeeded, with
    // zero indication anything went wrong. That's almost certainly what
    // "doesn't work" was actually describing - not a crash, a silent
    // no-op that looks like success.
    // The insert previously used a key called `recurrence`, but the real
    // column in calendar_events is named `recurring` (there's also a
    // separate `is_recurring` boolean column, never set at all before
    // this fix). Since the insert always included the `recurrence` key
    // regardless of its value, every single event save failed with a
    // "column does not exist" error - not just recurring ones - which
    // is exactly what "Couldn't save that event" was masking.
    const isRecurring = addForm.recur !== "none";
    const { data: inserted, error } = await supabase.from("calendar_events").insert({
      user_id: userId,
      title: addForm.title,
      event_date: addForm.date,
      type: addForm.type,
      is_recurring: isRecurring,
      recurring: isRecurring ? addForm.recur : null,
      color: addForm.color || null,
    }).select().maybeSingle();
    setSaving(false);
    if (error || !inserted) {
      console.error("Error adding calendar event:", error?.message);
      setAddEventError("Couldn't save that event. Please try again.");
      return;
    }
    setEvents(prev => [...prev, inserted]);
    setShowAdd(false);
    setAddForm({ title: "", date: selectedDate || "", type: "Holiday", recur: "none", color: "" });
  }

  async function handleDeleteEvent(eventId) {
    if (!confirm("Delete this event?")) return;
    const { error } = await supabase.from("calendar_events").delete().eq("id", eventId);
    if (error) {
      console.error("Error deleting calendar event:", error.message);
      alert("Couldn't delete that event. Please try again.");
      return;
    }
    setEvents(prev => prev.filter(e => e.id !== eventId));
  }

  async function handleUpdateBirthday(contactId) {
    if (!birthdayDraft) return;
    const { error } = await supabase.from("contacts").update({ birthday: birthdayDraft }).eq("id", contactId);
    if (error) {
      console.error("Error updating birthday:", error.message);
      alert("Couldn't save that birthday. Please try again.");
      return;
    }
    const updatedContacts = contactsList.map(c => (c.contact_id || c.id) === contactId ? { ...c, birthday: birthdayDraft } : c);
    setContactsList(updatedContacts);
    const nonBirthdayEvents = events.filter(e => e.source !== "contact");
    setEvents([...nonBirthdayEvents, ...buildContactBirthdayEvents(updatedContacts)]);
    setEditingBirthdayId(null);
    setBirthdayDraft("");
  }

  function openDate(d) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    setSelectedDate(key);
    setMobileSheetOpen(true);
    setAddForm(f => ({ ...f, date: key }));
    setShowAdd(false);
  }

  function renderAddEventForm() {
    return (
      <form onSubmit={handleAddEvent} className="rounded-[16px] border border-[#ead8ce] bg-[#fffaf7] p-4 space-y-3" style={{ animation: "calCardIn 0.2s ease" }}>
        <p className="text-[13px] font-semibold text-slate-900">New event</p>
        {addEventError && (
          <p className="text-[12px] font-medium text-[#b14f43] bg-[#fff4f2] border border-[#f3d4cc] rounded-[10px] px-3 py-2">{addEventError}</p>
        )}
        <input value={addForm.title} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
          placeholder="Event title" required
          className="w-full rounded-[10px] border border-[#ead8ce] bg-white px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#ff875d]" />
        <input type="date" value={addForm.date} onChange={e => setAddForm(f => ({ ...f, date: e.target.value }))}
          required
          className="w-full rounded-[10px] border border-[#ead8ce] bg-white px-3 py-2 text-[13px] text-slate-900 focus:outline-none focus:border-[#ff875d]" />
        <select value={addForm.type} onChange={e => setAddForm(f => ({ ...f, type: e.target.value }))}
          className="w-full rounded-[10px] border border-[#ead8ce] bg-white px-3 py-2 text-[13px] text-slate-900 focus:outline-none focus:border-[#ff875d]">
          {EVENT_TYPES.map(t => <option key={t} value={t}>{EVENT_EMOJI[t]} {t}</option>)}
        </select>
        <select value={addForm.recur} onChange={e => setAddForm(f => ({ ...f, recur: e.target.value }))}
          className="w-full rounded-[10px] border border-[#ead8ce] bg-white px-3 py-2 text-[13px] text-slate-900 focus:outline-none focus:border-[#ff875d]">
          <option value="none">Does not repeat</option>
          <option value="weekly">Repeats weekly</option>
          <option value="monthly">Repeats monthly</option>
          <option value="yearly">Repeats yearly</option>
        </select>
        <div>
          <p className="text-[11px] font-semibold text-slate-500 mb-1.5">Colour (optional)</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setAddForm(f => ({ ...f, color: "" }))}
              className={`h-7 w-7 rounded-full border-2 flex items-center justify-center text-[10px] text-slate-400 ${!addForm.color ? "border-[#ff875d]" : "border-[#ead8ce]"}`}>
              ✕
            </button>
            {PASTEL_PALETTE.map(p => (
              <button key={p.hex} type="button" title={p.label} onClick={() => setAddForm(f => ({ ...f, color: p.hex }))}
                className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${addForm.color === p.hex ? "border-slate-700 scale-110" : "border-white"}`}
                style={{ backgroundColor: p.hex }} />
            ))}
          </div>
        </div>
        <button type="submit" disabled={saving}
          className="w-full h-10 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[13px] font-semibold text-white">
          {saving ? "Saving..." : "Save event"}
        </button>
      </form>
    );
  }

  function renderEventCard(e) {
    const c = eventColor(e);
    const isDeletable = e.source !== "contact";
    const isEditingThisBirthday = e.source === "contact" && editingBirthdayId === e.contact_id;
    return (
      <div key={e.id} className="rounded-[16px] border bg-white p-4" style={{ ...eventBorderStyle(c), animation: "calCardIn 0.2s ease" }}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <EventDot color={c} />
            <EventBadge color={c}>{eventEmoji(e)} {e.type || "Event"}</EventBadge>
            {e.recurrence && <span className="text-[11px] text-slate-400">↻ {e.recurrence}</span>}
          </div>
          <div className="flex items-center gap-1">
            {e.source === "contact" && (
              <button type="button" onClick={() => { setEditingBirthdayId(e.contact_id); setBirthdayDraft(e.raw_birthday || ""); }}
                className="h-6 w-6 flex items-center justify-center rounded-full text-slate-300 hover:bg-[#fff4ee] hover:text-[#ff875d] text-xs">✎</button>
            )}
            {isDeletable && (
              <button type="button" onClick={() => handleDeleteEvent(e.id)}
                className="h-6 w-6 flex items-center justify-center rounded-full text-slate-300 hover:bg-[#fff0f0] hover:text-[#b14f43] text-xs">✕</button>
            )}
          </div>
        </div>
        <p className="text-[15px] font-semibold text-slate-900">{e.title}</p>
        {e.body && <p className="text-[13px] text-slate-500 mt-1">{e.body}</p>}
        {isEditingThisBirthday ? (
          <div className="mt-3 flex items-center gap-2">
            <input type="date" value={birthdayDraft} onChange={ev => setBirthdayDraft(ev.target.value)}
              className="flex-1 rounded-[10px] border border-[#ead8ce] bg-[#fffaf7] px-3 py-2 text-[13px] text-slate-900 focus:outline-none focus:border-[#ff875d]" />
            <button type="button" onClick={() => handleUpdateBirthday(e.contact_id)}
              className="h-9 px-3 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[12px] font-semibold text-white">Save</button>
            <button type="button" onClick={() => setEditingBirthdayId(null)}
              className="h-9 w-9 flex items-center justify-center rounded-full border border-[#ead8ce] text-slate-400 text-xs">✕</button>
          </div>
        ) : e.cta_label && e.cta_href && (
          <a href={e.cta_href} className="mt-3 inline-flex h-9 px-4 items-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[12px] font-semibold text-white">
            {e.cta_label}
          </a>
        )}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#fffaf7] pb-24 md:pb-12">
      <div className="px-4 pt-6 pb-2 sm:px-8 md:px-8 md:max-w-[1100px] md:mx-auto md:grid md:grid-cols-[1fr_380px] md:gap-8 md:items-start">
        <div className="max-w-[640px] mx-auto md:max-w-none md:mx-0 w-full">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-gradient-to-b from-[#ffa47f] to-[#ff875d] shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/illustrations/gift.svg" alt="" className="h-6 w-6" />
          </div>
          <h1 className="text-[26px] font-semibold tracking-[-0.04em] text-slate-900">Calendar</h1>
        </div>

        <div className="flex items-center justify-between mb-4">
          <button onClick={() => { setMonthDirection(-1); setCurrentMonth(new Date(year, month - 1)); }}
            aria-label="Previous month"
            className="h-11 w-11 flex items-center justify-center rounded-full border border-[#ead8ce] text-slate-500 hover:bg-[#fff4ee] hover:border-[#f0b394] hover:text-[#ff875d] active:scale-90 transition-all duration-150">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <div className="flex flex-col items-center">
            <p key={monthName} className="text-[17px] font-bold text-slate-900 tracking-[-0.02em]" style={{ animation: "calFadeIn 0.25s ease" }}>{monthName}</p>
            {selectedDate !== todayKey && (
              <button onClick={() => { setCurrentMonth(today); setSelectedDate(todayKey); }}
                className="mt-0.5 text-[11px] font-semibold text-[#df7b59] hover:text-[#c4633f]">
                Jump to today
              </button>
            )}
          </div>
          <button onClick={() => { setMonthDirection(1); setCurrentMonth(new Date(year, month + 1)); }}
            aria-label="Next month"
            className="h-11 w-11 flex items-center justify-center rounded-full border border-[#ead8ce] text-slate-500 hover:bg-[#fff4ee] hover:border-[#f0b394] hover:text-[#ff875d] active:scale-90 transition-all duration-150">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>

        {monthSummaryParts.length > 0 && (
          <p className="text-center text-[12px] text-slate-500 mb-4">
            {monthSummaryParts.join("  ·  ")} this month
          </p>
        )}

        <div className="grid grid-cols-7 mb-1">
          {["S","M","T","W","T","F","S"].map((d, i) => (
            <div key={i} className="text-center text-[11px] font-semibold text-slate-400 py-1">{d}</div>
          ))}
        </div>

        <div key={monthName + "-grid"} className="grid grid-cols-7 gap-0.5 md:gap-1.5" style={{ animation: `calSlide${monthDirection >= 0 ? "Left" : "Right"} 0.22s ease` }}>
          {Array.from({ length: firstDay }).map((_, i) => <div key={"e" + i} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const d = i + 1;
            const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const dayEvents = eventsByDate[key] || [];
            const isToday = key === todayKey;
            const isSelected = key === selectedDate;
            const dotEntries = dayEvents.slice(0, 3).map(e => eventColor(e));
            const firstCustomColor = dayEvents.find(e => e.color)?.color;
            const showSingleIcon = dayEvents.length === 1 && !isSelected;
            return (
              <button key={d} type="button" onClick={() => openDate(d)}
                className={"relative flex flex-col items-center justify-center h-10 md:h-14 rounded-full md:rounded-[14px] text-[13px] font-semibold transition-all duration-150 hover:scale-105 active:scale-95 " +
                  (isSelected ? "bg-[#ff875d] text-white shadow-md shadow-[#ff875d]/30" : isToday ? "bg-[#fff4ee] text-[#ff875d] ring-1 ring-[#f6cbb3]" : dayEvents.length ? "text-slate-900 hover:bg-[#fff4ee]" : "text-slate-400 hover:bg-[#f9f6f3]")}
                style={!isSelected && !isToday && firstCustomColor ? { backgroundColor: `${firstCustomColor}33` } : undefined}>
                {d}
                {showSingleIcon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={eventTypeIcon(dayEvents[0].type)}
                    alt=""
                    className="absolute bottom-0.5 h-3.5 w-3.5 md:bottom-1 md:h-4 md:w-4"
                  />
                ) : dotEntries.length > 0 && !isSelected && (
                  <div className="absolute bottom-1 md:bottom-2 flex gap-0.5">
                    {dotEntries.map((c, i) => <EventDot key={i} color={c} className="h-1 w-1" />)}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Coming up */}
        <div className="mt-6">
          <p className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Coming up</p>
          {loading ? <div className="text-sm text-slate-400">Loading...</div> :
            upcoming.length === 0 ? (
              <div className="flex flex-col items-center text-center py-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/illustrations/calendar.svg" alt="" className="h-16 w-16 mb-2 opacity-80" />
                <p className="text-sm text-slate-400">Nothing coming up yet.</p>
                <p className="text-[12px] text-slate-400 mt-0.5">Add a birthday or event to keep track of it here.</p>
              </div>
            ) :
            <div className="space-y-2">
              {upcoming.map(e => {
                const c = eventColor(e);
                return (
                  <div key={e.id} className="rounded-[16px] border bg-white p-3 flex items-center justify-between gap-3" style={{ ...eventBorderStyle(c), animation: "calCardIn 0.2s ease" }}>
                    <div className="flex items-center gap-3">
                      <EventDot color={c} />
                      <div>
                        <p className="text-[13px] font-semibold text-slate-900">{eventEmoji(e)} {e.title}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{new Date(e.event_date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</p>
                      </div>
                    </div>
                    {e.cta_label && e.cta_href && (
                      <a href={e.cta_href} className="shrink-0 h-8 px-3 flex items-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[11px] font-semibold text-white">{e.cta_label}</a>
                    )}
                  </div>
                );
              })}
            </div>
          }
        </div>
        </div>

        {/* Desktop day-detail sidebar — replaces the mobile bottom sheet on md+ screens */}
        <div className="hidden md:block sticky top-6 rounded-[20px] border border-[#efe0d7] bg-white p-5 min-h-[420px]">
          <div key={selectedDate} style={{ animation: "calFadeIn 0.2s ease" }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[15px] font-semibold text-slate-900">
                {selectedDate === todayKey ? "Today · " : ""}
                {new Date((selectedDate || todayKey) + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <button type="button" onClick={() => { setShowAdd(v => !v); setAddEventError(""); }}
                className="h-8 px-3 flex items-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[11px] font-semibold text-white">
                + Add event
              </button>
            </div>

            <div className="space-y-3">
              {showAdd && renderAddEventForm()}

              {selectedEvents.length === 0 && !showAdd && (
                <p className="text-sm text-slate-400 text-center py-4">Nothing on this day yet.</p>
              )}

              {selectedEvents.map(renderEventCard)}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom sheet for selected date — mobile only */}
      {mobileSheetOpen && selectedDate && (
        <div className="md:hidden fixed inset-0 z-[110] flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setMobileSheetOpen(false); setShowAdd(false); }}>
          <div className="w-full max-w-[640px] rounded-t-[28px] bg-[#fffaf7] border-t border-[#efdcd2] shadow-xl max-h-[80dvh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#f2e5de] shrink-0">
              <p className="text-[15px] font-semibold text-slate-900">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { setShowAdd(v => !v); setAddEventError(""); }}
                  className="h-8 px-3 flex items-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[11px] font-semibold text-white">
                  + Add event
                </button>
                <button type="button" onClick={() => { setMobileSheetOpen(false); setShowAdd(false); }}
                  className="h-8 w-8 flex items-center justify-center rounded-full border border-[#ead8ce] text-slate-400">✕</button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {showAdd && renderAddEventForm()}

              {selectedEvents.length === 0 && !showAdd && (
                <p className="text-sm text-slate-400 text-center py-4">Nothing on this day yet.</p>
              )}

              {selectedEvents.map(renderEventCard)}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
