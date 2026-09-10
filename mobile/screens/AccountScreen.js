import { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, Pressable, Image, ScrollView, TextInput, Switch, Alert, ActivityIndicator, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import Text from "../components/Text";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { AVATAR_PALETTE, resolveAvatarColor } from "../lib/avatarColor";
import { colors, radii, spacing, shadow } from "../lib/theme";

// Mirrors app/account/AccountPageClient.jsx. Built against the real
// web markup and logic - same profiles.upsert shape, same auth
// metadata sync, same Storage upload path (avatars bucket,
// {userId}/avatar.{ext}), so an avatar/name/bio saved here is
// genuinely identical data to what web writes, not a parallel
// mobile-only shape.
//
// Explicitly deferred, not silently dropped:
// - Delete account (calls web's /api/account/delete Next.js route
//   handler - reachable via fetch from mobile too since it's just an
//   HTTPS endpoint, so this one actually IS ported, not deferred;
//   noting it here because it's easy to assume otherwise)
// - Nothing else in this screen was cut - it's genuinely the full
//   feature set, not a simplified version.

function splitName(fullName = "") {
  const trimmed = fullName.trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const parts = trimmed.split(/\s+/);
  return { firstName: parts[0] || "", lastName: parts.slice(1).join(" ") };
}

function buildFullName(firstName = "", lastName = "") {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
}

function getInitials(fullName = "", email = "") {
  const source = fullName.trim() || email.trim();
  if (!source) return "U";
  const parts = source.split(/\s+|@|[._-]/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join("") || "U";
}

function formatMemberSince(createdAt) {
  if (!createdAt) return "Member";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Member";
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(date);
}

export default function AccountScreen({ onClose }) {
  const { user } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const [email, setEmail] = useState("");
  const [memberSince, setMemberSince] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarColor, setAvatarColor] = useState("");
  const [savingColor, setSavingColor] = useState(false);

  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", birthday: "", bio: "", marketingOptIn: false });
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);

  const resolvedName = useMemo(() => buildFullName(form.firstName, form.lastName), [form.firstName, form.lastName]);
  const initials = useMemo(() => getInitials(resolvedName, email), [resolvedName, email]);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser || !active) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, avatar_color, birthday, phone, bio, marketing_opt_in")
        .eq("id", authUser.id)
        .maybeSingle();
      if (!active) return;
      const nameParts = splitName(profile?.full_name || authUser.user_metadata?.full_name || "");
      setEmail(authUser.email || "");
      setMemberSince(formatMemberSince(authUser.created_at));
      setAvatarUrl(profile?.avatar_url || authUser.user_metadata?.avatar_url || "");
      setAvatarColor(profile?.avatar_color || "");
      setForm({
        firstName: nameParts.firstName,
        lastName: nameParts.lastName,
        phone: profile?.phone || "",
        birthday: profile?.birthday || "",
        bio: profile?.bio || "",
        marketingOptIn: !!profile?.marketing_opt_in,
      });
      setLoaded(true);
    }
    load();
    return () => { active = false; };
  }, []);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (message) setMessage("");
  }

  async function handleChoosePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMessageType("error");
      setMessage("Photo library access is needed to upload a photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (result.canceled || !result.assets?.[0]?.uri) return;

    const asset = result.assets[0];
    setUploadingPhoto(true);
    setMessage("");
    try {
      const extension = (asset.uri.split(".").pop() || "jpg").toLowerCase();
      const filePath = `${user.id}/avatar.${extension}`;
      // Local file URI -> blob, uploaded to the same 'avatars' Storage
      // bucket web uses, at the same {userId}/avatar.{ext} path -
      // genuinely the same file location, not a mobile-specific copy.
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, blob, {
        cacheControl: "3600",
        upsert: true,
        contentType: blob.type || "image/jpeg",
      });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          avatar_url: publicUrl,
          full_name: resolvedName || null,
          birthday: form.birthday || null,
          phone: form.phone.trim() || null,
          bio: form.bio.trim() || null,
          marketing_opt_in: !!form.marketingOptIn,
        },
        { onConflict: "id" }
      );
      if (profileError) throw profileError;

      await supabase.auth.updateUser({ data: { avatar_url: publicUrl, full_name: resolvedName || null } });

      setAvatarUrl(publicUrl);
      setMessageType("success");
      setMessage("Profile photo updated.");
    } catch (error) {
      console.error("Photo upload error:", error);
      setMessageType("error");
      setMessage(error?.message ? `We couldn't upload that photo right now: ${error.message}` : "We couldn't upload that photo right now.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleRemovePhoto() {
    if (!user?.id || uploadingPhoto) return;
    setUploadingPhoto(true);
    setMessage("");
    try {
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          avatar_url: null,
          full_name: resolvedName || null,
          birthday: form.birthday || null,
          phone: form.phone.trim() || null,
          bio: form.bio.trim() || null,
          marketing_opt_in: !!form.marketingOptIn,
        },
        { onConflict: "id" }
      );
      if (profileError) throw profileError;
      await supabase.auth.updateUser({ data: { avatar_url: null, full_name: resolvedName || null } });
      setAvatarUrl("");
      setMessageType("success");
      setMessage("Profile photo removed.");
    } catch (error) {
      console.error("Remove photo error:", error);
      setMessageType("error");
      setMessage("We couldn't remove that photo right now.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleColorChange(key) {
    if (!user?.id || savingColor || key === avatarColor) return;
    setSavingColor(true);
    const previous = avatarColor;
    setAvatarColor(key);
    const { error } = await supabase.from("profiles").update({ avatar_color: key }).eq("id", user.id);
    if (error) {
      console.error("Avatar color update error:", error.message);
      setAvatarColor(previous);
      setMessageType("error");
      setMessage("We couldn't save that color right now.");
    }
    setSavingColor(false);
  }

  async function handleSave() {
    if (!user?.id) return;
    setSaving(true);
    setMessage("");
    try {
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          full_name: resolvedName || null,
          avatar_url: avatarUrl || null,
          birthday: form.birthday || null,
          phone: form.phone.trim() || null,
          bio: form.bio.trim() || null,
          marketing_opt_in: !!form.marketingOptIn,
        },
        { onConflict: "id" }
      );
      if (profileError) throw profileError;
      await supabase.auth.updateUser({ data: { full_name: resolvedName || null, avatar_url: avatarUrl || null } });
      setMessageType("success");
      setMessage("Your account details have been saved.");
    } catch (error) {
      console.error("Account save error:", error);
      setMessageType("error");
      setMessage("We couldn't save your changes right now.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    if (saving || uploadingPhoto || signingOut || deletingAccount) return;
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setMessageType("error");
      setMessage("We couldn't sign you out right now.");
      setSigningOut(false);
    }
    // On success, AuthContext's own session listener handles the
    // sign-in-screen switch - no manual navigation needed here.
  }

  function handleDeleteAccount() {
    if (saving || uploadingPhoto || signingOut || deletingAccount) return;
    Alert.alert("Delete your account?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeletingAccount(true);
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch("https://hintdrop.app/api/account/delete", {
              method: "POST",
              headers: { Authorization: `Bearer ${session?.access_token}` },
            });
            if (!response.ok) throw new Error("Delete failed");
            await supabase.auth.signOut();
          } catch (error) {
            console.error("Delete account error:", error);
            setMessageType("error");
            setMessage("We couldn't delete your account right now.");
            setDeletingAccount(false);
          }
        },
      },
    ]);
  }

  const disabled = saving || uploadingPhoto || signingOut || deletingAccount;
  const c = resolveAvatarColor({ avatarColor, id: user?.id });

  if (!loaded) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.coral} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.headerBack} hitSlop={8}>
          <Text style={styles.headerBackText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Account</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarImage, { alignItems: "center", justifyContent: "center", backgroundColor: c.to }]}>
                <Text style={{ color: "#fff", fontSize: 28, fontWeight: "700" }}>{initials}</Text>
              </View>
            )}
          </View>
          <Pressable style={styles.uploadButton} onPress={handleChoosePhoto} disabled={disabled}>
            <Text style={styles.uploadButtonText}>{uploadingPhoto ? "Uploading..." : "Upload photo"}</Text>
          </Pressable>
          <Pressable style={styles.removeButton} onPress={handleRemovePhoto} disabled={disabled}>
            <Text style={styles.removeButtonText}>Remove</Text>
          </Pressable>

          {!avatarUrl ? (
            <View style={{ marginTop: 20, width: "100%", alignItems: "center" }}>
              <Text style={styles.colorLabel}>AVATAR COLOR</Text>
              <View style={styles.colorSwatchRow}>
                {Object.entries(AVATAR_PALETTE).map(([key, palette]) => (
                  <Pressable
                    key={key}
                    onPress={() => handleColorChange(key)}
                    disabled={savingColor}
                    style={[styles.colorSwatch, { backgroundColor: palette.to }, avatarColor === key && styles.colorSwatchActive]}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.memberBox}>
            <Text style={styles.memberBoxLabel}>ACCOUNT</Text>
            <Text style={styles.memberBoxLine}>{memberSince ? `Member since ${memberSince}` : "Member"}</Text>
            <Text style={styles.memberBoxEmail}>{email}</Text>
          </View>
        </View>

        <View style={styles.formSection}>
          <View style={styles.fieldRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>First name</Text>
              <TextInput style={styles.fieldInput} value={form.firstName} onChangeText={(v) => updateField("firstName", v)} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Last name</Text>
              <TextInput style={styles.fieldInput} value={form.lastName} onChangeText={(v) => updateField("lastName", v)} />
            </View>
          </View>

          <View style={{ marginTop: 16 }}>
            <Text style={styles.fieldLabel}>Email address</Text>
            <TextInput style={[styles.fieldInput, styles.fieldInputReadOnly]} value={email} editable={false} />
            <Text style={styles.fieldHint}>Email is managed by your sign-in account.</Text>
          </View>

          <View style={styles.fieldRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Phone number</Text>
              <TextInput style={styles.fieldInput} value={form.phone} onChangeText={(v) => updateField("phone", v)} placeholder="+44 7..." placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Your birthday</Text>
              <Pressable style={[styles.fieldInput, { justifyContent: "center" }]} onPress={() => setShowBirthdayPicker(true)}>
                <Text style={{ fontSize: 14, color: form.birthday ? colors.textPrimary : colors.textMuted }}>
                  {form.birthday ? new Date(form.birthday + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Select date"}
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
            </View>
          </View>

          <View style={{ marginTop: 16 }}>
            <Text style={styles.fieldLabel}>Short note</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldTextarea]}
              value={form.bio}
              onChangeText={(v) => updateField("bio", v)}
              placeholder="Add a few words that help friends recognise you."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.optInBox}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
              <Switch value={form.marketingOptIn} onValueChange={(v) => updateField("marketingOptIn", v)} trackColor={{ true: colors.coral }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.optInTitle}>Email me occasional updates and thoughtful ideas</Text>
                <Text style={styles.optInSubtitle}>You can unsubscribe at any time.</Text>
              </View>
            </View>
          </View>

          <View style={styles.sessionBox}>
            <Text style={styles.colorLabel}>SESSION</Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <Pressable style={styles.logOutButton} onPress={handleSignOut} disabled={disabled}>
                <Text style={styles.logOutButtonText}>{signingOut ? "Signing out..." : "Log out"}</Text>
              </Pressable>
              <Pressable style={styles.deleteButton} onPress={handleDeleteAccount} disabled={disabled}>
                <Text style={styles.deleteButtonText}>{deletingAccount ? "Deleting..." : "Delete account"}</Text>
              </Pressable>
            </View>
            <Text style={styles.sessionHint}>Logging out only ends this session. Deleting your account permanently removes your access and profile data.</Text>
          </View>

          {message ? (
            <View style={[styles.messageBox, messageType === "error" ? styles.messageBoxError : styles.messageBoxSuccess]}>
              <Text style={messageType === "error" ? styles.messageTextError : styles.messageTextSuccess}>{message}</Text>
            </View>
          ) : null}

          <Pressable style={[styles.saveButton, disabled && styles.saveButtonDisabled]} onPress={handleSave} disabled={disabled}>
            <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save changes"}</Text>
          </Pressable>
        </View>
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
  avatarSection: { alignItems: "center", backgroundColor: colors.card, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, padding: 20, ...shadow, shadowOpacity: 0.04 },
  avatarWrap: { marginBottom: 4 },
  avatarImage: { width: 96, height: 96, borderRadius: 48, borderWidth: 4, borderColor: "#fff4ee" },
  uploadButton: { marginTop: 16, height: 44, paddingHorizontal: 20, borderRadius: radii.pill, backgroundColor: "#2f3b2d", alignItems: "center", justifyContent: "center" },
  uploadButtonText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  removeButton: { marginTop: 12, height: 40, paddingHorizontal: 18, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  removeButtonText: { fontSize: 13, fontWeight: "500", color: colors.textSecondary },
  colorLabel: { fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.8, textAlign: "center" },
  colorSwatchRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 8 },
  colorSwatch: { width: 32, height: 32, borderRadius: 16 },
  colorSwatchActive: { borderWidth: 2, borderColor: "#2f3b2d" },
  memberBox: { marginTop: 20, width: "100%", backgroundColor: "#fff7f2", borderRadius: radii.lg, padding: 14 },
  memberBoxLabel: { fontSize: 11, fontWeight: "700", color: "#c97a5d", letterSpacing: 0.8 },
  memberBoxLine: { fontSize: 13, color: colors.textPrimary, marginTop: 6 },
  memberBoxEmail: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  formSection: { marginTop: 20, backgroundColor: colors.card, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, padding: 18, ...shadow, shadowOpacity: 0.04 },
  fieldRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.textPrimary, marginBottom: 6 },
  fieldInput: { height: 48, borderRadius: radii.md, borderWidth: 1, borderColor: "#cbd0d8", backgroundColor: colors.card, paddingHorizontal: 14, fontSize: 14, color: colors.textPrimary },
  fieldInputReadOnly: { backgroundColor: "#f8fafc", borderColor: "#e2e8f0", color: colors.textMuted },
  fieldTextarea: { height: 96, paddingTop: 12, textAlignVertical: "top" },
  fieldHint: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
  optInBox: { marginTop: 20, borderRadius: radii.lg, borderWidth: 1, borderColor: "#f1dfd6", backgroundColor: "#fff8f4", padding: 14 },
  optInTitle: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  optInSubtitle: { fontSize: 11, color: colors.textMuted, marginTop: 4, lineHeight: 16 },
  sessionBox: { marginTop: 16, borderRadius: radii.lg, borderWidth: 1, borderColor: "#f1dfd6", backgroundColor: "#fff8f4", padding: 14 },
  logOutButton: { flex: 1, height: 44, borderRadius: radii.pill, borderWidth: 1, borderColor: "#cbd0d8", backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  logOutButtonText: { fontSize: 13, fontWeight: "500", color: colors.textSecondary },
  deleteButton: { flex: 1, height: 44, borderRadius: radii.pill, borderWidth: 1, borderColor: "#fecaca", backgroundColor: "#fef2f2", alignItems: "center", justifyContent: "center" },
  deleteButtonText: { fontSize: 13, fontWeight: "500", color: "#b91c1c" },
  sessionHint: { fontSize: 11, color: colors.textMuted, marginTop: 10, lineHeight: 16 },
  messageBox: { marginTop: 16, borderRadius: radii.md, padding: 12, borderWidth: 1 },
  messageBoxSuccess: { backgroundColor: "#fff7f2", borderColor: "#f3d8cc" },
  messageBoxError: { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
  messageTextSuccess: { fontSize: 13, color: colors.textSecondary },
  messageTextError: { fontSize: 13, color: "#b91c1c" },
  saveButton: { marginTop: 20, height: 50, borderRadius: radii.pill, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center", ...shadow },
  saveButtonDisabled: { backgroundColor: "#e9a48d" },
  saveButtonText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
