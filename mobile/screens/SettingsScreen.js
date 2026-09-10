import { useEffect, useState } from "react";
import { View, StyleSheet, Pressable, ScrollView, Switch, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import Text from "../components/Text";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { colors, radii, spacing, shadow } from "../lib/theme";
import { REGIONS, getStoredRegion, setStoredRegion } from "../lib/region";

// Mirrors app/settings/SettingsClient.jsx - same profiles fields,
// same defaults, written directly via Supabase rather than calling
// web's saveSettings server action (a Next.js server action isn't
// reachable from a mobile client) - confirmed that action itself
// just upserts these same profiles columns, so this writes the
// identical data web does.
//
// Push notifications section is adapted, not ported 1:1: web's
// version is a manual subscribe/unsubscribe toggle tied to VAPID/
// browser push. Mobile's push (see lib/pushNotifications.js) is
// registered automatically once signed in and gated by the OS
// permission dialog, not a per-app toggle - so this shows the actual
// OS permission status read-only, with a link out to system settings
// if it's off, rather than a checkbox that would just be redundant
// with (and could get out of sync with) the OS's own switch.
const interestOptions = ["Home", "Food", "Beauty", "Tech", "Travel", "Wellness", "Books", "Fashion", "Experiences", "Music", "Gaming", "Other"];
const currencyOptions = [
  { code: "GBP", label: "GBP — British Pound" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "USD", label: "USD — US Dollar" },
  { code: "AUD", label: "AUD — Australian Dollar" },
  { code: "CAD", label: "CAD — Canadian Dollar" },
];
const reminderDayOptions = [
  { value: "1", label: "1 day before" },
  { value: "3", label: "3 days before" },
  { value: "7", label: "1 week before" },
  { value: "14", label: "2 weeks before" },
  { value: "30", label: "1 month before" },
];

function ToggleRow({ title, subtitle, value, onValueChange, disabled }) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.toggleTitle}>{title}</Text>
        {subtitle ? <Text style={styles.toggleSubtitle}>{subtitle}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} disabled={disabled} trackColor={{ true: colors.coral }} />
    </View>
  );
}

function SelectRow({ label, value, options, onSelect }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => (o.code || o.value) === value);
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable style={styles.selectButton} onPress={() => setOpen((v) => !v)}>
        <Text style={styles.selectButtonText}>{selected?.label || value}</Text>
        <Text style={styles.selectChevron}>{open ? "▲" : "▼"}</Text>
      </Pressable>
      {open ? (
        <View style={styles.selectOptions}>
          {options.map((o) => {
            const key = o.code || o.value;
            return (
              <Pressable key={key} style={styles.selectOption} onPress={() => { onSelect(key); setOpen(false); }}>
                <Text style={[styles.selectOptionText, key === value && { color: colors.coral, fontWeight: "700" }]}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export default function SettingsScreen({ onClose }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [emailReminders, setEmailReminders] = useState(true);
  const [personalizedOffers, setPersonalizedOffers] = useState(true);
  const [hintSaleAlerts, setHintSaleAlerts] = useState(true);
  const [productUpdates, setProductUpdates] = useState(false);
  const [circleReminders, setCircleReminders] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [defaultReminderDays, setDefaultReminderDays] = useState("7");
  const [currency, setCurrency] = useState("GBP");
  const [interests, setInterests] = useState(["Travel", "Food"]);
  const [shopRegion, setShopRegion] = useState("uk");
  const [pushGranted, setPushGranted] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!user?.id) return;
      const { data } = await supabase
        .from("profiles")
        .select("email_reminders, personalized_offers, hint_sale_alerts, product_updates, circle_reminders, weekly_digest, default_reminder_days, currency, interests")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      setEmailReminders(data?.email_reminders ?? true);
      setPersonalizedOffers(data?.personalized_offers ?? true);
      setHintSaleAlerts(data?.hint_sale_alerts ?? true);
      setProductUpdates(data?.product_updates ?? false);
      setCircleReminders(data?.circle_reminders ?? true);
      setWeeklyDigest(data?.weekly_digest ?? true);
      setDefaultReminderDays(String(data?.default_reminder_days ?? 7));
      setCurrency(data?.currency ?? "GBP");
      setInterests(Array.isArray(data?.interests) && data.interests.length >= 2 ? data.interests : ["Travel", "Food"]);
      setShopRegion(await getStoredRegion());
      setLoading(false);

      const { status } = await Notifications.getPermissionsAsync();
      if (active) setPushGranted(status === "granted");
    }
    load();
    return () => { active = false; };
  }, [user?.id]);

  // Mirrors handleShopRegionChange in SettingsClient.jsx - same
  // effect (which catalog /api/products?region= pulls from), stored
  // via AsyncStorage instead of web's cookie.
  async function handleShopRegionChange(nextRegion) {
    setShopRegion(nextRegion);
    await setStoredRegion(nextRegion);
  }

  function toggleInterest(interest) {
    setError("");
    setSuccess("");
    setInterests((current) => (current.includes(interest) ? current.filter((i) => i !== interest) : [...current, interest]));
  }

  async function handleSave() {
    setError("");
    setSuccess("");
    if (interests.length < 2) {
      setError("Please choose at least 2 interests.");
      return;
    }
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          email_reminders: emailReminders,
          personalized_offers: personalizedOffers,
          hint_sale_alerts: hintSaleAlerts,
          product_updates: productUpdates,
          circle_reminders: circleReminders,
          weekly_digest: weeklyDigest,
          default_reminder_days: Number(defaultReminderDays),
          currency,
          interests,
        })
        .eq("id", user.id);
      if (updateError) throw updateError;
      setSuccess("Settings saved.");
    } catch (err) {
      setError(err?.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={["top", "left", "right"]}>
        <ActivityIndicator color={colors.coral} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.headerBack} hitSlop={8}>
          <Text style={styles.headerBackText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageSubtitle}>Manage how HintDrop contacts you, how early reminders arrive, your interests, and your currency.</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How you hear from us</Text>
          <ToggleRow title="Email reminders" subtitle="Receive reminders for upcoming occasions and gift moments." value={emailReminders} onValueChange={setEmailReminders} />
          <ToggleRow
            title="Push notifications"
            subtitle={pushGranted === false ? "Off in your device settings — enable notifications for HintDrop there to turn this on." : "Notifications are handled by your device's permission for HintDrop."}
            value={pushGranted === true}
            disabled
            onValueChange={() => {}}
          />
          <ToggleRow title="Personalised offers" subtitle="See relevant ideas and offers based on your profile and activity." value={personalizedOffers} onValueChange={setPersonalizedOffers} />
          <ToggleRow title="Hint sale alerts" subtitle="Get notified if something linked to one of your hints goes on sale." value={hintSaleAlerts} onValueChange={setHintSaleAlerts} />
          <ToggleRow title="Product updates" subtitle="Hear about new features and improvements to HintDrop." value={productUpdates} onValueChange={setProductUpdates} />
          <ToggleRow title="Circle reminders" subtitle="Reminders about circles you've joined, upcoming deadlines, and pending contributions." value={circleReminders} onValueChange={setCircleReminders} />
          <ToggleRow title="Weekly digest" subtitle="A weekly summary of new hints from your contacts." value={weeklyDigest} onValueChange={setWeeklyDigest} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reminder timing</Text>
          <SelectRow label="Default reminder time" value={defaultReminderDays} options={reminderDayOptions} onSelect={setDefaultReminderDays} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interests</Text>
          <Text style={styles.sectionSubtitle}>Pick at least 2 interests so HintDrop can keep suggestions relevant.</Text>
          <View style={styles.chipsRow}>
            {interestOptions.map((interest) => {
              const selected = interests.includes(interest);
              return (
                <Pressable key={interest} style={[styles.chip, selected && styles.chipSelected]} onPress={() => toggleInterest(interest)}>
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{interest}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Currency</Text>
          <SelectRow label="Preferred currency" value={currency} options={currencyOptions} onSelect={setCurrency} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shop region</Text>
          <Text style={styles.sectionSubtitle}>Which gift shop catalogue you see by default. Change it here if you're shopping for someone in a different country.</Text>
          <SelectRow
            label="Default shop"
            value={shopRegion}
            options={Object.values(REGIONS).map((r) => ({ code: r.code, label: `${r.label} — ${r.currency}` }))}
            onSelect={handleShopRegionChange}
          />
        </View>

        {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
        {success ? <View style={styles.successBox}><Text style={styles.successText}>{success}</Text></View> : null}

        <Pressable style={[styles.saveButton, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save settings"}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card },
  headerBack: { paddingVertical: 4 },
  headerBackText: { fontSize: 14, fontWeight: "600", color: colors.coral },
  headerTitle: { fontSize: 17, fontWeight: "700", color: colors.textPrimary },
  scrollContent: { padding: 16, paddingBottom: 60 },
  pageSubtitle: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginBottom: 16 },
  section: { backgroundColor: colors.card, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 14, ...shadow, shadowOpacity: 0.04 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.textPrimary },
  sectionSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  toggleRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#f1e4dc", backgroundColor: "#fffdfa", borderRadius: radii.lg, padding: 12, marginTop: 12 },
  toggleTitle: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  toggleSubtitle: { fontSize: 11, color: colors.textMuted, marginTop: 2, lineHeight: 15 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.textPrimary, marginTop: 12, marginBottom: 6 },
  selectButton: { height: 46, borderRadius: radii.md, borderWidth: 1, borderColor: "#cbd0d8", backgroundColor: colors.card, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  selectButtonText: { fontSize: 13, color: colors.textPrimary },
  selectChevron: { fontSize: 10, color: colors.textMuted },
  selectOptions: { marginTop: 6, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: "hidden" },
  selectOption: { paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  selectOptionText: { fontSize: 13, color: colors.textSecondary },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  chip: { borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  chipSelected: { backgroundColor: "#e3f5ea", borderColor: "#e3f5ea" },
  chipText: { fontSize: 12, color: colors.textSecondary },
  chipTextSelected: { color: "#2f8a5f", fontWeight: "600" },
  errorBox: { backgroundColor: "#fde8e8", borderRadius: radii.lg, padding: 14, marginBottom: 14 },
  errorText: { fontSize: 13, color: "#c12020" },
  successBox: { backgroundColor: "#edf8ef", borderRadius: radii.lg, padding: 14, marginBottom: 14 },
  successText: { fontSize: 13, color: "#23643b" },
  saveButton: { height: 50, borderRadius: radii.pill, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center", ...shadow },
  saveButtonText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
