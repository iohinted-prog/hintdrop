"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

function splitName(fullName = "") {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { firstName: "", lastName: "" };
  }

  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
}

function buildFullName(firstName = "", lastName = "", displayName = "") {
  const combined = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
  return combined || displayName.trim();
}

function getMetadataName(metadata = {}) {
  return (
    metadata.full_name ||
    metadata.name ||
    [metadata.given_name, metadata.family_name].filter(Boolean).join(" ") ||
    ""
  ).trim();
}

function getMetadataAvatar(metadata = {}) {
  return metadata.avatar_url || metadata.picture || "";
}

function getInitials(fullName = "", email = "") {
  const source = fullName.trim() || email.trim();

  if (!source) {
    return "U";
  }

  const parts = source.split(/\s+|@|[._-]/).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U"
  );
}

function formatMemberSince(createdAt) {
  if (!createdAt) {
    return "Member";
  }

  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return "Member";
  }

  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function AccountPageClient() {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [profileLoaded, setProfileLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [memberSince, setMemberSince] = useState("");

  const [avatarUrl, setAvatarUrl] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    displayName: "",
    phone: "",
    birthday: "",
    bio: "",
    marketingOptIn: false,
  });

  const resolvedName = useMemo(
    () => buildFullName(form.firstName, form.lastName, form.displayName),
    [form.firstName, form.lastName, form.displayName]
  );

  const initials = useMemo(() => getInitials(resolvedName, email), [resolvedName, email]);

  useEffect(() => {
    let isActive = true;

    async function loadAccount() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw userError || new Error("No authenticated user found.");
        }

        const metadata = user.user_metadata || {};
        const metadataName = getMetadataName(metadata);
        const metadataAvatar = getMetadataAvatar(metadata);

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, birthday, phone, bio, marketing_opt_in")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Error loading profile:", profileError.message);
        }

        if (!isActive) {
          return;
        }

        const savedFullName = profile?.full_name || metadataName || "";
        const nameParts = splitName(savedFullName);

        const savedAvatar = profile?.avatar_url || metadataAvatar || "";

        setUserId(user.id);
        setEmail(user.email || "");
        setMemberSince(formatMemberSince(user.created_at));
        setAvatarUrl(savedAvatar);
        setPhotoPreview(savedAvatar);
        setForm({
          firstName: nameParts.firstName,
          lastName: nameParts.lastName,
          displayName: savedFullName,
          phone: profile?.phone || "",
          birthday: profile?.birthday || "",
          bio: profile?.bio || "",
          marketingOptIn: !!profile?.marketing_opt_in,
        });
      } catch (error) {
        console.error("Account load error:", error);
        if (isActive) {
          setMessageType("error");
          setMessage("We couldn't load your account right now.");
        }
      } finally {
        if (isActive) {
          setProfileLoaded(true);
        }
      }
    }

    loadAccount();

    return () => {
      isActive = false;
    };
  }, [supabase]);

  function updateField(key, value) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

    if (message) {
      setMessage("");
    }
  }

  function handleChoosePhoto() {
    fileInputRef.current?.click();
  }

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0];

    if (!file || !userId) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessageType("error");
      setMessage("Please choose an image file.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessageType("error");
      setMessage("Please choose an image under 5MB.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPhotoPreview(localPreview);
    setUploadingPhoto(true);
    setMessage("");

    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${userId}/avatar.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: userId,
          avatar_url: publicUrl,
          full_name: resolvedName || null,
          birthday: form.birthday || null,
          phone: form.phone.trim() || null,
          bio: form.bio.trim() || null,
          marketing_opt_in: !!form.marketingOptIn,
        },
        { onConflict: "id" }
      );

      if (profileError) {
        throw profileError;
      }

      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: {
          avatar_url: publicUrl,
          full_name: resolvedName || null,
        },
      });

      if (authUpdateError) {
        console.error("Auth metadata update error:", authUpdateError.message);
      }

      setAvatarUrl(publicUrl);
      setPhotoPreview(publicUrl);
      setMessageType("success");
      setMessage("Profile photo updated.");
    } catch (error) {
      console.error("Photo upload error:", error);
      setPhotoPreview(avatarUrl || "");
      setMessageType("error");
      setMessage(
        error?.message
          ? `We couldn't upload that photo right now: ${error.message}`
          : "We couldn't upload that photo right now."
      );
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      URL.revokeObjectURL(localPreview);
    }
  }

  async function handleRemovePhoto() {
    if (!userId || uploadingPhoto) {
      return;
    }

    setUploadingPhoto(true);
    setMessage("");

    try {
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: userId,
          avatar_url: null,
          full_name: resolvedName || null,
          birthday: form.birthday || null,
          phone: form.phone.trim() || null,
          bio: form.bio.trim() || null,
          marketing_opt_in: !!form.marketingOptIn,
        },
        { onConflict: "id" }
      );

      if (profileError) {
        throw profileError;
      }

      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: {
          avatar_url: null,
          full_name: resolvedName || null,
        },
      });

      if (authUpdateError) {
        console.error("Auth metadata update error:", authUpdateError.message);
      }

      setAvatarUrl("");
      setPhotoPreview("");
      setMessageType("success");
      setMessage("Profile photo removed.");
    } catch (error) {
      console.error("Remove photo error:", error);
      setMessageType("error");
      setMessage("We couldn't remove that photo right now.");
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!userId) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const fullName = resolvedName;

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: userId,
          full_name: fullName || null,
          avatar_url: avatarUrl || null,
          birthday: form.birthday || null,
          phone: form.phone.trim() || null,
          bio: form.bio.trim() || null,
          marketing_opt_in: !!form.marketingOptIn,
        },
        { onConflict: "id" }
      );

      if (profileError) {
        throw profileError;
      }

      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName || null,
          avatar_url: avatarUrl || null,
        },
      });

      if (authUpdateError) {
        console.error("Auth metadata update error:", authUpdateError.message);
      }

      setForm((prev) => ({
        ...prev,
        displayName: fullName,
      }));

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
    if (saving || uploadingPhoto || signingOut || deletingAccount) {
      return;
    }

    setSigningOut(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });

      if (error) {
        throw error;
      }

      window.location.href = "/";
    } catch (error) {
      console.error("Sign out error:", error);
      setMessageType("error");
      setMessage("We couldn't sign you out right now.");
      setSigningOut(false);
    }
  }

  async function handleDeleteAccount() {
    if (saving || uploadingPhoto || signingOut || deletingAccount) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setDeletingAccount(true);
    setMessage("");

    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "We couldn't delete your account right now.");
      }

      await supabase.auth.signOut({ scope: "local" });
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Delete account error:", error);
      setMessageType("error");
      setMessage(
        error?.message || "We couldn't delete your account right now."
      );
      setDeletingAccount(false);
    }
  }

  if (!profileLoaded) {
    return (
      <main className="min-h-screen bg-[#fffaf7] text-slate-800">
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-md rounded-[30px] border border-[#efd8ce] bg-white p-8 text-center shadow-[0_25px_80px_rgba(173,101,72,0.14)]">
            <div className="mx-auto h-14 w-14 rounded-full bg-[#fff1ea] p-3">
              <div className="h-full w-full animate-spin rounded-full border-2 border-[#f6d8ca] border-t-[#f36f64]" />
            </div>

            <h1 className="mt-6 text-[28px] font-semibold tracking-[-0.04em] text-slate-900">
              We’re getting your account ready
            </h1>

            <p className="mt-3 text-[15px] leading-7 text-slate-600">
              Pulling in your profile details so everything is ready to update.
            </p>

            <div className="mt-6 rounded-full bg-[#f5eee9] p-1">
              <div className="h-2 w-2/3 animate-pulse rounded-full bg-gradient-to-r from-[#ff946d] to-[#f36f64]" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fffaf7] px-5 py-8 text-slate-800 md:px-8">
      <div className="mx-auto max-w-[920px]">
        <div className="mb-6">
          <Link
            href="/feed"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-[#ead8ce] bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-[#faf6f3]"
          >
            <span aria-hidden="true">←</span>
            <span>Back to feed</span>
          </Link>
        </div>

        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#df7b59]">
            account
          </p>
          <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.05em] text-slate-900">
            Personal details
          </h1>
          <p className="mt-3 max-w-[620px] text-[15px] leading-7 text-slate-600">
            Keep your profile up to date so your circles know they have the right
            person, details, and photo when planning something thoughtful.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-[28px] border border-[#eddacf] bg-white p-5 shadow-sm">
            <h2 className="text-[18px] font-semibold text-slate-900">Profile photo</h2>

            <div className="mt-5 flex flex-col items-center">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-[#efcdbf] to-[#bb8168] text-2xl font-bold text-white ring-4 ring-[#fff4ee]">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Profile preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handlePhotoChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={handleChoosePhoto}
                disabled={uploadingPhoto || signingOut || deletingAccount}
                className={`mt-4 inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-white ${
                  uploadingPhoto || signingOut || deletingAccount
                    ? "cursor-not-allowed bg-[#7c8b79]"
                    : "bg-[#2f3b2d] hover:bg-[#253120]"
                }`}
              >
                {uploadingPhoto ? "Uploading..." : "Upload photo"}
              </button>

              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={uploadingPhoto || signingOut || deletingAccount}
                className="mt-3 inline-flex h-10 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-4 text-sm font-medium text-slate-700 hover:bg-[#fff5f0] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Remove
              </button>
            </div>

            <div className="mt-6 rounded-[22px] bg-[#fff7f2] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#c97a5d]">
                Account
              </p>
              <p className="mt-2 text-sm text-slate-700">
                {memberSince ? `Member since ${memberSince}` : "Member"}
              </p>
              <p className="mt-1 break-all text-sm text-slate-500">{email}</p>
            </div>
          </aside>

          <section className="rounded-[28px] border border-[#eddacf] bg-white p-6 shadow-sm">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-900" htmlFor="firstName">
                    First name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={form.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    className="mt-2 h-[54px] w-full rounded-[18px] border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#f36f64]/50 focus:ring-4 focus:ring-[#f36f64]/10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900" htmlFor="lastName">
                    Last name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={form.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                    className="mt-2 h-[54px] w-full rounded-[18px] border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#f36f64]/50 focus:ring-4 focus:ring-[#f36f64]/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900" htmlFor="displayName">
                  Display name
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={form.displayName}
                  onChange={(e) => updateField("displayName", e.target.value)}
                  className="mt-2 h-[54px] w-full rounded-[18px] border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#f36f64]/50 focus:ring-4 focus:ring-[#f36f64]/10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900" htmlFor="email">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  readOnly
                  className="mt-2 h-[54px] w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-500 outline-none"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Email is managed by your sign-in account.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-900" htmlFor="phone">
                    Phone number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="+44 7..."
                    className="mt-2 h-[54px] w-full rounded-[18px] border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#f36f64]/50 focus:ring-4 focus:ring-[#f36f64]/10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900" htmlFor="birthday">
                    Your birthday
                  </label>
                  <input
                    id="birthday"
                    type="date"
                    value={form.birthday}
                    onChange={(e) => updateField("birthday", e.target.value)}
                    className="mt-2 h-[54px] w-full rounded-[18px] border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#f36f64]/50 focus:ring-4 focus:ring-[#f36f64]/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900" htmlFor="bio">
                  Short note
                </label>
                <textarea
                  id="bio"
                  rows={4}
                  value={form.bio}
                  onChange={(e) => updateField("bio", e.target.value)}
                  placeholder="Add a few words that help friends recognise you."
                  className="mt-2 w-full rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#f36f64]/50 focus:ring-4 focus:ring-[#f36f64]/10"
                />
              </div>

              <div className="rounded-[22px] border border-[#f1dfd6] bg-[#fff8f4] p-4">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={form.marketingOptIn}
                    onChange={(e) => updateField("marketingOptIn", e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-[#f36f64] focus:ring-[#f36f64]/30"
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-900">
                      Email me occasional updates and thoughtful ideas
                    </span>
                    <span className="mt-1 block text-xs leading-6 text-slate-500">
                      You can unsubscribe at any time.
                    </span>
                  </span>
                </label>
              </div>

              <div className="rounded-[22px] border border-[#f1dfd6] bg-[#fff8f4] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#c97a5d]">
                  Session
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={saving || uploadingPhoto || signingOut || deletingAccount}
                    className="inline-flex h-[48px] items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-[#faf6f3] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {signingOut ? "Signing out..." : "Log out"}
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={saving || uploadingPhoto || signingOut || deletingAccount}
                    className="inline-flex h-[48px] items-center justify-center rounded-full border border-red-200 bg-red-50 px-5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingAccount ? "Deleting account..." : "Delete account"}
                  </button>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Logging out only ends this session. Deleting your account permanently removes your access and profile data.
                </p>
              </div>

              {message ? (
                <div
                  className={`rounded-[18px] border px-4 py-3 text-sm ${
                    messageType === "error"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-[#f3d8cc] bg-[#fff7f2] text-slate-700"
                  }`}
                >
                  {message}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving || uploadingPhoto || signingOut || deletingAccount}
                  className={`inline-flex h-[52px] items-center justify-center rounded-full px-6 text-sm font-semibold text-white shadow-lg ${
                    saving || uploadingPhoto || signingOut || deletingAccount
                      ? "cursor-not-allowed bg-[#e9a48d]"
                      : "bg-gradient-to-b from-[#ff946d] to-[#f36f64]"
                  }`}
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>

                <Link
                  href="/feed"
                  className="inline-flex h-[52px] items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-medium text-slate-700 hover:bg-[#faf6f3]"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
