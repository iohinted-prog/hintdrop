"use client";
import { useState, useEffect } from "react";
import { createClient } from "../../lib/supabase/client";

function toKey(date) {
  return date.toISOString().slice(0, 10);
}

const EVENT_COLORS = {
  Birthday: { dot: "bg-[#ff875d]", badge: "bg-[#fff4ee] text-[#df7b59]", border: "border-[#f0c9b5]" },
  reminder: { dot: "bg-[#7c5cbf]", badge: "bg-[#f5f3ff] text-[#7c5cbf]", border: "border-[#d4c9f0]" },
  default:  { dot: "bg-[#5b7a3c]", badge: "bg-[#eef6ea] text-[#5b7a3c]", border: "border-[#c5dfc0]" },
};

function eventColor(e) {
  if (e.type === "Birthday") return EVENT_COLORS.Birthday;
  if (e.family === "reminder" || e.item_type === "event_reminder") return EVENT_COLORS.reminder;
  return EVENT_COLORS.default;
}

function buildContactBirthdayEvents(contacts) {
  const now = new Date();
  const threeMonths = new Date();
  threeMonths.setMonth(threeMonths.getMonth() + 3);
  const rows = [];
  for (const contact of (contacts || [])) {
    if (!contact.birthday) continue;
    const bday = new Date(contact.birthday + "T00:00:00");
    if (isNaN(bday.getTime())) continue;
    const month = bday.getMonth();
    const day = bday.getDate();
    for (let y = now.getFullYear(); y <= now.getFullYear() + 1; y++) {
      const date = new Date(Date.UTC(y, month, day));
      if (date >= now && date <= threeMonths) {
        rows.push({
          id: `birthday-${contact.contact_id || contact.id}-${y}`,
          title: (contact.name || "Contact") + "'s Birthday",
          event_date: date.toISOString().slice(0, 10),
          type: "Birthday",
          source: "contact",
          cta_label: "See hints",
          cta_href: contact.profileId ? "/profile/" + contact.profileId : "/feed",
          profile_id: contact.profileId,
        });
        break;
      }
    }
  }
  return rows;
}

export default function CalendarClient() {
  const supabase = createClient();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalEvents, setModalEvents] = useState([]);

  const today = new Date();
  const todayKey = toKey(today);
  const threeMonthsKey = (() => { const d = new Date(); d.setMonth(d.getMonth() + 3); return toKey(d); })();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: calEvents }, { data: contacts }] = await Promise.all([
        supabase.from("calendar_events").select("*").eq("user_id", user.id)
          .order("event_date"),
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

  function handleDayClick(d) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayEvents = eventsByDate[key] || [];
    if (dayEvents.length) {
      setSelectedDate(key);
      setModalEvents(dayEvents);
    }
  }

  const upcoming = events
    .filter(e => e.event_date >= todayKey)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
    .slice(0, 3);

  // Max month is 3 months ahead
  const maxMonth = new Date(); maxMonth.setMonth(maxMonth.getMonth() + 3);
  const canGoNext = true;
  const canGoPrev = true;

  return (
    <main className="min-h-screen bg-[#fffaf7] pb-24">
      <div className="px-4 pt-6 pb-2 sm:px-8 max-w-[640px] mx-auto">
        <h1 className="text-[26px] font-semibold tracking-[-0.04em] text-slate-900 mb-4">Calendar</h1>

        <div className="flex items-center justify-between mb-3">
          <button onClick={() => canGoPrev && setCurrentMonth(new Date(year, month - 1))}
            className={"h-9 w-9 flex items-center justify-center rounded-full border text-slate-500 " + (canGoPrev ? "border-[#ead8ce] hover:bg-[#fff4ee]" : "border-transparent opacity-30 cursor-default")}>←</button>
          <p className="text-[15px] font-semibold text-slate-900">{monthName}</p>
          <button onClick={() => canGoNext && setCurrentMonth(new Date(year, month + 1))}
            className={"h-9 w-9 flex items-center justify-center rounded-full border text-slate-500 " + (canGoNext ? "border-[#ead8ce] hover:bg-[#fff4ee]" : "border-transparent opacity-30 cursor-default")}>→</button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
            <div key={d} className="text-center text-[11px] font-semibold text-slate-400 py-1">{d}</div>
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
            const hasBirthday = dayEvents.some(e => e.type === "Birthday");
            const hasReminder = dayEvents.some(e => e.family === "reminder");
            const hasOther = dayEvents.some(e => e.type !== "Birthday" && e.family !== "reminder");
            return (
              <button key={d} type="button" onClick={() => handleDayClick(d)}
                className={"relative flex flex-col items-center justify-center h-10 rounded-full text-[13px] font-semibold transition " +
                  (isSelected ? "bg-[#ff875d] text-white" : isToday ? "bg-[#fff4ee] text-[#ff875d]" : dayEvents.length ? "text-slate-900 hover:bg-[#fff4ee]" : "text-slate-400 hover:bg-[#f9f6f3]")}>
                {d}
                {dayEvents.length > 0 && !isSelected && (
                  <div className="absolute bottom-1 flex gap-0.5">
                    {hasBirthday && <span className="h-1 w-1 rounded-full bg-[#ff875d]" />}
                    {hasReminder && <span className="h-1 w-1 rounded-full bg-[#7c5cbf]" />}
                    {hasOther && <span className="h-1 w-1 rounded-full bg-[#5b7a3c]" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          <p className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Coming up</p>
          {loading ? (
            <div className="text-sm text-slate-400">Loading...</div>
          ) : upcoming.length === 0 ? (
            <div className="text-sm text-slate-400">Nothing in the next 3 months.</div>
          ) : (
            <div className="space-y-2">
              {upcoming.map(e => {
                const c = eventColor(e);
                return (
                  <div key={e.id} className={"rounded-[16px] border bg-white p-3 flex items-center justify-between gap-3 " + c.border}>
                    <div className="flex items-center gap-3">
                      <span className={"h-2 w-2 rounded-full shrink-0 " + c.dot} />
                      <div>
                        <p className="text-[13px] font-semibold text-slate-900">{e.title}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(e.event_date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                        </p>
                      </div>
                    </div>
                    {e.cta_label && e.cta_href && (
                      <a href={e.cta_href} className="shrink-0 h-8 px-3 flex items-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[11px] font-semibold text-white">
                        {e.cta_label}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedDate && modalEvents.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:px-4" onClick={() => setSelectedDate(null)}>
          <div className="w-full max-w-[480px] rounded-t-[28px] sm:rounded-[28px] bg-[#fffaf7] border border-[#efdcd2] shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#f2e5de]">
              <p className="text-[15px] font-semibold text-slate-900">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <button type="button" onClick={() => setSelectedDate(null)} className="h-9 w-9 flex items-center justify-center rounded-full border border-[#ead8ce] text-slate-400">✕</button>
            </div>
            <div className="p-4 space-y-3">
              {modalEvents.map(e => {
                const c = eventColor(e);
                return (
                  <div key={e.id} className={"rounded-[16px] border bg-white p-4 " + c.border}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={"h-2 w-2 rounded-full " + c.dot} />
                      <span className={"text-[11px] font-semibold rounded-full px-2 py-0.5 " + c.badge}>{e.type || "Event"}</span>
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
