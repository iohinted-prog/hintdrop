import { useEffect, useState } from "react";
import { View, StyleSheet, Pressable, Modal, ScrollView, TextInput, ActivityIndicator, Alert, Image, Linking } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import Text from "../components/Text";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { colors, radii, spacing, shadow } from "../lib/theme";

// Mirrors app/calendar/CalendarClient.jsx. Built against the real
// file - month grid with event dots/icons, month summary line,
// "Coming up" list, day-detail bottom sheet (web's own mobile
// pattern here already, not something invented for this port), add-
// event form (title/date/type/recurrence/pastel color), and auto-
// generated birthday events from both contacts and the user's own
// profile.birthday - same calendar_events table, same recurring-
// event expansion logic (weekly/monthly/yearly), same real-time
// subscription. Nothing in this file was cut for scope; it's the
// full feature.

function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateOnlyLocal(dateString) {
  if (!dateString) return null;
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

const TITLE_COLORS = {
  christmas: { dot: "#2d6a4f", badgeBg: "#d8f3dc", badgeText: "#2d6a4f" },
  valentine: { dot: "#e63946", badgeBg: "#ffe5e7", badgeText: "#e63946" },
  halloween: { dot: "#e07c00", badgeBg: "#fff0d6", badgeText: "#e07c00" },
  "new year": { dot: "#7c5cbf", badgeBg: "#f5f3ff", badgeText: "#7c5cbf" },
  mother: { dot: "#c77dff", badgeBg: "#f3e8ff", badgeText: "#7b2d8b" },
  father: { dot: "#4895ef", badgeBg: "#e8f4fd", badgeText: "#1a6fb5" },
  easter: { dot: "#80b918", badgeBg: "#f0fbd0", badgeText: "#4a7c00" },
  patrick: { dot: "#2d6a4f", badgeBg: "#d8f3dc", badgeText: "#2d6a4f" },
  bonfire: { dot: "#e07c00", badgeBg: "#fff0d6", badgeText: "#e07c00" },
};
const BIRTHDAY_COLOR = { dot: "#ff966f", badgeBg: "#fff1ea", badgeText: "#c9633f" };
const DEFAULT_COLOR = { dot: "#e8a06f", badgeBg: "#fdf1e7", badgeText: "#b06a3a" };

const PASTEL_PALETTE = [
  { hex: "#ffb3b3", label: "Blush" },
  { hex: "#ffd6a5", label: "Peach" },
  { hex: "#caffbf", label: "Mint" },
  { hex: "#9bf6ff", label: "Sky" },
  { hex: "#a0c4ff", label: "Periwinkle" },
  { hex: "#bdb2ff", label: "Lilac" },
  { hex: "#ffc6ff", label: "Bubblegum" },
];

function eventColor(e) {
  if (e.color) return { dot: e.color, badgeBg: e.color + "55", badgeText: "#6b4a2f", custom: e.color };
  if (e.type === "Birthday") return BIRTHDAY_COLOR;
  const t = (e.title || "").toLowerCase();
  for (const [key, val] of Object.entries(TITLE_COLORS)) {
    if (t.includes(key)) return val;
  }
  return DEFAULT_COLOR;
}

const EVENT_EMOJI = { Holiday: "🌴", Birthday: "🎂", Celebration: "🎉", Anniversary: "💍", Wedding: "💒", Other: "📌" };
function eventEmoji(e) {
  const t = (e.title || "").toLowerCase();
  if (t.includes("christmas")) return "🎄";
  if (t.includes("halloween")) return "🎃";
  if (t.includes("valentine")) return "💝";
  if (t.includes("easter")) return "🐣";
  if (t.includes("new year")) return "🎆";
  return EVENT_EMOJI[e.type] || "📌";
}

function eventTypeIconName(title, type) {
  const t = String(title || "").toLowerCase();
  const normalized = String(type || "").toLowerCase();
  if (t.includes("christmas")) return "santa.png";
  if (t.includes("halloween")) return "pumpkin.png";
  if (t.includes("easter")) return "bunny.png";
  if (t.includes("patrick")) return "shamrock.png";
  if (t.includes("new year")) return "balloon.svg";
  if (t.includes("birthday") || normalized.includes("birthday")) return "birthday-cake.svg";
  if (t.includes("wedding") || normalized.includes("wedding")) return "wedding-church.svg";
  if (t.includes("anniversary") || normalized.includes("anniversary")) return "calendar.svg";
  if (normalized.includes("celebration")) return "balloon.svg";
  if (normalized.includes("holiday")) return "holiday-palm.svg";
  return "calendar.svg";
}
function illoUri(name) {
  return `https://hintdrop.app/illustrations/${name}`;
}

const EVENT_TYPES = ["Holiday", "Birthday", "Celebration", "Anniversary", "Wedding", "Other"];

function buildOwnBirthdayEvent(profile) {
  if (!profile?.birthday) return [];
  const bday = new Date(profile.birthday + "T00:00:00");
  if (isNaN(bday.getTime())) return [];
  const now = new Date();
  const month = bday.getMonth();
  const day = bday.getDate();
  for (let y = now.getFullYear(); y <= now.getFullYear() + 2; y++) {
    const date = new Date(y, month, day);
    if (date >= now) {
      return [{
        id: "own-birthday-" + y,
        title: "Your Birthday",
        event_date: toKey(date),
        raw_birthday: profile.birthday,
        type: "Birthday",
        source: "own",
        cta_label: "Update your hints",
        cta_href: "/hints",
      }];
    }
  }
  return [];
}

function buildContactBirthdayEvents(contacts) {
  const now = new Date();
  const rows = [];
  for (const contact of contacts || []) {
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
          event_date: toKey(date),
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

function EventDot({ color, size = 6 }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color.dot }} />;
}

function EventBadge({ color, children }) {
  return (
    <View style={[styles.eventBadge, { backgroundColor: color.badgeBg }]}>
      <Text style={[styles.eventBadgeText, { color: color.badgeText }]}>{children}</Text>
    </View>
  );
}

export default function CalendarScreen() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [contactsList, setContactsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = new Date();
  const todayKey = toKey(today);
  const [selectedDate, setSelectedDate] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ title: "", date: todayKey, type: "Holiday", recur: "none", color: "" });
  const [saving, setSaving] = useState(false);
  const [addEventError, setAddEventError] = useState("");
  const [editingBirthdayId, setEditingBirthdayId] = useState(null);
  const [showAddDatePicker, setShowAddDatePicker] = useState(false);
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [birthdayDraft, setBirthdayDraft] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    async function load() {
      const [{ data: personal }, { data: shared }, { data: contacts }, { data: ownProfile }] = await Promise.all([
        supabase.from("calendar_events").select("*").eq("user_id", user.id).order("event_date"),
        supabase.from("calendar_events").select("*").eq("is_shared", true).order("event_date"),
        supabase.from("contact_public_state").select("*").eq("owner_user_id", user.id),
        supabase.from("profiles").select("birthday").eq("id", user.id).maybeSingle(),
      ]);
      setContactsList(contacts || []);
      const birthdayEvents = buildContactBirthdayEvents(contacts || []);
      const ownBirthdayEvent = buildOwnBirthdayEvent(ownProfile);
      setEvents([...(personal || []), ...(shared || []), ...birthdayEvents, ...ownBirthdayEvent]);
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel(`calendar-live-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "calendar_events", filter: `user_id=eq.${user.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "contacts", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user?.id]);

  const eventsByDate = events.reduce((acc, e) => {
    const originalKey = (e.event_date || "").slice(0, 10);
    if (!originalKey) return acc;
    const addKey = (key) => { (acc[key] ||= []).push(e); };

    if (e.recurring === "yearly" || e.recurring === "monthly" || e.recurring === "weekly") {
      const original = parseDateOnlyLocal(originalKey);
      if (original) {
        if (e.recurring === "yearly") {
          addKey(toKey(new Date(currentMonth.getFullYear(), original.getMonth(), original.getDate())));
        } else if (e.recurring === "monthly") {
          addKey(toKey(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), original.getDate())));
        } else if (e.recurring === "weekly") {
          const daysInDisplayedMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
          for (let d = 1; d <= daysInDisplayedMonth; d++) {
            const candidate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d);
            if (candidate.getDay() === original.getDay()) addKey(toKey(candidate));
          }
        }
        return acc;
      }
    }
    addKey(originalKey);
    return acc;
  }, {});

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthTypeCounts = events.filter((e) => (e.event_date || "").startsWith(monthPrefix)).reduce((acc, e) => {
    const label = EVENT_EMOJI[e.type] ? e.type : "Other";
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
  const plurals = { Holiday: "holidays", Birthday: "birthdays", Celebration: "celebrations", Anniversary: "anniversaries", Wedding: "weddings", Other: "others" };
  const singular = { Holiday: "holiday", Birthday: "birthday", Celebration: "celebration", Anniversary: "anniversary", Wedding: "wedding", Other: "other" };
  const monthSummaryParts = Object.entries(monthTypeCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([type, count]) => `${EVENT_EMOJI[type] || "📌"} ${count} ${count > 1 ? plurals[type] : singular[type]}`);

  const selectedEvents = selectedDate ? eventsByDate[selectedDate] || [] : [];
  const upcoming = events.filter((e) => e.event_date >= todayKey).sort((a, b) => a.event_date.localeCompare(b.event_date)).slice(0, 3);

  function openDate(d) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    setSelectedDate(key);
    setSheetOpen(true);
    setAddForm((f) => ({ ...f, date: key }));
    setShowAdd(false);
  }

  // For "Coming up" rows specifically, since that event's date can be
  // in a month other than whichever one the grid currently has
  // displayed - openDate alone would build the wrong key in that
  // case (it always uses the currently-displayed year/month). Also
  // moves the grid itself to that month, so if the sheet is dismissed
  // the calendar is left showing the relevant month rather than
  // wherever it happened to be before.
  function openEventDate(event) {
    const parsed = parseDateOnlyLocal(event.event_date);
    if (parsed) setCurrentMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    setSelectedDate(event.event_date);
    setSheetOpen(true);
    setAddForm((f) => ({ ...f, date: event.event_date }));
    setShowAdd(false);
  }

  async function handleAddEvent() {
    if (!addForm.title || !addForm.date || !user?.id) return;
    setSaving(true);
    setAddEventError("");
    const isRecurring = addForm.recur !== "none";
    const { data: inserted, error } = await supabase.from("calendar_events").insert({
      user_id: user.id,
      title: addForm.title,
      event_date: addForm.date,
      type: addForm.type,
      is_recurring: isRecurring,
      recurring: isRecurring ? addForm.recur : null,
      color: addForm.color || null,
    }).select().maybeSingle();
    setSaving(false);
    if (error || !inserted) {
      setAddEventError("Couldn't save that event. Please try again.");
      return;
    }
    setEvents((prev) => [...prev, inserted]);
    setShowAdd(false);
    setAddForm({ title: "", date: selectedDate || "", type: "Holiday", recur: "none", color: "" });
  }

  function handleDeleteEvent(eventId) {
    Alert.alert("Delete this event?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("calendar_events").delete().eq("id", eventId);
          if (!error) setEvents((prev) => prev.filter((e) => e.id !== eventId));
        },
      },
    ]);
  }

  async function handleUpdateBirthday(contactId) {
    if (!birthdayDraft) return;
    const { error } = await supabase.from("contacts").update({ birthday: birthdayDraft }).eq("id", contactId);
    if (error) {
      Alert.alert("Couldn't save that birthday");
      return;
    }
    const updatedContacts = contactsList.map((c) => ((c.contact_id || c.id) === contactId ? { ...c, birthday: birthdayDraft } : c));
    setContactsList(updatedContacts);
    setEvents((prev) => [...prev.filter((e) => e.source !== "contact"), ...buildContactBirthdayEvents(updatedContacts)]);
    setEditingBirthdayId(null);
    setBirthdayDraft("");
  }

  function EventCard({ e }) {
    const c = eventColor(e);
    const isDeletable = e.source !== "contact" && e.source !== "own";
    const isEditingThisBirthday = e.source === "contact" && editingBirthdayId === e.contact_id;
    return (
      <View style={[styles.eventCard, c.custom ? { borderColor: c.custom } : null]}>
        <View style={styles.eventCardTopRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <EventDot color={c} />
            <EventBadge color={c}>{eventEmoji(e)} {e.type || "Event"}</EventBadge>
          </View>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {e.source === "contact" ? (
              <Pressable style={styles.eventCardIconButton} onPress={() => { setEditingBirthdayId(e.contact_id); setBirthdayDraft(e.raw_birthday || ""); }}>
                <Text style={styles.eventCardIconText}>✎</Text>
              </Pressable>
            ) : null}
            {isDeletable ? (
              <Pressable style={styles.eventCardIconButton} onPress={() => handleDeleteEvent(e.id)}>
                <Text style={styles.eventCardIconText}>✕</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        <Text style={styles.eventCardTitle}>{e.title}</Text>
        {isEditingThisBirthday ? (
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10, alignItems: "center" }}>
            <Pressable style={[styles.formInput, { flex: 1, justifyContent: "center" }]} onPress={() => setShowBirthdayPicker(true)}>
              <Text style={{ fontSize: 13, color: birthdayDraft ? colors.textPrimary : colors.textMuted }}>{birthdayDraft || "Select date"}</Text>
            </Pressable>
            {showBirthdayPicker ? (
              <DateTimePicker
                value={birthdayDraft ? new Date(birthdayDraft + "T00:00:00") : new Date()}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowBirthdayPicker(false);
                  if (event.type === "set" && date) setBirthdayDraft(toKey(date));
                }}
              />
            ) : null}
            <Pressable style={styles.eventCardCtaButton} onPress={() => handleUpdateBirthday(e.contact_id)}>
              <Text style={styles.eventCardCtaText}>Save</Text>
            </Pressable>
          </View>
        ) : e.cta_label ? (
          <Pressable style={styles.eventCardCtaButton}>
            <Text style={styles.eventCardCtaText}>{e.cta_label}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  function AddEventForm() {
    return (
      <View style={styles.addForm}>
        <Text style={styles.addFormTitle}>New event</Text>
        {addEventError ? <Text style={styles.addFormError}>{addEventError}</Text> : null}
        <TextInput style={styles.formInput} value={addForm.title} onChangeText={(v) => setAddForm((f) => ({ ...f, title: v }))} placeholder="Event title" placeholderTextColor={colors.textMuted} />
        <Pressable style={[styles.formInput, { justifyContent: "center" }]} onPress={() => setShowAddDatePicker(true)}>
          <Text style={{ fontSize: 13, color: colors.textPrimary }}>{new Date(addForm.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</Text>
        </Pressable>
        {showAddDatePicker ? (
          <DateTimePicker
            value={new Date(addForm.date + "T00:00:00")}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowAddDatePicker(false);
              if (event.type === "set" && date) setAddForm((f) => ({ ...f, date: toKey(date) }));
            }}
          />
        ) : null}
        <View style={styles.typeChipsRow}>
          {EVENT_TYPES.map((t) => (
            <Pressable key={t} style={[styles.typeChip, addForm.type === t && styles.typeChipActive]} onPress={() => setAddForm((f) => ({ ...f, type: t }))}>
              <Text style={[styles.typeChipText, addForm.type === t && styles.typeChipTextActive]}>{EVENT_EMOJI[t]} {t}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.typeChipsRow}>
          {["none", "weekly", "monthly", "yearly"].map((r) => (
            <Pressable key={r} style={[styles.typeChip, addForm.recur === r && styles.typeChipActive]} onPress={() => setAddForm((f) => ({ ...f, recur: r }))}>
              <Text style={[styles.typeChipText, addForm.recur === r && styles.typeChipTextActive]}>{r === "none" ? "Does not repeat" : `Repeats ${r}`}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.colorLabel}>Colour (optional)</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Pressable onPress={() => setAddForm((f) => ({ ...f, color: "" }))} style={[styles.colorSwatch, { alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: !addForm.color ? colors.coral : colors.border }]}>
            <Text style={{ fontSize: 10, color: colors.textMuted }}>✕</Text>
          </Pressable>
          {PASTEL_PALETTE.map((p) => (
            <Pressable key={p.hex} onPress={() => setAddForm((f) => ({ ...f, color: p.hex }))} style={[styles.colorSwatch, { backgroundColor: p.hex, borderWidth: 2, borderColor: addForm.color === p.hex ? "#334155" : "#fff" }]} />
          ))}
        </View>
        <Pressable style={styles.saveEventButton} onPress={handleAddEvent} disabled={saving}>
          <Text style={styles.saveEventButtonText}>{saving ? "Saving..." : "Save event"}</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.screenTitle}>Calendar</Text>
        <ActivityIndicator color={colors.coral} style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.screenTitle}>Calendar</Text>

        <View style={styles.monthNavRow}>
          <Pressable style={styles.monthNavButton} onPress={() => setCurrentMonth(new Date(year, month - 1))}>
            <Text style={styles.monthNavIcon}>‹</Text>
          </Pressable>
          <View style={{ alignItems: "center" }}>
            <Text style={styles.monthName}>{monthName}</Text>
            {todayKey !== toKey(currentMonth) || selectedDate !== todayKey ? (
              <Pressable onPress={() => { setCurrentMonth(today); setSelectedDate(todayKey); }}>
                <Text style={styles.jumpToday}>Jump to today</Text>
              </Pressable>
            ) : null}
          </View>
          <Pressable style={styles.monthNavButton} onPress={() => setCurrentMonth(new Date(year, month + 1))}>
            <Text style={styles.monthNavIcon}>›</Text>
          </Pressable>
        </View>

        {monthSummaryParts.length > 0 ? <Text style={styles.monthSummary}>{monthSummaryParts.join("  ·  ")} this month</Text> : null}

        <View style={styles.weekdayRow}>
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <Text key={i} style={styles.weekdayText}>{d}</Text>
          ))}
        </View>

        <View style={styles.monthGrid}>
          {Array.from({ length: firstDay }).map((_, i) => <View key={"e" + i} style={styles.dayCellEmpty} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const d = i + 1;
            const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const dayEvents = eventsByDate[key] || [];
            const isToday = key === todayKey;
            const isSelected = key === selectedDate;
            const showSingleIcon = dayEvents.length === 1;
            return (
              <Pressable
                key={d}
                onPress={() => openDate(d)}
                style={[
                  styles.dayCell,
                  isSelected ? styles.dayCellSelected : isToday ? styles.dayCellToday : null,
                ]}
              >
                <Text style={[styles.dayCellText, isSelected ? styles.dayCellTextSelected : isToday ? styles.dayCellTextToday : dayEvents.length ? styles.dayCellTextHasEvents : styles.dayCellTextMuted]}>{d}</Text>
                {showSingleIcon ? (
                  <Image source={{ uri: illoUri(eventTypeIconName(dayEvents[0].title, dayEvents[0].type)) }} style={styles.dayCellIcon} resizeMode="contain" />
                ) : dayEvents.length > 0 && !isSelected ? (
                  <View style={{ flexDirection: "row", gap: 2, position: "absolute", bottom: 4 }}>
                    {dayEvents.slice(0, 3).map((e, idx) => <EventDot key={idx} color={eventColor(e)} size={4} />)}
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionLabel}>COMING UP</Text>
          {upcoming.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 24 }}>
              <Image source={{ uri: illoUri("calendar.svg") }} style={{ width: 64, height: 64, opacity: 0.8, marginBottom: 8 }} resizeMode="contain" />
              <Text style={styles.emptyText}>Nothing coming up yet.</Text>
              <Text style={styles.emptySubtext}>Add a birthday or event to keep track of it here.</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {upcoming.map((e) => {
                const c = eventColor(e);
                return (
                  <Pressable key={e.id} onPress={() => openEventDate(e)} style={[styles.upcomingRow, c.custom ? { borderColor: c.custom } : null]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <EventDot color={c} />
                      <View>
                        <Text style={styles.upcomingTitle}>{eventEmoji(e)} {e.title}</Text>
                        <Text style={styles.upcomingDate}>{new Date(e.event_date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</Text>
                      </View>
                    </View>
                    {e.cta_label ? (
                      <View style={styles.upcomingCta}><Text style={styles.upcomingCtaText}>{e.cta_label}</Text></View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => { setSheetOpen(false); setShowAdd(false); }}>
        <Pressable style={styles.sheetOverlay} onPress={() => { setSheetOpen(false); setShowAdd(false); }}>
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.55)"]} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
          <Pressable style={styles.sheetCard} onPress={() => {}}>
            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetTitle}>{selectedDate ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) : ""}</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable style={styles.addEventButton} onPress={() => { setShowAdd((v) => !v); setAddEventError(""); }}>
                  <Text style={styles.addEventButtonText}>+ Add event</Text>
                </Pressable>
                <Pressable style={styles.sheetCloseButton} onPress={() => { setSheetOpen(false); setShowAdd(false); }}>
                  <Text style={styles.eventCardIconText}>✕</Text>
                </Pressable>
              </View>
            </View>
            <ScrollView style={{ maxHeight: 420 }}>
              {showAdd ? <AddEventForm /> : null}
              {selectedEvents.length === 0 && !showAdd ? (
                <View style={{ alignItems: "center", paddingVertical: 24 }}>
                  <Text style={styles.emptyText}>Nothing on this day yet.</Text>
                </View>
              ) : (
                <View style={{ gap: 10, marginTop: showAdd ? 12 : 0 }}>
                  {selectedEvents.map((e) => <EventCard key={e.id} e={e} />)}
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: 16, paddingBottom: 40 },
  screenTitle: { fontSize: 28, fontWeight: "700", letterSpacing: -1.1, color: colors.textPrimary, marginTop: 16, marginBottom: 16 },
  monthNavRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  monthNavButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  monthNavIcon: { fontSize: 20, color: colors.textSecondary },
  monthName: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  jumpToday: { fontSize: 11, fontWeight: "700", color: colors.coralDeep, marginTop: 2 },
  monthSummary: { fontSize: 12, color: colors.textSecondary, textAlign: "center", marginTop: 10 },
  weekdayRow: { flexDirection: "row", marginTop: 16 },
  weekdayText: { flex: 1, textAlign: "center", fontSize: 12, fontWeight: "700", color: colors.textMuted },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  dayCellEmpty: { width: "14.28%", height: 44 },
  dayCell: { width: "14.28%", height: 44, alignItems: "center", justifyContent: "center", position: "relative" },
  dayCellSelected: { backgroundColor: colors.coral, borderRadius: 22 },
  dayCellToday: { backgroundColor: "#fff4ee", borderRadius: 22, borderWidth: 1, borderColor: "#f6cbb3" },
  dayCellText: { fontSize: 14, fontWeight: "600" },
  dayCellTextSelected: { color: "#fff" },
  dayCellTextToday: { color: colors.coral },
  dayCellTextHasEvents: { color: colors.textPrimary },
  dayCellTextMuted: { color: colors.textMuted },
  dayCellIcon: { width: 16, height: 16, position: "absolute", bottom: 4 },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.6, marginBottom: 10 },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: "center" },
  emptySubtext: { fontSize: 11, color: colors.textMuted, textAlign: "center", marginTop: 2 },
  upcomingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: radii.lg, padding: 12 },
  upcomingTitle: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  upcomingDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  upcomingCta: { height: 30, paddingHorizontal: 12, borderRadius: radii.pill, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center" },
  upcomingCtaText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  eventBadge: { borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 3 },
  eventBadgeText: { fontSize: 11, fontWeight: "700" },
  sheetOverlay: { flex: 1, justifyContent: "flex-end" },
  sheetCard: { backgroundColor: colors.bg, borderTopLeftRadius: radii.xxl, borderTopRightRadius: radii.xxl, padding: 18, maxHeight: "82%" },
  sheetHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  sheetTitle: { fontSize: 15, fontWeight: "700", color: colors.textPrimary, flex: 1 },
  addEventButton: { height: 32, paddingHorizontal: 12, borderRadius: radii.pill, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center" },
  addEventButtonText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  sheetCloseButton: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  eventCard: { borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 14 },
  eventCardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eventCardIconButton: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  eventCardIconText: { fontSize: 11, color: colors.textMuted },
  eventCardTitle: { fontSize: 15, fontWeight: "700", color: colors.textPrimary, marginTop: 8 },
  eventCardCtaButton: { marginTop: 10, height: 34, paddingHorizontal: 14, borderRadius: radii.pill, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center", alignSelf: "flex-start" },
  eventCardCtaText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  addForm: { borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, padding: 14, gap: 10 },
  addFormTitle: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  addFormError: { fontSize: 12, fontWeight: "600", color: "#b14f43", backgroundColor: "#fff4f2", borderWidth: 1, borderColor: "#f3d4cc", borderRadius: radii.sm, padding: 8 },
  formInput: { height: 40, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 12, fontSize: 13, color: colors.textPrimary },
  typeChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  typeChip: { height: 32, paddingHorizontal: 10, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  typeChipActive: { borderColor: colors.coral, backgroundColor: "#fff4ee" },
  typeChipText: { fontSize: 12, color: colors.textSecondary },
  typeChipTextActive: { color: colors.coral, fontWeight: "700" },
  colorLabel: { fontSize: 11, fontWeight: "700", color: colors.textSecondary },
  colorSwatch: { width: 28, height: 28, borderRadius: 14 },
  saveEventButton: { height: 40, borderRadius: radii.pill, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center" },
  saveEventButtonText: { fontSize: 13, fontWeight: "700", color: "#fff" },
});
