"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const PREFERENCE_COPY = {
  email_reminders: {
    label: "Reminder emails",
    description: "Birthday and occasion reminders for people in your Circle.",
  },
  circle_reminders: {
    label: "Circle invite reminders",
    description: "Follow-up nudges for Circle invites you haven't responded to yet.",
  },
  weekly_digest: {
    label: "Weekly digest",
    description: "A weekly summary of new hints from people you follow, if there's anything new.",
  },
};

export default function UnsubscribeClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  // "No token" is knowable synchronously from the URL, so it's derived
  // directly as the initial state via a lazy initializer rather than
  // set inside the effect below - avoids an unnecessary extra render
  // and a setState call inside an effect for something that isn't
  // actually asynchronous.
  const [status, setStatus] = useState(() => (token ? "loading" : "error")); // loading | ready | error | saving | saved
  const [errorMessage, setErrorMessage] = useState(() =>
    token ? "" : "This link is missing some information. Please use the link from your email directly."
  );
  const [name, setName] = useState(null);
  const [email, setEmail] = useState(null);
  const [preferences, setPreferences] = useState(null);

  useEffect(() => {
    // Genuinely nothing to do here if there's no token - that state was
    // already set correctly above, synchronously, before this effect
    // ever runs.
    if (!token) return;

    fetch(`/api/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok || !data) {
          throw new Error(data?.error || "Something went wrong.");
        }
        setName(data.name);
        setEmail(data.email);
        setPreferences(data.preferences);
        setStatus("ready");
      })
      .catch((err) => {
        setStatus("error");
        setErrorMessage(err.message || "Something went wrong. Please try again.");
      });
  }, [token]);

  const save = useCallback(
    async (nextPreferences) => {
      setStatus("saving");
      try {
        const res = await fetch("/api/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, preferences: nextPreferences }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || "Something went wrong.");
        }
        setPreferences(nextPreferences);
        setStatus("saved");
      } catch (err) {
        setStatus("error");
        setErrorMessage(err.message || "Something went wrong. Please try again.");
      }
    },
    [token]
  );

  function toggle(field) {
    if (!preferences) return;
    setPreferences((prev) => ({ ...prev, [field]: !prev[field] }));
  }

  return (
    <main className="min-h-screen bg-[#fffaf7] flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-[480px] rounded-[28px] border border-[#efdcd2] bg-white p-8 shadow-[0_20px_60px_rgba(88,46,31,0.1)]">
        <div className="flex items-baseline gap-0 mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/illustrations/logo-trial-h-v3.png" alt="" className="h-6 w-auto object-contain" />
          <span className="text-[18px] font-extrabold tracking-[-0.04em]">
            <span className="text-[#ff875d]">int</span>
            <span className="text-slate-900">Drop</span>
          </span>
        </div>

        {status === "loading" && (
          <p className="text-sm text-slate-500">Loading your preferences...</p>
        )}

        {status === "error" && (
          <div>
            <p className="text-[15px] font-semibold text-slate-900 mb-1">We couldn&apos;t load this</p>
            <p className="text-sm text-[#b14f43]">{errorMessage}</p>
          </div>
        )}

        {(status === "ready" || status === "saving" || status === "saved") && preferences && (
          <>
            <h1 className="text-[20px] font-bold text-slate-900 mb-1">
              {name ? `Email preferences for ${name.split(" ")[0]}` : "Manage your email preferences"}
            </h1>
            <p className="text-sm text-slate-500 mb-6">
              Choose what you&apos;d like to hear from us about. No need to log in — this link is unique to you.
            </p>

            {email && (
              <p className="text-[13px] text-slate-500 mb-6 -mt-4">
                These preferences apply to <span className="font-semibold text-slate-700">{email}</span>.
              </p>
            )}

            <div className="space-y-4">
              {Object.entries(PREFERENCE_COPY).map(([field, copy]) => (
                <label
                  key={field}
                  className="flex items-start gap-3 rounded-[16px] border border-[#efdcd2] bg-[#fffaf7] p-4 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={preferences[field]}
                    onChange={() => toggle(field)}
                    className="mt-0.5 h-5 w-5 accent-[#ff875d] shrink-0"
                  />
                  <span>
                    <span className="block text-[14px] font-semibold text-slate-900">{copy.label}</span>
                    <span className="block text-[13px] text-slate-500 mt-0.5">{copy.description}</span>
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => save(preferences)}
                disabled={status === "saving"}
                className="h-12 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[14px] font-semibold text-white shadow-md hover:brightness-105 disabled:opacity-70"
              >
                {status === "saving" ? "Saving..." : status === "saved" ? "Saved ✓" : "Save preferences"}
              </button>
              <button
                type="button"
                onClick={() => save({ email_reminders: false, circle_reminders: false, weekly_digest: false })}
                disabled={status === "saving"}
                className="h-12 rounded-full border border-[#ead8ce] bg-white text-[14px] font-semibold text-slate-600 hover:bg-[#fff5f0] disabled:opacity-70"
              >
                Unsubscribe from everything
              </button>
            </div>

            {status === "saved" && (
              <div className="mt-4 flex flex-col items-center gap-3">
                <p className="text-[13px] text-[#2f7a4d] text-center">
                  Your preferences have been updated.
                </p>
                <Link
                  href="/"
                  className="text-[13px] font-semibold text-[#ff7e54] hover:underline"
                >
                  Go to HintDrop →
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
