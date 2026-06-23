"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
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
  const fileInputRef = useRef(null);

  const [profileLoaded, setProfileLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
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
          .select("full_name, avatar_url, birthday, phone, bio")
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

        const savedAvatar =
          profile?.avatar_url ||
          metadataAvatar ||
          "";

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
      setMessage("We couldn't upload that photo right now.");
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
    
