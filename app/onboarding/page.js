"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const steps = [
  { id: 1, label: "Account" },
  { id: 2, label: "Birthday" },
  { id: 3, label: "Interests" },
  { id: 4, label: "Invite" },
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

const relationshipOptions = [
  "Sibling",
  "Partner",
  "Friend",
  "Family",
  "Parent",
  "Work friend",
  "Best friend",
  "Flatmate",
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

export default function OnboardingPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState(["Travel", "Food"]);
  const [selectedRelationship, setSelectedRelationship] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    birthday: "",
    inviteName: "",
    inviteEmail: "",
  });
  const [errors, setErrors] = useState({});

  const progress = useMemo(() => `${(step / steps.length) * 100}%`, [step]);

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

  function toggleRelationship(option) {
    setSelectedRelationship((prev) => (prev === option ? "" : option));
  }

  function validateStep() {
    const nextErrors = {};

    if (step === 1) {
      if (!form.name.trim()) nextErrors.name = "Please enter your name.";
      if (!form.email.trim()) nextErrors.email = "Please enter your email.";
      if (!form.password.trim()) nextErrors.password = "Please create a password.";
    }

    if (step === 2) {
      if (!form.birthday.trim()) nextErrors.birthday = "Please add your birthday.";
    }

    if (step === 4) {
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

  function nextStep() {
    if (!validateStep()) return;
    setStep((prev) => Math.min(prev + 1, steps.length));
  }

  function previousStep() {
    setStep((prev) => Math.max(prev - 1, 1));
  }

  function skipInterestsStep() {
    setStep(4);
  }

  function skipInviteStep() {
    router.push("/feed");
  }

  function finishOnboarding() {
    if (!validateStep()) return;
    router.push("/feed");
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

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                Step 1 of 4
              </div>

              <h1 className="mt-4 text-[34px] font-semibold tracking-[-0.05em] text-slate-900 sm:text-[42px]">
                Create your account.
              </h1>

              <p className="mt-3 text-[15px] leading-7 text-slate-600">
                Start with the basics, then tailor your Hinted setup in a few quick steps.
              </p>

              <div className="mt-7 space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-900">
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Your name"
                    className={`mt-2 h-[56px] w-full rounded-[18px] border bg-white px-4 text-sm text-slate-900 outline-none transition focus:ring-4 ${
                      errors.name
                        ? "border-red-300 focus:border-red-300 focus:ring-red-100"
                        : "border-slate-300 focus:border-[#f36f64]/50 focus:ring-[#f36f64]/10"
                    }`}
                  />
                  {errors.name ? <p className="mt-2 text-xs text-red-500">{errors.name}</p> : null}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-900">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="you@example.com"
                    className={`mt-2 h-[56px] w-full rounded-[18px] border bg-white px-4 text-sm text-slate-900 outline-none transition focus:ring-4 ${
                      errors.email
                        ? "border-red-300 focus:border-red-300 focus:ring-red-100"
                        : "border-slate-300 focus:border-[#f36f64]/50 focus:ring-[#f36f64]/10"
                    }`}
                  />
                  {errors.email ? <p className="mt-2 text-xs text-red-500">{errors.email}</p> : null}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-900">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    placeholder="Create a password"
                    className={`mt-2 h-[56px] w-full rounded-[18px] border bg-white px-4 text-sm text-slate-900 outline-none transition focus:ring-4 ${
                      errors.password
                        ? "border-red-300 focus:border-red-300 focus:ring-red-100"
                        : "border-slate-300 focus:border-[#f36f64]/50 focus:ring-[#f36f64]/10"
                    }`}
                  />
                  {errors.password ? (
                    <p className="mt-2 text-xs text-red-500">{errors.password}</p>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="mt-8 max-w-[620px]">
              <div className="inline-flex rounded-full bg-[#fff1ea] px-3 py-1 text-xs font-semibold text-[#ea7451]">
                Step 2 of 4
              </div>

              <h1 className="mt-4 text-[34px] font-semibold tracking-[-0.05em] text-slate-900 sm:text-[42px]">
                Add your birthday.
              </h1>

              <p className="mt-3 text-[15px] leading-7 text-slate-600">
                So we can remind people, and you don’t have to 🤫
              </p>

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

          {step === 3 && (
            <div className="mt-8 max-w-[760px]">
              <div className="inline-flex rounded-full bg-[#fff1ea] px-3 py-1 text-xs font-semibold text-[#ea7451]">
                Step 3 of 4
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

          {step === 4 && (
            <div className="mt-8 max-w-[620px]">
              <div className="inline-flex rounded-full bg-[#fff1ea] px-3 py-1 text-xs font-semibold text-[#ea7451]">
                Step 4 of 4
              </div>

              <h1 className="mt-4 text-[34px] font-semibold tracking-[-0.05em] text-slate-900 sm:text-[42px]">
                Invite someone to get started.
              </h1>

              <p className="mt-3 text-[15px] leading-7 text-slate-600">
                Add someone now, or do it later from your feed.
              </p>

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

                <div>
                  <p className="block text-sm font-medium text-slate-900">Who are they to you?</p>
                  <div className="mt-3 flex flex-wrap gap-2.5">
                    {relationshipOptions.map((option) => {
                      const selected = selectedRelationship === option;

                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => toggleRelationship(option)}
                          className={`rounded-full px-4 py-2.5 text-sm font-medium transition ${
                            selected
                              ? "bg-[#2f3b2d] text-white"
                              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Optional, just to help organise your people a bit better.
                  </p>
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
              {step === 3 ? (
                <button
                  type="button"
                  onClick={skipInterestsStep}
                  className="inline-flex h-[50px] min-w-[120px] items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Skip for now
                </button>
              ) : null}

              {step === 4 ? (
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
                  onClick={finishOnboarding}
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
