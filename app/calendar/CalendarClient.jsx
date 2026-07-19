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
};
const BIRTHDAY_COLOR = { dot: "bg-[#ff875d]", badge: "bg-[#fff4ee] text-[#df7b59]", border: "border-[#f0c9b5]" };
const DEFAULT_COLOR = { dot: "bg-[#4a7a8a]", badge: "bg-[#e8f4f6] text-[#2d5f6e]", border: "border-[#b8d9e0]" };

function eventColor(e) {
  if (e.type === "Birthday") return BIRTHDAY_COLOR;
  const t = (e.title || "").toLowerCase();
  for (const [key, val] of Object.entries(TITLE_COLORS)) {
    if (t.includes(key)) return val;
  }
  return DEFAULT_COLOR;
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
      const date = new Date(Date.UTC(y, month, day));
      if (date >= now) {
        rows.push({
          id: "birthday-" + (contact.contact_id || contact.id) + "-" + y,
          title: (contact.name || "Contact") + "'s Birthday",
          event_date: date.toISOString().slice(0, 10),
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
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ title: "", date: "", type: "Holiday", recur: "none" });
  const [saving, setSaving] = useState(false);

  const today = new Date();
  const todayKey = toKey(today);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const [{ data: calEvents }, { data: contacts }] = await Promise.all([
        supabase.from("calendar_events").select("*").eq("user_id", user.id).order("event_date"),
        supabase.from("contact_public_state").select("*").eq("owner_user_id", user.id),
      ]);
      const birthdayEvents = buildContactBirthdayEvents(contacts || []);
      setEvents([...(calEvents || []), ...birthdayEvents]);
      setLoading(false);
    }
    load();
  }, []);

  const eventsByDate = events.reduce((acc, e) => {
    const key = e.event_date?.slice(0, 10);
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

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] || []) : [];

  const upcoming = events
    .filter(e => e.event_date >= todayKey)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
    .slice(0, 3);

  async function handleAddEvent(e) {
    e.preventDefault();
    if (!addForm.title || !addForm.date || !userId) return;
    setSaving(true);
    const { data: inserted } = await supabase.from("calendar_events").insert({
      user_id: userId,
      title: addForm.title,
      event_date: addForm.date,
      type: addForm.type,
      recurrence: addForm.recur !== "none" ? addForm.recur : null,
    }).select().maybeSingle();
    if (inserted) setEvents(prev => [...prev, inserted]);
    setShowAdd(false);
    setAddForm({ title: "", date: selectedDate || "", type: "Holiday", recur: "none" });
    setSaving(false);
  }

  function openDate(d) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    setSelectedDate(key);
    setAddForm(f => ({ ...f, date: key }));
    setShowAdd(false);
  }

  return (
    <main className="min-h-screen bg-[#fffaf7] pb-24">
      <div className="px-4 pt-6 pb-2 sm:px-8 max-w-[640px] mx-auto">
        <h1 className="text-[26px] font-semibold tracking-[-0.04em] text-slate-900 mb-4">Calendar</h1>

        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setCurrentMonth(new Date(year, month - 1))}
            className="h-9 w-9 flex items-center justify-center rounded-full border border-[#ead8ce] text-slate-500 hover:bg-[#fff4ee]">←</button>
          <p className="text-[15px] font-semibold text-slate-900">{monthName}</p>
          <button onClick={() => setCurrentMonth(new Date(year, month + 1))}
            className="h-9 w-9 flex items-center justify-center rounded-full border border-[#ead8ce] text-slate-500 hover:bg-[#fff4ee]">→</button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {["S","M","T","W","T","F","S"].map((d, i) => (
            <div key={i} className="text-center text-[11px] font-semibold text-slate-400 py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: firstDay }).map((_, i) => <div key={"e" + i} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const d = i + 1;
            const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const dayEvents = eventsByDate[key] || [];
            const isToday = key === todayKey;
            const isSelected = key === selectedDate;
            const dotColors = [...new Set(dayEvents.map(e => eventColor(e).dot))].slice(0, 3);
            return (
              <button key={d} type="button" onClick={() => openDate(d)}
                className={"relative flex flex-col items-center justify-center h-10 rounded-full text-[13px] font-semibold transition " +
                  (isSelected ? "bg-[#ff875d] text-white" : isToday ? "bg-[#fff4ee] text-[#ff875d]" : dayEvents.length ? "text-slate-900 hover:bg-[#fff4ee]" : "text-slate-400 hover:bg-[#f9f6f3]")}>
                {d}
                {dotColors.length > 0 && !isSelected && (
                  <div className="absolute bottom-1 flex gap-0.5">
                    {dotColors.map((c, i) => <span key={i} className={"h-1 w-1 rounded-full " + c} />)}
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
            upcoming.length === 0 ? <div className="text-sm text-slate-400">Nothing coming up.</div> :
            <div className="space-y-2">
              {upcoming.map(e => {
                const c = eventColor(e);
                return (
                  <div key={e.id} className={"rounded-[16px] border bg-white p-3 flex items-center justify-between gap-3 " + c.border}>
                    <div className="flex items-center gap-3">
                      <span className={"h-2 w-2 rounded-full shrink-0 " + c.dot} />
                      <div>
                        <p className="text-[13px] font-semibold text-slate-900">{e.title}</p>
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

      {/* Bottom sheet for selected date */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setSelectedDate(null); setShowAdd(false); }}>
          <div className="w-full max-w-[640px] rounded-t-[28px] bg-[#fffaf7] border-t border-[#efdcd2] shadow-xl max-h-[80dvh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#f2e5de] shrink-0">
              <p className="text-[15px] font-semibold text-slate-900">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setShowAdd(v => !v)}
                  className="h-8 px-3 flex items-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[11px] font-semibold text-white">
                  + Add event
                </button>
                <button type="button" onClick={() => { setSelectedDate(null); setShowAdd(false); }}
                  className="h-8 w-8 flex items-center justify-center rounded-full border border-[#ead8ce] text-slate-400">✕</button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {showAdd && (
                <form onSubmit={handleAddEvent} className="rounded-[16px] border border-[#ead8ce] bg-white p-4 space-y-3">
                  <p className="text-[13px] font-semibold text-slate-900">New event</p>
                  <input value={addForm.title} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Event title" required
                    className="w-full rounded-[10px] border border-[#ead8ce] bg-[#fffaf7] px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#ff875d]" />
                  <input type="date" value={addForm.date} onChange={e => setAddForm(f => ({ ...f, date: e.target.value }))}
                    required
                    className="w-full rounded-[10px] border border-[#ead8ce] bg-[#fffaf7] px-3 py-2 text-[13px] text-slate-900 focus:outline-none focus:border-[#ff875d]" />
                  <select value={addForm.type} onChange={e => setAddForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full rounded-[10px] border border-[#ead8ce] bg-[#fffaf7] px-3 py-2 text-[13px] text-slate-900 focus:outline-none focus:border-[#ff875d]">
                    {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <select value={addForm.recur} onChange={e => setAddForm(f => ({ ...f, recur: e.target.value }))}
                    className="w-full rounded-[10px] border border-[#ead8ce] bg-[#fffaf7] px-3 py-2 text-[13px] text-slate-900 focus:outline-none focus:border-[#ff875d]">
                    <option value="none">Does not repeat</option>
                    <option value="weekly">Repeats weekly</option>
                    <option value="monthly">Repeats monthly</option>
                    <option value="yearly">Repeats yearly</option>
                  </select>
                  <button type="submit" disabled={saving}
                    className="w-full h-10 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[13px] font-semibold text-white">
                    {saving ? "Saving..." : "Save event"}
                  </button>
                </form>
              )}

              {selectedEvents.length === 0 && !showAdd && (
                <p className="text-sm text-slate-400 text-center py-4">No events on this day.</p>
              )}

              {selectedEvents.map(e => {
                const c = eventColor(e);
                return (
                  <div key={e.id} className={"rounded-[16px] border bg-white p-4 " + c.border}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={"h-2 w-2 rounded-full shrink-0 " + c.dot} />
                      <span className={"text-[11px] font-semibold rounded-full px-2 py-0.5 " + c.badge}>{e.type || "Event"}</span>
                      {e.recurrence && <span className="text-[11px] text-slate-400">↻ {e.recurrence}</span>}
                    </div>
                    <p className="text-[15px] font-semibold text-slate-900">{e.title}</p>
                    {e.body && <p className="text-[13px] text-slate-500 mt-1">{e.body}</p>}
                    {e.cta_label && e.cta_href && (
                      <a href={e.cta_href} className="mt-3 inline-flex h-9 px-4 items-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[12px] font-semibold text-white">
                        {e.cta_label}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
