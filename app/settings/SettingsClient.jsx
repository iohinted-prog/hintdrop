"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import { saveSettings } from "../actions/settings";

const INTEREST_OPTIONS = [
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

export default function SettingsPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [emailReminders, setEmailReminders] = useState(true);
  const [personalizedOffers, setPersonalizedOffers] = useState(true);
  const [hintSaleAlerts, setHintSaleAlerts] = useState(true);
  const [productUpdates, setProductUpdates] = useState(false);
  const [defaultReminderDays, setDefaultReminderDays] = useState("7");
  const [currency, setCurrency] = useState("GBP");
  const [interests, setInterests] = useState(["Travel", "Food"]);
  const [otherInterest, setOtherInterest] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "email_reminders, personalized_offers, hint_sale_alerts, product_updates, default_reminder_days, currency, interests, other_interest"
        )
        .eq("id", user.id)
        .single();

      if (error) {
        if (!cancelled) {
          setError("We couldn't load your settings right now.");
          setLoading(false);
        }
        return;
      }

      if (cancelled) return;

      setEmailReminders(data?.email_reminders ?? true);
      setPersonalizedOffers(data?.personalized_offers ?? true);
      setHintSaleAlerts(data?.hint_sale_alerts ?? true);
      setProductUpdates(data?.product_updates ?? false);
      setDefaultReminderDays(String(data?.default_reminder_days ?? 7));
      setCurrency(data?.currency ?? "GBP");
      setInterests(
        Array.isArray(data?.interests) && data.interests.length >= 2
          ? data.interests
          : ["Travel", "Food"]
      );
      setOtherInterest(data?.other_interest ?? "");
      setLoading(false);
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  function toggleInterest(interest) {
    setError("");
    setSuccess("");

    setInterests((current) => {
      if (current.includes(interest)) {
        return current.filter((item) => item !== interest);
      }

      return [...current, interest];
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (interests.length < 2) {
      setError("Please choose at least 2 interests.");
      return;
    }

    if (interests.includes("Other") && !otherInterest.trim()) {
      setError("Please tell us your other interest.");
      return;
    }

    setSaving(true);

    try {
      await saveSettings({
        email_reminders: emailReminders ? "1" : "0",
        personalized_offers: personalizedOffers ? "1" : "0",
        hint_sale_alerts: hintSaleAlerts ? "1" : "0",
        product_updates: productUpdates ? "1" : "0",
        default_reminder_days: defaultReminderDays,
        currency,
        interests,
        other_interest: interests.includes("Other") ? otherInterest : "",
      });

      setSuccess("Settings saved.");
    } catch (err) {
      setError(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fffaf7] px-5 py-8 text-slate-800 md:px-8">
        <div className="mx-auto max-w-[920px]">
          <div className="rounded-[28px] border border-[#eddacf] bg-white p-6 text-center text-slate-500">
            Loading your settings...
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
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            <span>←</span>
            <span>Back</span>
          </Link>
        </div>

        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#df7b59]">
            Settings
          </p>
          <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.05em] text-slate-900">
            Reminder and app settings
          </h1>
          <p className="mt-3 max-w-[680px] text-[15px] leading-7 text-slate-600">
            Manage how Hinted contacts you, how early reminders arrive, the interests
            we use to personalise your experience, and the currency shown across the app.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-[28px] border border-[#eddacf] bg-white p-6 shadow-sm">
            <h2 className="text-[20px] font-semibold text-slate-900">How you hear from us</h2>

            <div className="mt-6 space-y-4">
              <label className="flex items-center justify-between gap-4 rounded-[20px] border border-[#f1e4dc] bg-[#fffdfa] px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">Email reminders</p>
                  <p className="text-xs text-slate-500">
                    Receive reminders for upcoming occasions and gift moments.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={emailReminders}
                  onChange={(e) => setEmailReminders(e.target.checked)}
                  className="h-5 w-5 accent-[#f36f64]"
                />
              </label>

              <label className="flex items-center justify-between gap-4 rounded-[20px] border border-[#f1e4dc] bg-[#fffdfa] px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">Personalised offers</p>
                  <p className="text-xs text-slate-500">
                    See relevant ideas and offers based on your profile and activity.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={personalizedOffers}
                  onChange={(e) => setPersonalizedOffers(e.target.checked)}
                  className="h-5 w-5 accent-[#f36f64]"
                />
              </label>

              <label className="flex items-center justify-between gap-4 rounded-[20px] border border-[#f1e4dc] bg-[#fffdfa] px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">Hint sale alerts</p>
                  <p className="text-xs text-slate-500">
                    Get notified if something linked to one of your hints goes on sale.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={hintSaleAlerts}
                  onChange={(e) => setHintSaleAlerts(e.target.checked)}
                  className="h-5 w-5 accent-[#f36f64]"
                />
              </label>

              <label className="flex items-center justify-between gap-4 rounded-[20px] border border-[#f1e4dc] bg-[#fffdfa] px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">Product updates</p>
                  <p className="text-xs text-slate-500">
                    Hear about new features and improvements to Hinted.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={productUpdates}
                  onChange={(e) => setProductUpdates(e.target.checked)}
                  className="h-5 w-5 accent-[#f36f64]"
                />
              </label>
            </div>
          </section>

          <section className="rounded-[28px] border border-[#eddacf] bg-white p-6 shadow-sm">
            <h2 className="text-[20px] font-semibold text-slate-900">Reminder timing</h2>

            <div className="mt-6 max-w-[360px]">
              <label htmlFor="defaultReminderDays" className="block text-sm font-medium text-slate-900">
                Default reminder time
              </label>
              <select
                id="defaultReminderDays"
                value={defaultReminderDays}
                onChange={(e) => setDefaultReminderDays(e.target.value)}
                className="mt-2 h-[54px] w-full rounded-[18px] border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#f36f64]/50 focus:ring-4 focus:ring-[#f36f64]/10"
              >
                <option value="1">1 day before</option>
                <option value="3">3 days before</option>
                <option value="7">1 week before</option>
                <option value="14">2 weeks before</option>
                <option value="30">1 month before</option>
              </select>
            </div>
          </section>

          <section className="rounded-[28px] border border-[#eddacf] bg-white p-6 shadow-sm">
            <h2 className="text-[20px] font-semibold text-slate-900">Interests</h2>
            <p className="mt-2 text-sm text-slate-500">
              Pick at least 2 interests so Hinted can keep suggestions relevant.
            </p>

            <div className="mt-6 flex flex-wrap gap-2.5">
              {INTEREST_OPTIONS.map((interest) => {
                const selected = interests.includes(interest);

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

            {interests.includes("Other") ? (
              <div className="mt-6 max-w-[420px]">
                <label htmlFor="otherInterest" className="block text-sm font-medium text-slate-900">
                  Other interest
                </label>
                <input
                  id="otherInterest"
                  type="text"
                  value={otherInterest}
                  onChange={(e) => setOtherInterest(e.target.value)}
                  placeholder="Music gear, crafts, collecting..."
                  className="mt-2 h-[54px] w-full rounded-[18px] border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#f36f64]/50 focus:ring-4 focus:ring-[#f36f64]/10"
                />
              </div>
            ) : null}
          </section>

          <section className="rounded-[28px] border border-[#eddacf] bg-white p-6 shadow-sm">
            <h2 className="text-[20px] font-semibold text-slate-900">Currency</h2>

            <div className="mt-6 max-w-[360px]">
              <label htmlFor="currency" className="block text-sm font-medium text-slate-900">
                Preferred currency
              </label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-2 h-[54px] w-full rounded-[18px] border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#f36f64]/50 focus:ring-4 focus:ring-[#f36f64]/10"
              >
                <option value="GBP">GBP — British Pound</option>
                <option value="EUR">EUR — Euro</option>
                <option value="USD">USD — US Dollar</option>
                <option value="AUD">AUD — Australian Dollar</option>
                <option value="CAD">CAD — Canadian Dollar</option>
              </select>
            </div>
          </section>

          {error ? (
            <div className="rounded-[22px] bg-[#fde8e8] p-4 text-sm text-[#c12020]">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-[22px] bg-[#edf8ef] p-4 text-sm text-[#23643b]">
              {success}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-[52px] items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-6 text-sm font-semibold text-white shadow-lg disabled:opacity-70"
            >
              {saving ? "Saving..." : "Save settings"}
            </button>

            <Link
              href="/"
              className="inline-flex h-[52px] items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-medium text-slate-700 hover:bg-[#faf6f3]"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
