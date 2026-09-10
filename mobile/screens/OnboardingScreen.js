import { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Image } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Text from "../components/Text";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { colors, radii, spacing, shadow } from "../lib/theme";

// Mirrors app/onboarding/OnboardingClient.jsx - a genuinely significant
// gap this closes, not a minor one: web gates the entire app behind
// profiles.onboarding_completed (app/feed/page.js server-redirects to
// /onboarding when it's false), and mobile had no equivalent check at
// all - a new mobile signup would have gone straight into the main
// app, profile.interests/birthday/etc. never collected, and
// onboarding_completed never set, which would in turn make that same
// account redirect to /onboarding on web instead of feed if they ever
// opened the site too. Same 3 steps as web (Birthday, Interests, Your
// circle), same profiles fields, same send-contact-invite edge
// function for step 3's optional contact add.
//
// Explicitly deferred, not silently dropped:
// - Google/Microsoft contact search in step 3 (searchGoogleContacts)
//   - needs session.provider_token from the OAuth flow, which Supabase
//   mobile's own OAuth flow doesn't expose the same way web's does
//   (same reasoning already applied to Circle's Google-contacts search
//   omission). Manual name/email/relationship entry - the actual
//   invite-sending path - is fully ported.
// - Invite-token acceptance from a URL param (someone signing up via a
//   shared circle/contact link) - mobile has no URL-param entry point
//   equivalent to web's /onboarding?invite_token=...; this only
//   matters for a specific deep-link signup flow that doesn't exist on
//   mobile yet.
// - signup_source/share-context attribution (consumeShareContext) -
//   web-only, tied to localStorage state set by web's own share-link
//   pages. Mobile signups always save signup_source: "direct", the
//   correct value for every case that can actually happen here.

const interestOptions = ["Home", "Food", "Beauty", "Tech", "Travel", "Wellness", "Books", "Fashion", "Experiences", "Music", "Gaming", "Other"];
const relationshipOptions = ["Partner", "Spouse", "Family", "Friend", "Parent", "Child", "Sibling", "Cousin", "Colleague", "Roommate", "Best friend", "Other"];
const steps = [{ id: 1, label: "Birthday" }, { id: 2, label: "Interests" }, { id: 3, label: "Your circle" }];

function getInitials(name = "") {
  const trimmed = name.trim();
  if (!trimmed) return "U";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
}

export default function OnboardingScreen({ onComplete }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState(["Travel", "Food"]);
  const [selectedRelationships, setSelectedRelationships] = useState(["Friend"]);
  const [form, setForm] = useState({ fullName: "", birthday: "", inviteName: "", inviteEmail: "", otherInterest: "" });
  const [errors, setErrors] = useState({});
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [addingContact, setAddingContact] = useState(false);
  const [contactAdded, setContactAdded] = useState(false);
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);

  const progress = useMemo(() => `${(step / steps.length) * 100}%`, [step]);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser || !active) return;
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, birthday, interests, other_interest, onboarding_completed")
        .eq("id", authUser.id)
        .maybeSingle();
      if (!active) return;

      if (!existingProfile?.signup_source) {
        // See the deferred-features note above - mobile has no share-
        // context or circle_owner URL param to inspect, so "direct" is
        // the only value that can ever be correct here.
        await supabase.from("profiles").update({ signup_source: "direct" }).eq("id", authUser.id);
      }

      const metadata = authUser.user_metadata || {};
      const resolvedName = existingProfile?.full_name || metadata.full_name || "";
      const resolvedAvatar = existingProfile?.avatar_url || metadata.avatar_url || "";
      const filteredExistingInterests = Array.isArray(existingProfile?.interests) ? existingProfile.interests.filter((i) => interestOptions.includes(i)) : [];

      setForm((prev) => ({ ...prev, fullName: resolvedName, birthday: existingProfile?.birthday || "", otherInterest: existingProfile?.other_interest || "" }));
      setSelectedInterests(filteredExistingInterests.length >= 2 ? filteredExistingInterests : ["Travel", "Food"]);
      setAvatarUrl(resolvedAvatar);
      setProfileLoaded(true);
    }
    load();
    return () => { active = false; };
  }, []);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
    if ((key === "inviteName" || key === "inviteEmail") && contactAdded) setContactAdded(false);
  }

  function toggleInterest(interest) {
    const isRemovingOther = interest === "Other" && selectedInterests.includes("Other");
    setSelectedInterests((prev) => (prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]));
    if (isRemovingOther) setForm((prev) => ({ ...prev, otherInterest: "" }));
    setErrors((prev) => ({ ...prev, interests: "", otherInterest: "" }));
  }

  function toggleRelationship(relationship) {
    setSelectedRelationships((prev) => (prev.includes(relationship) ? prev.filter((r) => r !== relationship) : [...prev, relationship]));
    setErrors((prev) => ({ ...prev, relationships: "" }));
  }

  function validateStep() {
    const nextErrors = {};
    if (step === 1) {
      if (!form.fullName.trim()) nextErrors.fullName = "Please tell us what to call you.";
      if (!form.birthday.trim()) nextErrors.birthday = "Please add your birthday (so your closest people won't forget).";
    }
    if (step === 2) {
      if (selectedInterests.length < 2) nextErrors.interests = "Pick at least 2 interests.";
      if (selectedInterests.includes("Other") && !form.otherInterest.trim()) nextErrors.otherInterest = "Tell us your other interest.";
    }
    if (step === 3) {
      if (form.inviteEmail && !form.inviteName.trim()) nextErrors.inviteName = "Add a name to match the email.";
      if (form.inviteName && !form.inviteEmail.trim()) nextErrors.inviteEmail = "Add an email to match the name.";
      if ((form.inviteName.trim() || form.inviteEmail.trim()) && selectedRelationships.length === 0) nextErrors.relationships = "Choose at least one relationship type.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function saveProfile(values = {}) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return { ok: false };
    const payload = {
      id: authUser.id,
      full_name: form.fullName.trim() || null,
      avatar_url: avatarUrl || null,
      birthday: form.birthday || null,
      interests: selectedInterests,
      other_interest: selectedInterests.includes("Other") ? form.otherInterest.trim() || null : null,
      ...values,
    };
    const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
    return { ok: !error };
  }

  async function saveConnection() {
    const hasInviteName = form.inviteName.trim().length > 0;
    const hasInviteEmail = form.inviteEmail.trim().length > 0;
    if (!hasInviteName && !hasInviteEmail) return true;
    const { error } = await supabase.functions.invoke("send-contact-invite", {
      body: { email: form.inviteEmail.trim().toLowerCase(), name: form.inviteName.trim(), role: selectedRelationships[0] || "Friend" },
    });
    return !error;
  }

  async function handleAddContact() {
    if (addingContact) return;
    const nextErrors = {};
    if (form.inviteEmail && !form.inviteName.trim()) nextErrors.inviteName = "Add a name to match the email.";
    if (form.inviteName && !form.inviteEmail.trim()) nextErrors.inviteEmail = "Add an email to match the name.";
    if (!form.inviteName.trim() && !form.inviteEmail.trim()) {
      nextErrors.inviteName = "Add a name or email first.";
    } else if (selectedRelationships.length === 0) {
      nextErrors.relationships = "Choose at least one relationship type.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setAddingContact(true);
    setErrors({});
    try {
      const saved = await saveConnection();
      if (!saved) return;
      setForm((prev) => ({ ...prev, inviteName: "", inviteEmail: "" }));
      setSelectedRelationships([]);
      setContactAdded(true);
    } finally {
      setAddingContact(false);
    }
  }

  async function nextStep() {
    if (!validateStep()) return;
    if (step === 1 || step === 2) {
      const result = await saveProfile();
      if (!result.ok) return;
    }
    setStep((prev) => Math.min(prev + 1, steps.length));
  }

  function previousStep() {
    if (saving) return;
    setStep((prev) => Math.max(prev - 1, 1));
  }

  function skipInviteStep() {
    finishOnboarding(true);
  }

  async function finishOnboarding(skippedInvite = false) {
    if (saving) return;
    if (!skippedInvite && !validateStep()) return;
    setSaving(true);
    try {
      const result = await saveProfile({ onboarding_completed: true });
      if (!result.ok) {
        setSaving(false);
        return;
      }
      if (!skippedInvite) {
        const connectionSaved = await saveConnection();
        if (!connectionSaved) {
          setSaving(false);
          return;
        }
      }
      onComplete?.();
    } catch {
      setSaving(false);
    }
  }

  if (!profileLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <ActivityIndicator color={colors.coral} size="large" />
          <Text style={styles.loadingTitle}>We're getting your profile ready</Text>
          <Text style={styles.loadingSubtitle}>Pulling everything together so your space feels personal from the start.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: progress }]} />
          </View>

          <View style={styles.stepsRow}>
            {steps.map((s) => {
              const active = step === s.id;
              const complete = step > s.id;
              return (
                <View key={s.id} style={styles.stepPill}>
                  <View style={[styles.stepCircle, complete ? styles.stepCircleComplete : active ? styles.stepCircleActive : styles.stepCircleInactive]}>
                    <Text style={[styles.stepCircleText, complete && { color: "#fff" }, active && { color: "#ea7451" }]}>{complete ? "✓" : s.id}</Text>
                  </View>
                  <Text style={[styles.stepLabel, (active || complete) && styles.stepLabelActive]}>{s.label}</Text>
                </View>
              );
            })}
          </View>

          {step === 1 ? (
            <View style={{ marginTop: 24 }}>
              <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>Step 1 of 3</Text></View>
              <Text style={styles.stepTitle}>Tell us a bit about you.</Text>
              <Text style={styles.stepSubtitle}>You can change these anytime from your account.</Text>

              {avatarUrl || form.fullName ? (
                <View style={styles.avatarRow}>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                  ) : (
                    <View style={[styles.avatarImage, { alignItems: "center", justifyContent: "center", backgroundColor: "#2f3b2d" }]}>
                      <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>{getInitials(form.fullName)}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.avatarRowTitle}>Welcome to HintDrop</Text>
                    <Text style={styles.avatarRowSubtitle}>We'll use this profile photo on your account when available.</Text>
                  </View>
                </View>
              ) : null}

              <View style={{ marginTop: 20 }}>
                <Text style={styles.fieldLabel}>What should you be called?</Text>
                <TextInput style={[styles.fieldInput, errors.fullName && styles.fieldInputError]} value={form.fullName} onChangeText={(v) => updateField("fullName", v)} placeholder="Your name" placeholderTextColor={colors.textMuted} />
                {errors.fullName ? <Text style={styles.fieldError}>{errors.fullName}</Text> : null}
              </View>

              <View style={{ marginTop: 20 }}>
                <Text style={styles.fieldLabel}>Birthday</Text>
                <Pressable style={[styles.fieldInput, styles.fieldInputPressable, errors.birthday && styles.fieldInputError]} onPress={() => setShowBirthdayPicker(true)}>
                  <Text style={{ fontSize: 14, color: form.birthday ? colors.textPrimary : colors.textMuted }}>
                    {form.birthday ? new Date(form.birthday + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "Select date"}
                  </Text>
                </Pressable>
                {showBirthdayPicker ? (
                  <DateTimePicker
                    value={form.birthday ? new Date(form.birthday + "T00:00:00") : new Date(2000, 0, 1)}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                      setShowBirthdayPicker(false);
                      if (event.type === "set" && date) {
                        const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, "0"), d = String(date.getDate()).padStart(2, "0");
                        updateField("birthday", `${y}-${m}-${d}`);
                      }
                    }}
                  />
                ) : null}
                {errors.birthday ? <Text style={styles.fieldError}>{errors.birthday}</Text> : null}
              </View>
            </View>
          ) : null}

          {step === 2 ? (
            <View style={{ marginTop: 24 }}>
              <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>Step 2 of 3</Text></View>
              <Text style={styles.stepTitle}>What kinds of things are you into?</Text>
              <Text style={styles.stepSubtitle}>Pick at least 2 interests so we can improve your experience.</Text>

              <View style={styles.chipsRow}>
                {interestOptions.map((interest) => {
                  const selected = selectedInterests.includes(interest);
                  return (
                    <Pressable key={interest} style={[styles.chip, selected && styles.chipSelected]} onPress={() => toggleInterest(interest)}>
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{interest}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {selectedInterests.includes("Other") ? (
                <View style={{ marginTop: 18 }}>
                  <Text style={styles.fieldLabel}>Tell us another interest</Text>
                  <TextInput style={[styles.fieldInput, errors.otherInterest && styles.fieldInputError]} value={form.otherInterest} onChangeText={(v) => updateField("otherInterest", v)} placeholder="Crafts, collecting, pets..." placeholderTextColor={colors.textMuted} />
                  {errors.otherInterest ? <Text style={styles.fieldError}>{errors.otherInterest}</Text> : null}
                </View>
              ) : null}

              <Text style={styles.helperText}>{errors.interests || "Choose at least 2 to continue."}</Text>
            </View>
          ) : null}

          {step === 3 ? (
            <View style={{ marginTop: 24 }}>
              <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>Step 3 of 3</Text></View>
              <Text style={styles.stepTitle}>Who's in your circle?</Text>
              <Text style={styles.stepSubtitle}>Add someone important, then choose the relationship tags that fit best.</Text>

              <View style={styles.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Name</Text>
                  <TextInput style={[styles.fieldInput, errors.inviteName && styles.fieldInputError]} value={form.inviteName} onChangeText={(v) => updateField("inviteName", v)} placeholder="Sarah" placeholderTextColor={colors.textMuted} />
                  {errors.inviteName ? <Text style={styles.fieldError}>{errors.inviteName}</Text> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Email address</Text>
                  <TextInput style={[styles.fieldInput, errors.inviteEmail && styles.fieldInputError]} value={form.inviteEmail} onChangeText={(v) => updateField("inviteEmail", v)} placeholder="sarah@example.com" placeholderTextColor={colors.textMuted} autoCapitalize="none" keyboardType="email-address" />
                  {errors.inviteEmail ? <Text style={styles.fieldError}>{errors.inviteEmail}</Text> : null}
                </View>
              </View>

              <View style={{ marginTop: 20 }}>
                <Text style={styles.fieldLabel}>Relationship</Text>
                <View style={styles.chipsRow}>
                  {relationshipOptions.map((r) => {
                    const selected = selectedRelationships.includes(r);
                    return (
                      <Pressable key={r} style={[styles.relationshipChip, selected && styles.relationshipChipSelected]} onPress={() => toggleRelationship(r)}>
                        <Text style={[styles.chipText, selected && styles.relationshipChipTextSelected]}>{r}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {errors.relationships ? <Text style={styles.fieldError}>{errors.relationships}</Text> : null}
              </View>

              <View style={styles.addContactRow}>
                <Pressable style={[styles.addContactButton, addingContact && { opacity: 0.7 }]} onPress={handleAddContact} disabled={addingContact}>
                  <Text style={styles.addContactButtonText}>{addingContact ? "Adding..." : "Add contact"}</Text>
                </Pressable>
                {contactAdded ? <Text style={styles.contactAddedText}>Added! You can add another, or finish setup below.</Text> : null}
              </View>
            </View>
          ) : null}

          <View style={styles.footerRow}>
            <Pressable style={[styles.backButton, (step === 1 || saving) && styles.backButtonDisabled]} onPress={previousStep} disabled={step === 1 || saving}>
              <Text style={[styles.backButtonText, (step === 1 || saving) && styles.backButtonTextDisabled]}>Back</Text>
            </Pressable>

            <View style={{ flexDirection: "row", gap: 10 }}>
              {step === 3 ? (
                <Pressable style={styles.skipButton} onPress={skipInviteStep} disabled={saving}>
                  <Text style={styles.backButtonText}>Skip for now</Text>
                </Pressable>
              ) : null}
              {step < steps.length ? (
                <Pressable style={[styles.continueButton, saving && { opacity: 0.7 }]} onPress={nextStep} disabled={saving}>
                  <Text style={styles.continueButtonText}>Continue</Text>
                </Pressable>
              ) : (
                <Pressable style={[styles.finishButton, saving && { opacity: 0.7 }]} onPress={() => finishOnboarding(false)} disabled={saving}>
                  <Text style={styles.continueButtonText}>{saving ? "Building your profile..." : "Finish setup"}</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {saving ? (
        <View style={styles.savingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.coral} size="large" />
            <Text style={styles.loadingTitle}>We're building your profile</Text>
            <Text style={styles.loadingSubtitle}>Pulling everything together so your space feels personal from the start.</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: 16, paddingTop: 40, paddingBottom: 40 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, padding: 24 },
  loadingCard: { width: "100%", maxWidth: 420, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 28, alignItems: "center", ...shadow },
  loadingTitle: { fontSize: 20, fontWeight: "700", color: colors.textPrimary, marginTop: 18, textAlign: "center" },
  loadingSubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 10, textAlign: "center", lineHeight: 20 },
  savingOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(255,250,247,0.95)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: { borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 18, ...shadow },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: "#f5eee9", overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: colors.coral },
  stepsRow: { flexDirection: "row", gap: 12, marginTop: 18 },
  stepPill: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  stepCircle: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  stepCircleComplete: { backgroundColor: "#2f3b2d" },
  stepCircleActive: { backgroundColor: "#fff1ea", borderWidth: 2, borderColor: "#f6d8ca" },
  stepCircleInactive: { backgroundColor: "#f3efe9" },
  stepCircleText: { fontSize: 13, fontWeight: "700", color: colors.textMuted },
  stepLabel: { fontSize: 12, color: colors.textMuted, flexShrink: 1 },
  stepLabelActive: { color: colors.textPrimary, fontWeight: "600" },
  stepBadge: { alignSelf: "flex-start", backgroundColor: "#fff1ea", borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 5 },
  stepBadgeText: { fontSize: 11, fontWeight: "700", color: "#ea7451" },
  stepTitle: { fontSize: 26, fontWeight: "700", letterSpacing: -0.8, color: colors.textPrimary, marginTop: 14 },
  stepSubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 8, lineHeight: 20 },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 18, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, padding: 14 },
  avatarImage: { width: 52, height: 52, borderRadius: 26 },
  avatarRowTitle: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  avatarRowSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  fieldLabel: { fontSize: 14, fontWeight: "600", color: colors.textPrimary, marginBottom: 8 },
  fieldInput: { height: 50, borderRadius: radii.md, borderWidth: 1, borderColor: "#cbd0d8", backgroundColor: colors.card, paddingHorizontal: 14, fontSize: 14, color: colors.textPrimary },
  fieldInputPressable: { justifyContent: "center" },
  fieldInputError: { borderColor: "#fca5a5" },
  fieldError: { fontSize: 11, color: "#ef4444", marginTop: 6 },
  fieldRow: { flexDirection: "row", gap: 12, marginTop: 20 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  chip: { borderRadius: radii.pill, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  chipSelected: { backgroundColor: "#e3f5ea", borderColor: "#e3f5ea" },
  chipText: { fontSize: 13, fontWeight: "500", color: colors.textSecondary },
  chipTextSelected: { color: "#2f8a5f" },
  relationshipChip: { borderRadius: radii.pill, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  relationshipChipSelected: { backgroundColor: "#e3f5ea", borderColor: "#e3f5ea" },
  relationshipChipTextSelected: { color: "#2f8a5f" },
  helperText: { fontSize: 12, color: colors.textMuted, marginTop: 14, lineHeight: 18 },
  addContactRow: { marginTop: 20, gap: 10 },
  addContactButton: { alignSelf: "flex-start", height: 46, paddingHorizontal: 22, borderRadius: radii.pill, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center" },
  addContactButtonText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  contactAddedText: { fontSize: 13, fontWeight: "600", color: "#2f7a4d" },
  footerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 28, borderTopWidth: 1, borderTopColor: "#f1e4dc", paddingTop: 20 },
  backButton: { height: 46, minWidth: 100, paddingHorizontal: 18, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  backButtonDisabled: { backgroundColor: "#f1f5f9", borderColor: "#e2e8f0" },
  backButtonText: { fontSize: 14, fontWeight: "500", color: colors.textSecondary },
  backButtonTextDisabled: { color: colors.textMuted },
  skipButton: { height: 46, paddingHorizontal: 18, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  continueButton: { height: 46, minWidth: 120, paddingHorizontal: 22, borderRadius: radii.pill, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center" },
  finishButton: { height: 46, minWidth: 150, paddingHorizontal: 22, borderRadius: radii.pill, backgroundColor: "#2f3b2d", alignItems: "center", justifyContent: "center" },
  continueButtonText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
