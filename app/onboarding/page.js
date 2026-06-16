"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export const metadata = {
  title: "Create account | Hinted.io",
  description: "Create your Hinted account and set up your profile.",
};

const steps = [
  { id: 1, label: "Account", required: true },
  { id: 2, label: "Birthday", required: false },
  { id: 3, label: "Interests", required: false },
  { id: 4, label: "Your people", required: false },
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

const peopleSuggestions = [
  "Partner",
  "Parents",
  "Siblings",
  "Best friends",
  "Close friends",
  "Work friends",
  "Flatmates",
  "Family",
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

      <div className="min-w-0">
        <p
          className={`truncate text-sm font-medium ${
            active || complete ? "text-slate-900" : "text-slate-400"
          }`}
        >
          {label}
        </p>
      </div>
    </div>
  );
}

function PreviewCard({ title, text, colors }) {
  return (
    <div className="rounded-[22px] border border-[#f1e4dc] bg-[#fffdfa] p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={`mt-1 h-11 w-11 shrink-0 rounded-2xl bg-gradient-to-b ${colors}`} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">{title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState(["Travel", "Food", "Home"]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    birthday: "",
    people: "",
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

  function validateStep() {
    if (step !== 1) return true;

    const nextErrors = {};

    if (!form.name.trim()) nextErrors.name = "Please enter your name.";
    if (!form.email.trim()) nextErrors.email = "Please enter your email.";
    if (!form.password.trim()) nextErrors.password = "Please create a password.";

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

  function skipStep() {
    setStep((prev) => Math.min(prev + 1, steps.length));
  }

  function finishOnboarding() {
    router.push("/feed");
  }

  return (
    <main className="min-h-screen bg-[#fffaf7] text-slate-800">
      <div className="mx-auto max-w-[1180px] px-5 py-8 md:px-8 md:py-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            <span>←</span>
            <span>Back</span>
          </Link>

          {step > 1 ? (
            <button
              type="button"
              onClick={skipStep}
              className="text-sm font-medium text-slate-500 hover:text-slate-900"
            >
              Skip this step
            </button>
          ) : (
            <span className="text-sm text-slate-300">Account details required</span>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-[34px] border border-[#efd8ce] bg-white p-5 shadow-[0_25px_80px_rgba(173,101,72,0.12)] sm:p-7">
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
                      name="name"
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
                    {errors.name ? (
                      <p className="mt-2 text-xs text-red-500">{errors.name}</p>
                    ) : null}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-900">
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
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
                    {errors.email ? (
                      <p className="mt-2 text-xs text-red-500">{errors.email}</p>
                    ) : null}
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-slate-900">
                      Password
                    </label>
                    <input
                      id="password"
                      name="password"
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
                  This helps Hinted place your dates and reminders in the right rhythm from the start.
                </p>

                <div className="mt-7">
                  <label htmlFor="birthday" className="block text-sm font-medium text-slate-900">
                    Birthday
                  </label>
                  <input
                    id="birthday"
                    name="birthday"
                    type="date"
                    value={form.birthday}
                    onChange={(e) => updateField("birthday", e.target.value)}
                    className="mt-2 h-[56px] w-full rounded-[18px] border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#f36f64]/50 focus:ring-4 focus:ring-[#f36f64]/10"
                  />
                </div>

                <p className="mt-3 text-xs leading-5 text-slate-500">
                  You can always update this later in settings.
                </p>
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
                  Pick a few interests so your hints and gift suggestions feel more relevant.
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
                  A few selections are enough for now.
                </p>
              </div>
            )}

            {step === 4 && (
              <div className="mt-8 max-w-[760px]">
                <div className="inline-flex rounded-full bg-[#fff1ea] px-3 py-1 text-xs font-semibold text-[#ea7451]">
                  Step 4 of 4
                </div>

                <h1 className="mt-4 text-[34px] font-semibold tracking-[-0.05em] text-slate-900 sm:text-[42px]">
                  Who do you celebrate with first?
                </h1>

                <p className="mt-3 text-[15px] leading-7 text-slate-600">
                  Add a few people or circles to make your feed feel useful right away.
                </p>

                <div className="mt-7">
                  <label htmlFor="people" className="block text-sm font-medium text-slate-900">
                    Add people or circles
                  </label>
                  <input
                    id="people"
                    name="people"
                    type="text"
                    value={form.people}
                    onChange={(e) => updateField("people", e.target.value)}
                    placeholder="Mum, Sarah, James, Flatmates..."
                    className="mt-2 h-[56px] w-full rounded-[18px] border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#f36f64]/50 focus:ring-4 focus:ring-[#f36f64]/10"
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {peopleSuggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="rounded-full border border-slate-200 bg-[#fffdfa] px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                      + {item}
                    </button>
                  ))}
                </div>

                <p className="mt-4 text-xs leading-5 text-slate-500">
                  You can invite or add more people later from the feed.
                </p>
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
                {step > 1 && step < steps.length ? (
                  <button
                    type="button"
                    onClick={skipStep}
                    className="inline-flex h-[50px] min-w-[120px] items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Skip
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
                    Create account
                  </button>
                )}
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-[30px] border border-[#efd8ce] bg-[#fff7f2] p-5 shadow-[0_20px_60px_rgba(173,101,72,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Getting started
              </p>
              <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.04em] text-slate-900">
                A calmer setup
              </h2>
              <p className="mt-3 text-[14px] leading-7 text-slate-600">
                Answer a few quick questions now, then refine everything else once you’re inside the app.
              </p>
            </section>

            <section className="rounded-[30px] border border-[#f0dfd6] bg-white p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                What you’ll unlock
              </p>
              <div className="mt-4 space-y-3">
                <PreviewCard
                  title="A more personal feed"
                  text="See dates, reminders, and social updates that feel relevant from day one."
                  colors="from-[#efc3af] to-[#ae6e57]"
                />
                <PreviewCard
                  title="Better hint suggestions"
                  text="Your interests help shape better gifting ideas over time."
                  colors="from-[#c4dde8] to-[#90b4c4]"
                />
                <PreviewCard
                  title="A quicker first circle"
                  text="Start with the people you already celebrate with most."
                  colors="from-[#809168] to-[#41512e]"
                />
              </div>
            </section>

            <section className="rounded-[30px] bg-[#2f3b2d] p-5 text-white">
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/60">
                After this
              </p>
              <p className="mt-3 text-[14px] leading-7 text-white/90">
                You’ll land in your feed and can start adding reminders, circles, and hints straight away.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
