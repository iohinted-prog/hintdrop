"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

const steps = [
  { id: 1, label: "Birthday" },
  { id: 2, label: "Interests" },
  { id: 3, label: "Your circle" },
];

const interestOptions = [
  "Home",
  "Food",
  "Beauty",
  "Tech",
  "Travel",
  "Wellness",
  "Books",
  "Fashion",
  "Experiences",
  "Music",
  "Gaming",
  "Other",
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

function StepPill({ active, complete, number, label }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition ${
          complete
            ? "bg-[#2f3b2d] text-white"
            : active
              ? "bg-[#fff1ea] text-[#ea7451] ring-2 ring-[#f6d8ca]"
              : "bg-[#f3efe9] text-slate-400"
        }`}
      >
        {complete ? "✓" : number}
      </div>

      <p
        className={`truncate text-sm font-medium ${
          active || complete ? "text-slate-900" : "text-slate-400"
        }`}
      >
        {label}
      </p>
    </div>
  );
}

function getGoogleName(metadata = {}) {
  return (
    metadata.full_name ||
    metadata.name ||
    [metadata.given_name, metadata.family_name].filter(Boolean).join(" ") ||
    ""
  ).trim();
}

function getGoogleAvatar(metadata = {}) {
  return metadata.avatar_url || metadata.picture || "";
}

function getPrimaryContactField(person, field) {
  const items = person?.[field];
  if (!Array.isArray(items) || items.length === 0) return "";
  return items[0]?.value || items[0]?.displayName || "";
}

function getStoredProviderLabel() {
  if (typeof window === "undefined") return "";

  try {
    const provider = window.sessionStorage.getItem("hinted_auth_provider") || "";

    if (provider === "google") return "Google";
    if (provider === "azure" || provider === "azuread") return "Microsoft";
    return "";
  } catch (_) {
    return "";
  }
}

function getProviderLabel(user) {
  const providers = Array.isArray(user?.app_metadata?.providers)
    ? user.app_metadata.providers
    : [];

  if (providers.includes("azure") || providers.includes("azuread")) {
    return "Microsoft";
  }

  if (providers.includes("google")) {
    return "Google";
  }

  const provider =
    user?.identities?.[0]?.provider ||
    user?.app_metadata?.provider ||
    "";

  if (provider === "azure" || provider === "azuread") return "Microsoft";
  if (provider === "google") return "Google";
  return "your account";
}

function getInitials(name = "", email = "") {
  const trimmedName = name.trim();

  if (trimmedName) {
    const parts = trimmedName.split(/\s+/).filter(Boolean);

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
  }

  const emailName = email.split("@")[0]?.trim() || "";

  if (emailName) {
    return emailName.slice(0, 2).toUpperCase();
  }

  return "U";
}

function AvatarFallback({ name = "", email = "", src = "", alt = "Profile" }) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = getInitials(name, email);
  const showImage = Boolean(src) && !imageFailed;

  if (showImage) {
    return (
      <img
        src={src}
        alt={alt}
        className="h-14 w-14 rounded-full object-cover"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={alt}
      className="flex h-14 w-14 items-center justify-center rounded-full bg-[#2f3b2d] text-sm font-semibold text-white"
    >
      {initials}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const hasRedirectedRef = useRef(false);

  const [step, setStep] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState(["Travel", "Food"]);
  const [selectedRelationships, setSelectedRelationships] = useState(["Friend"]);
  const [form, setForm] = useState({
    fullName: "",
    birthday: "",
    inviteName: "",
    inviteEmail: "",
    otherInterest: "",
  });
  const [errors, setErrors] = useState({});
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [providerLabel, setProviderLabel] = useState("your account");
  const [contactSearch, setContactSearch] = useState("");
  const [contactResults, setContactResults] = useState([]);
  const [searchingContacts, setSearchingContacts] = useState(false);
  const [contactsMessage, setContactsMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const progress = useMemo(() => `${(step / steps.length) * 100}%`, [step]);

  useEffect(() => {
    let isActive = true;

    async function loadUserProfile() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("Could not find logged-in user.");
        if (isActive) setProfileLoaded(true);
        return;
      }

      const metadata = user.user_metadata || {};
      const googleName = getGoogleName(metadata);
      const googleAvatar = getGoogleAvatar(metadata);

      if (isActive) {
        const storedProviderLabel = getStoredProviderLabel();
        setProviderLabel(storedProviderLabel || getProviderLabel(user));
      }

      const { data: existingProfile, error: profileError } = await supabase
        .from("profiles")
        .select(
          "full_name, avatar_url, birthday, interests, other_interest, onboarding_completed"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Error loading profile:", profileError.message);
      }

      if (existingProfile?.onboarding_completed === true && !hasRedirectedRef.current) {
        hasRedirectedRef.current = true;
        router.replace("/feed");
        return;
      }

      const existingName = existingProfile?.full_name || "";
      const existingAvatar = existingProfile?.avatar_url || "";
      const resolvedName = existingName || googleName || "";
      const resolvedAvatar = existingAvatar || googleAvatar || "";

      const filteredExistingInterests = Array.isArray(existingProfile?.interests)
        ? existingProfile.interests.filter((interest) => interestOptions.includes(interest))
        : [];

      const initialInterests =
        filteredExistingInterests.length >= 2
          ? filteredExistingInterests
          : ["Travel", "Food"];

      if (!isActive) return;

      setForm((prev) => ({
        ...prev,
        fullName: resolvedName,
        birthday: existingProfile?.birthday || "",
        otherInterest: existingProfile?.other_interest || "",
      }));

      setSelectedInterests(initialInterests);
      setAvatarUrl(resolvedAvatar);

      const { error: syncError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          full_name: resolvedName || null,
          avatar_url: existingAvatar || googleAvatar || null,
        },
        { onConflict: "id" }
      );

      if (syncError) {
        console.error("Error syncing Google profile:", syncError.message);
      }

      if (isActive) setProfileLoaded(true);
    }

    loadUserProfile();

    return () => {
      isActive = false;
    };
  }, [router, supabase]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function toggleInterest(interest) {
    const isRemovingOther =
      interest === "Other" && selectedInterests.includes("Other");

    setSelectedInterests((prev) => {
      const isSelected = prev.includes(interest);

      if (isSelected) {
        return prev.filter((item) => item !== interest);
      }

      return [...prev, interest];
    });

    if (isRemovingOther) {
      setForm((prev) => ({ ...prev, otherInterest: "" }));
    }

    setErrors((prev) => ({
      ...prev,
      interests: "",
      otherInterest: "",
    }));
  }

  function toggleRelationship(relationship) {
    setSelectedRelationships((prev) =>
      prev.includes(relationship)
        ? prev.filter((item) => item !== relationship)
        : [...prev, relationship]
    );

    setErrors((prev) => ({ ...prev, relationships: "" }));
  }

  function validateStep() {
    const nextErrors = {};

    if (step === 1) {
      if (!form.fullName.trim()) {
        nextErrors.fullName = "Please tell us what to call you.";
      }

      if (!form.birthday.trim()) {
        nextErrors.birthday = "Please add your birthday.";
      }
    }

    if (step === 2) {
      if (selectedInterests.length < 2) {
        nextErrors.interests = "Pick at least 2 interests.";
      }

      if (selectedInterests.includes("Other") && !form.otherInterest.trim()) {
        nextErrors.otherInterest = "Tell us your other interest.";
      }
    }

    if (step === 3) {
      if (form.inviteEmail && !form.inviteName.trim()) {
        nextErrors.inviteName = "Add a name to match the email.";
      }

      if (form.inviteName && !form.inviteEmail.trim()) {
        nextErrors.inviteEmail = "Add an email to match the name.";
      }

      if ((form.inviteName.trim() || form.inviteEmail.trim()) && selectedRelationships.length === 0) {
        nextErrors.relationships = "Choose at least one relationship type.";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function saveProfile(values = {}) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Could not find logged-in user.");
      return { ok: false, user: null };
    }

    const payload = {
      id: user.id,
      full_name: form.fullName.trim() || null,
      avatar_url: avatarUrl || null,
      birthday: form.birthday || null,
      interests: selectedInterests,
      other_interest: selectedInterests.includes("Other")
        ? form.otherInterest.trim() || null
        : null,
      ...values,
    };

    const { error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      console.error("Error saving profile:", error.message);
      return { ok: false, user };
    }

    return { ok: true, user };
  }

  async function saveConnection(profileId) {
    const hasInviteName = form.inviteName.trim().length > 0;
    const hasInviteEmail = form.inviteEmail.trim().length > 0;

    if (!hasInviteName && !hasInviteEmail) return true;

    const payload = {
      profile_id: profileId,
      name: form.inviteName.trim() || "Unnamed contact",
      email: form.inviteEmail.trim() || null,
      relationship_types: selectedRelationships.map((item) =>
        item.toLowerCase().replace(/\s+/g, "_")
      ),
    };

    const { error } = await supabase.from("profile_connections").insert(payload);

    if (error) {
      console.error("Error saving connection:", error.message);
      return false;
    }

    return true;
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
      const result = await saveProfile({
        onboarding_completed: true,
      });

      if (!result.ok || !result.user) {
        setSaving(false);
        return;
      }

      if (!skippedInvite) {
        const connectionSaved = await saveConnection(result.user.id);
        if (!connectionSaved) {
          setSaving(false);
          return;
        }
      }

      router.push("/feed");
    } catch (error) {
      console.error("Error finishing onboarding:", error);
      setSaving(false);
    }
  }

  async function searchGoogleContacts(query) {
    setContactSearch(query);
    setContactsMessage("");

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
        setContactsMessage("Google contacts access is not available for this session.");
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
        setContactsMessage("We couldn’t access Google contacts right now.");
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
        console.error("Google contact search failed:", result);
        setContactResults([]);
        setContactsMessage("We couldn’t search Google contacts right now.");
        return;
      }

      const people = Array.isArray(result.results) ? result.results : [];
      const mapped = people
        .map((item) => item.person)
        .filter(Boolean)
        .map((person, index) => ({
          id: person.resourceName || String(index),
          name: getPrimaryContactField(person, "names"),
          email: getPrimaryContactField(person, "emailAddresses"),
        }))
        .filter((person) => person.name || person.email);

      setContactResults(mapped);

      if (mapped.length === 0) {
        setContactsMessage("No matching Google contacts found. You can still add someone manually.");
      }
    } catch (error) {
      console.error("Contact search error:", error);
      setContactResults([]);
      setContactsMessage("We couldn’t search Google contacts right now.");
    } finally {
      setSearchingContacts(false);
    }
  }

  function selectContact(contact) {
    setForm((prev) => ({
      ...prev,
      inviteName: contact.name || prev.inviteName,
      inviteEmail: contact.email || prev.inviteEmail,
    }));
    setContactSearch(contact.name || contact.email || "");
    setContactResults([]);
    setContactsMessage("");
    setErrors((prev) => ({
      ...prev,
      inviteName: "",
      inviteEmail: "",
    }));
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
              We’re getting your profile ready
            </h1>

            <p className="mt-3 text-[15px] leading-7 text-slate-600">
              Pulling everything together so your space feels personal from the start.
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
    <>
      <main className="min-h-screen bg-[#fffaf7] text-slate-800">
        <div className="mx-auto max-w-[860px] px-5 py-8 md:px-8 md:py-12">
          <div className="mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800"
            >
              <span>←</span>
              <span>Back</span>
            </Link>
          </div>

          <section className="rounded-[34px] border border-[#efd8ce] bg-white p-5 shadow-[0_25px_80px_rgba(173,101,72,0.12)] sm:p-7 md:p-8">
            <div className="rounded-full bg-[#f5eee9] p-1">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-[#ff946d] to-[#f36f64] transition-all duration-300"
                style={{ width: progress }}
              />
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {steps.map((item) => (
                <StepPill
                  key={item.id}
                  number={item.id}
                  label={item.label}
                  active={step === item.id}
                  complete={step > item.id}
                />
              ))}
            </div>

            {step === 1 && (
              <div className="mt-8 max-w-[620px]">
                <div className="inline-flex rounded-full bg-[#fff1ea] px-3 py-1 text-xs font-semibold text-[#ea7451]">
                  Step 1 of 3
                </div>

                <h1 className="mt-4 text-[34px] font-semibold tracking-[-0.05em] text-slate-900 sm:text-[42px]">
                  Tell us a bit about you.
                </h1>

                <p className="mt-3 text-[15px] leading-7 text-slate-600">
                  We’ve pulled in what we can from Google, but you can change your name anytime here.
                </p>

                {(avatarUrl || form.fullName) ? (
                  <div className="mt-6 flex items-center gap-4 rounded-[22px] border border-[#f1e4dc] bg-[#fffaf7] p-4">
                    <AvatarFallback
                      src={avatarUrl}
                      name={form.fullName}
                      email=""
                      alt={form.fullName ? `${form.fullName}'s profile` : "Profile"}
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        Signed in with {providerLabel}
                      </p>
                      <p className="text-sm text-slate-500">
                        We’ll use this profile photo on your account when available.
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="mt-7">
                  <label htmlFor="fullName" className="block text-sm font-medium text-slate-900">
                    What should you be called?
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={form.fullName}
                    onChange={(e) => updateField("fullName", e.target.value)}
                    placeholder="Your name"
                    className={`mt-2 h-[56px] w-full rounded-[18px] border bg-white px-4 text-sm text-slate-900 outline-none transition focus:ring-4 ${
                      errors.fullName
                        ? "border-red-300 focus:border-red-300 focus:ring-red-100"
                        : "border-slate-300 focus:border-[#f36f64]/50 focus:ring-[#f36f64]/10"
                    }`}
                  />
                  {errors.fullName ? (
                    <p className="mt-2 text-xs text-red-500">{errors.fullName}</p>
                  ) : null}
                </div>

                <div className="mt-7">
                  <label htmlFor="birthday" className="block text-sm font-medium text-slate-900">
                    Birthday
                  </label>
                  <input
                    id="birthday"
                    type="date"
                    value={form.birthday}
                    onChange={(e) => updateField("birthday", e.target.value)}
                    className={`mt-2 h-[56px] w-full rounded-[18px] border bg-white px-4 text-sm text-slate-900 outline-none transition focus:ring-4 ${
                      errors.birthday
                        ? "border-red-300 focus:border-red-300 focus:ring-red-100"
                        : "border-slate-300 focus:border-[#f36f64]/50 focus:ring-[#f36f64]/10"
                    }`}
                  />
                  {errors.birthday ? (
                    <p className="mt-2 text-xs text-red-500">{errors.birthday}</p>
                  ) : null}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="mt-8 max-w-[760px]">
                <div className="inline-flex rounded-full bg-[#fff1ea] px-3 py-1 text-xs font-semibold text-[#ea7451]">
                  Step 2 of 3
                </div>

                <h1 className="mt-4 text-[34px] font-semibold tracking-[-0.05em] text-slate-900 sm:text-[42px]">
                  What kinds of things are you into?
                </h1>

                <p className="mt-3 text-[15px] leading-7 text-slate-600">
                  Pick at least 2 interests so we can improve your experience.
                </p>

                <div className="mt-7 flex flex-wrap gap-2.5">
                  {interestOptions.map((interest) => {
                    const selected = selectedInterests.includes(interest);

                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`rounded-full px-4 py-2.5 text-sm font-medium transition ${
                          selected
                            ? "bg-[#2f3b2d] text-white"
                            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {interest}
                      </button>
                    );
                  })}
                </div>

                {selectedInterests.includes("Other") ? (
                  <div className="mt-6 max-w-[420px]">
                    <label
                      htmlFor="otherInterest"
                      className="block text-sm font-medium text-slate-900"
                    >
                      Tell us another interest
                    </label>
                    <input
                      id="otherInterest"
                      type="text"
                      value={form.otherInterest}
                      onChange={(e) => updateField("otherInterest", e.target.value)}
                      placeholder="Crafts, collecting, pets..."
                      className={`mt-2 h-[56px] w-full rounded-[18px] border bg-white px-4 text-sm text-slate-900 outline-none transition focus:ring-4 ${
                        errors.otherInterest
                          ? "border-red-300 focus:border-red-300 focus:ring-red-100"
                          : "border-slate-300 focus:border-[#f36f64]/50 focus:ring-[#f36f64]/10"
                      }`}
                    />
                    {errors.otherInterest ? (
                      <p className="mt-2 text-xs text-red-500">{errors.otherInterest}</p>
                    ) : null}
                  </div>
                ) : null}

                {errors.interests ? (
                  <p className="mt-4 text-xs text-red-500">{errors.interests}</p>
                ) : (
                  <p className="mt-4 text-xs leading-5 text-slate-500">
                    Choose at least 2 to continue.
                  </p>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="mt-8 max-w-[760px]">
                <div className="inline-flex rounded-full bg-[#fff1ea] px-3 py-1 text-xs font-semibold text-[#ea7451]">
                  Step 3 of 3
                </div>

                <h1 className="mt-4 text-[34px] font-semibold tracking-[-0.05em] text-slate-900 sm:text-[42px]">
                  Who’s in your circle?
                </h1>

                <p className="mt-3 text-[15px] leading-7 text-slate-600">
                  Add someone important, then choose the relationship tags that fit best.
                </p>

                <div className="mt-7">
                  <label htmlFor="contactSearch" className="block text-sm font-medium text-slate-900">
                    Search contacts
                  </label>
                  <input
                    id="contactSearch"
                    type="text"
                    value={contactSearch}
                    onChange={(e) => searchGoogleContacts(e.target.value)}
                    placeholder="Search a name or email"
                    className="mt-2 h-[56px] w-full rounded-[18px] border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#f36f64]/50 focus:ring-4 focus:ring-[#f36f64]/10"
                  />

                  {searchingContacts ? (
                    <p className="mt-2 text-xs text-slate-500">Searching contacts...</p>
                  ) : null}

                  {contactResults.length > 0 ? (
                    <div className="mt-3 overflow-hidden rounded-[18px] border border-slate-200 bg-white">
                      {contactResults.map((contact) => (
                        <button
                          key={contact.id}
                          type="button"
                          onClick={() => selectContact(contact)}
                          className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {contact.name || "No name"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {contact.email || "No email"}
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-[#ea7451]">Use</span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {contactsMessage ? (
                    <p className="mt-2 text-xs text-slate-500">{contactsMessage}</p>
                  ) : null}
                </div>

                <div className="mt-7 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="inviteName" className="block text-sm font-medium text-slate-900">
                      Name
                    </label>
                    <input
                      id="inviteName"
                      type="text"
                      value={form.inviteName}
                      onChange={(e) => updateField("inviteName", e.target.value)}
                      placeholder="Sarah"
                      className={`mt-2 h-[56px] w-full rounded-[18px] border bg-white px-4 text-sm text-slate-900 outline-none transition focus:ring-4 ${
                        errors.inviteName
                          ? "border-red-300 focus:border-red-300 focus:ring-red-100"
                          : "border-slate-300 focus:border-[#f36f64]/50 focus:ring-[#f36f64]/10"
                      }`}
                    />
                    {errors.inviteName ? (
                      <p className="mt-2 text-xs text-red-500">{errors.inviteName}</p>
                    ) : null}
                  </div>

                  <div>
                    <label htmlFor="inviteEmail" className="block text-sm font-medium text-slate-900">
                      Email address
                    </label>
                    <input
                      id="inviteEmail"
                      type="email"
                      value={form.inviteEmail}
                      onChange={(e) => updateField("inviteEmail", e.target.value)}
                      placeholder="sarah@example.com"
                      className={`mt-2 h-[56px] w-full rounded-[18px] border bg-white px-4 text-sm text-slate-900 outline-none transition focus:ring-4 ${
                        errors.inviteEmail
                          ? "border-red-300 focus:border-red-300 focus:ring-red-100"
                          : "border-slate-300 focus:border-[#f36f64]/50 focus:ring-[#f36f64]/10"
                      }`}
                    />
                    {errors.inviteEmail ? (
                      <p className="mt-2 text-xs text-red-500">{errors.inviteEmail}</p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-7">
                  <label className="block text-sm font-medium text-slate-900">
                    Relationship
                  </label>

                  <div className="mt-3 flex flex-wrap gap-2.5">
                    {relationshipOptions.map((relationship) => {
                      const selected = selectedRelationships.includes(relationship);

                      return (
                        <button
                          key={relationship}
                          type="button"
                          onClick={() => toggleRelationship(relationship)}
                          className={`rounded-full px-4 py-2.5 text-sm font-medium transition ${
                            selected
                              ? "bg-[#2f3b2d] text-white"
                              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {relationship}
                        </button>
                      );
                    })}
                  </div>

                  {errors.relationships ? (
                    <p className="mt-2 text-xs text-red-500">{errors.relationships}</p>
                  ) : null}
                </div>
              </div>
            )}

            <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[#f1e4dc] pt-6">
              <button
                type="button"
                onClick={previousStep}
                disabled={step === 1 || saving}
                className={`inline-flex h-[50px] min-w-[120px] items-center justify-center rounded-full px-5 text-sm font-medium ${
                  step === 1 || saving
                    ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                Back
              </button>

              <div className="flex flex-wrap items-center gap-3">
                {step === 3 ? (
                  <button
                    type="button"
                    onClick={skipInviteStep}
                    disabled={saving}
                    className={`inline-flex h-[50px] min-w-[120px] items-center justify-center rounded-full border px-5 text-sm font-medium ${
                      saving
                        ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Skip for now
                  </button>
                ) : null}

                {step < steps.length ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    disabled={saving}
                    className={`inline-flex h-[50px] min-w-[140px] items-center justify-center rounded-full px-6 text-sm font-semibold text-white shadow-lg ${
                      saving
                        ? "cursor-not-allowed bg-[#e9a48d]"
                        : "bg-gradient-to-b from-[#ff946d] to-[#f36f64]"
                    }`}
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => finishOnboarding(false)}
                    disabled={saving}
                    className={`inline-flex h-[50px] min-w-[170px] items-center justify-center rounded-full px-6 text-sm font-semibold text-white shadow-lg ${
                      saving
                        ? "cursor-not-allowed bg-[#5d695b]"
                        : "bg-[#2f3b2d]"
                    }`}
                  >
                    {saving ? "Building your profile..." : "Finish setup"}
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      {saving ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#fffaf7]/90 px-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[30px] border border-[#efd8ce] bg-white p-8 text-center shadow-[0_25px_80px_rgba(173,101,72,0.14)]">
            <div className="mx-auto h-14 w-14 rounded-full bg-[#fff1ea] p-3">
              <div className="h-full w-full animate-spin rounded-full border-2 border-[#f6d8ca] border-t-[#f36f64]" />
            </div>

            <h2 className="mt-6 text-[28px] font-semibold tracking-[-0.04em] text-slate-900">
              We’re building your profile
            </h2>

            <p className="mt-3 text-[15px] leading-7 text-slate-600">
              Pulling everything together so your space feels personal from the start.
            </p>

            <div className="mt-6 rounded-full bg-[#f5eee9] p-1">
              <div className="h-2 w-2/3 animate-pulse rounded-full bg-gradient-to-r from-[#ff946d] to-[#f36f64]" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
