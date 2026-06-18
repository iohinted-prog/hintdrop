"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

const steps = [
  { id: 1, label: "Birthday" },
  { id: 2, label: "Interests" },
  { id: 3, label: "Invite" },
];

const interestOptions = [
  "Travel",
  "Food",
  "Home",
  "Books",
  "Coffee",
  "Fashion",
  "Fitness",
  "Beauty",
  "Tech",
  "Experiences",
  "Music",
  "Art",
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

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState(["Travel", "Food"]);
  const [form, setForm] = useState({
    fullName: "",
    birthday: "",
    inviteName: "",
    inviteEmail: "",
  });
  const [errors, setErrors] = useState({});
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [needsName, setNeedsName] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [contactsAllowed, setContactsAllowed] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [contactResults, setContactResults] = useState([]);
  const [searchingContacts, setSearchingContacts] = useState(false);

  const progress = useMemo(() => `${(step / steps.length) * 100}%`, [step]);

  useEffect(() => {
    async function loadUserProfile() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("Could not find logged-in user.");
        return;
      }

      const metadata = user.user_metadata || {};
      const googleName = getGoogleName(metadata);
      const googleAvatar = getGoogleAvatar(metadata);

      setForm((prev) => ({
        ...prev,
        fullName: googleName || "",
      }));
      setAvatarUrl(googleAvatar || "");
      setNeedsName(!googleName);

      const { data: existingProfile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, birthday, interests, invite_name, invite_email")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Error loading profile:", profileError.message);
      }

      const existingName = existingProfile?.full_name || "";
      const existingAvatar = existingProfile?.avatar_url || "";
      const resolvedName = googleName || existingName || "";
      const resolvedAvatar = googleAvatar || existingAvatar || "";

      setForm((prev) => ({
        ...prev,
        fullName: resolvedName,
        birthday: existingProfile?.birthday || prev.birthday,
        inviteName: existingProfile?.invite_name || prev.inviteName,
        inviteEmail: existingProfile?.invite_email || prev.inviteEmail,
      }));

      setSelectedInterests(
        Array.isArray(existingProfile?.interests) && existingProfile.interests.length > 0
          ? existingProfile.interests
          : ["Travel", "Food"]
      );

      setAvatarUrl(resolvedAvatar);
      setNeedsName(!resolvedName);

      const { error: syncError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          full_name: resolvedName || null,
          avatar_url: googleAvatar || existingAvatar || null,
        },
        { onConflict: "id" }
      );

      if (syncError) {
        console.error("Error syncing Google profile:", syncError.message);
      }

      setProfileLoaded(true);
    }

    loadUserProfile();
  }, [supabase]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function toggleInterest(interest) {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((item) => item !== interest)
        : [...prev, interest]
    );
  }

  function validateStep() {
    const nextErrors = {};

    if (step === 1) {
      if (needsName && !form.fullName.trim()) {
        nextErrors.fullName = "Please tell us what to call you.";
      }

      if (!form.birthday.trim()) {
        nextErrors.birthday = "Please add your birthday.";
      }
    }

    if (step === 3) {
      if (form.inviteEmail && !form.inviteName.trim()) {
        nextErrors.inviteName = "Add a name to match the email.";
      }

      if (form.inviteName && !form.inviteEmail.trim()) {
        nextErrors.inviteEmail = "Add an email to match the name.";
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
      return false;
    }

    const payload = {
      id: user.id,
      full_name: form.fullName.trim() || null,
      avatar_url: avatarUrl || null,
      birthday: form.birthday || null,
      interests: selectedInterests,
      invite_name: form.inviteName.trim() || null,
      invite_email: form.inviteEmail.trim() || null,
      ...values,
    };

    const { error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      console.error("Error saving profile:", error.message);
      return false;
    }

    return true;
  }

  async function nextStep() {
    if (!validateStep()) return;

    if (step === 1 || step === 2) {
      const ok = await saveProfile();
      if (!ok) return;
    }

    setStep((prev) => Math.min(prev + 1, steps.length));
  }

  function previousStep() {
    setStep((prev) => Math.max(prev - 1, 1));
  }

  async function skipInterestsStep() {
    const ok = await saveProfile();
    if (!ok) return;
    setStep(3);
  }

  function skipInviteStep() {
    finishOnboarding(true);
  }

  async function finishOnboarding(skippedInvite = false) {
    if (!skippedInvite && !validateStep()) return;

    const ok = await saveProfile({
      invite_name: skippedInvite ? null : form.inviteName.trim() || null,
      invite_email: skippedInvite ? null : form.inviteEmail.trim() || null,
      onboarding_completed: true,
    });

    if (!ok) return;

    router.push("/feed");
  }

  async function searchGoogleContacts(query) {
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
        console.error("No Google provider token found.");
        setContactResults([]);
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
      setContactsAllowed(true);
    } catch (error) {
      console.error("Contact search error:", error);
      setContactResults([]);
    } finally {
      setSearchingContacts(false);
    }
  }

  function handleContactSearchChange(value) {
    setContactSearch(value);
    searchGoogleContacts(value);
  }

  function selectContact(contact) {
    setForm((prev) => ({
      ...prev,
      inviteName: contact.name || prev.inviteName,
      inviteEmail: contact.email || prev.inviteEmail,
    }));
    setContactSearch(contact.name || contact.email || "");
    setContactResults([]);
    setErrors((prev) => ({
      ...prev,
      inviteName: "",
      inviteEmail: "",
    }));
  }

  if (!profileLoaded) {
    return (
      <main className="min-h-screen bg-[#fffaf7] text-slate-800">
        <div className="mx-auto max-w-[860px] px-5 py-12 md:px-8">
          <div className="rounded-[34px] border border-[#efd8ce] bg-white p-8 shadow-[0_25px_80px_rgba(173,101,72,0.12)]">
            <p className="text-sm text-slate-500">Loading your profile...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
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
                Add your birthday.
              </h1>

              <p className="mt-3 text-[15px] leading-7 text-slate-600">
                So we can remind people, and you don’t have to 🤫
              </p>

              {avatarUrl ? (
                <div className="mt-6 flex items-center gap-4 rounded-[22px] border border-[#f1e4dc] bg-[#fffaf7] p-4">
                  <img
                    src={avatarUrl}
                    alt={form.fullName ? `${form.fullName}'s profile` : "Profile"}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Signed in with Google
                    </p>
                    <p className="text-sm text-slate-500">
                      We’ll use this profile photo on your account.
                    </p>
                  </div>
                </div>
              ) : null}

              {needsName ? (
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
              ) : (
                <div className="mt-7 rounded-[22px] border border-[#f1e4dc] bg-[#fffaf7] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Name
                  </p>
                  <p className="mt-1 text-base font-medium text-slate-900">{form.fullName}</p>
                </div>
              )}

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
                Pick 2-3 that interests you, so we can improve your experience
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

              <p className="mt-4 text-xs leading-5 text-slate-500">
                Choose a few now, or skip and do it later.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="mt-8 max-w-[620px]">
              <div className="inline-flex rounded-full bg-[#fff1ea] px-3 py-1 text-xs font-semibold text-[#ea7451]">
                Step 3 of 3
              </div>

              <h1 className="mt-4 text-[34px] font-semibold tracking-[-0.05em] text-slate-900 sm:text-[42px]">
                Invite someone to get started.
              </h1>

              <p className="mt-3 text-[15px] leading-7 text-slate-600">
                Search your Google contacts by name or email, or add someone manually.
              </p>

              <div className="mt-7">
                <label htmlFor="contactSearch" className="block text-sm font-medium text-slate-900">
                  Search contacts
                </label>
                <input
                  id="contactSearch"
                  type="text"
                  value={contactSearch}
                  onChange={(e) => handleContactSearchChange(e.target.value)}
                  placeholder="Search a name or email"
                  className="mt-2 h-[56px] w-full rounded-[18px] border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#f36f64]/50 focus:ring-4 focus:ring-[#f36f64]/10"
                />

                {searchingContacts ? (
                  <p className="mt-2 text-xs text-slate-500">Searching contacts...</p>
                ) : null}

                {contactsAllowed && contactResults.length > 0 ? (
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

                {contactsAllowed && contactSearch && !searchingContacts && contactResults.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-500">
                    No matching Google contacts found. You can still add someone manually.
                  </p>
                ) : null}
              </div>

              <div className="mt-7 space-y-4">
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
            </div>
          )}

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[#f1e4dc] pt-6">
            <button
              type="button"
              onClick={previousStep}
              disabled={step === 1}
              className={`inline-flex h-[50px] min-w-[120px] items-center justify-center rounded-full px-5 text-sm font-medium ${
                step === 1
                  ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Back
            </button>

            <div className="flex flex-wrap items-center gap-3">
              {step === 2 ? (
                <button
                  type="button"
                  onClick={skipInterestsStep}
                  className="inline-flex h-[50px] min-w-[120px] items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Skip for now
                </button>
              ) : null}

              {step === 3 ? (
                <button
                  type="button"
                  onClick={skipInviteStep}
                  className="inline-flex h-[50px] min-w-[120px] items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Skip for now
                </button>
              ) : null}

              {step < steps.length ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="inline-flex h-[50px] min-w-[140px] items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-6 text-sm font-semibold text-white shadow-lg"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => finishOnboarding(false)}
                  className="inline-flex h-[50px] min-w-[170px] items-center justify-center rounded-full bg-[#2f3b2d] px-6 text-sm font-semibold text-white shadow-lg"
                >
                  Finish setup
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
