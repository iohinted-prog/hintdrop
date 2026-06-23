"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
import BackButton from "../components/BackButton";
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

export default function SettingsClient() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [email_reminders, setEmailReminders] = useState(true);
  const [personalized_offers, setPersonalizedOffers] = useState(true);
  const [hint_sale_alerts, setHintSaleAlerts] = useState(true);
  const [product_updates, setProductUpdates] = useState(false);
  const [default_reminder_days, setDefaultReminderDays] = useState("7");
  const [currency, setCurrency] = useState("GBP");
  const [interests, setInterests] = useState(["Travel", "Food"]);
  const [other_interest, setOtherInterest] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!ignore) setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select(
          "email_reminders, personalized_offers, hint_sale_alerts, product_updates, default_reminder_days, currency, interests, other_interest"
        )
        .eq("id", user.id)
        .single();

      if (!ignore && data) {
        setEmailReminders(data.email_reminders ?? true);
        setPersonalizedOffers(data.personalized_offers ?? true);
        setHintSaleAlerts(data.hint_sale_alerts ?? true);
        setProductUpdates(data.product_updates ?? false);
        setDefaultReminderDays(String(data.default_reminder_days ?? 7));
        setCurrency(data.currency ?? "GBP");
        setInterests(
          Array.isArray(data.interests) && data.interests.length >= 2
            ? data.interests
            : ["Travel", "Food"]
        );
        setOtherInterest(data.other_interest ?? "");
      }

      if (!ignore) setLoading(false);
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [supabase]);

  function toggleInterest(interest) {
    setInterests((current) => {
      if (current.includes(interest)) {
        return current.filter((item) => item !== interest);
      }

      return [...current, interest];
    });
  }

  async function handleSave(e) {
    e.preventDefault();

    if (interests.length < 2) {
      setError("Please choose at least 2 interests.");
      return;
    }

    if (interests.includes("Other") && !other_interest.trim()) {
      setError("Please tell us your other interest.");
      return;
    }

    setSaving(true);
    setError("");

    const formData = {
      email_reminders: email_reminders ? "1" : "0",
      personalized_offers: personalized_offers ? "1" : "0",
      hint_sale_alerts: hint_sale_alerts ? "1" : "0",
      product_updates: product_updates ? "1" : "0",
      default_reminder_days: String(default_reminder_days),
      currency,
      interests,
      other_interest: interests.includes("Other") ? other_interest : "",
    };

    try {
      await saveSettings(formData);
    } catch (err) {
      setError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fffaf7] px-5 py-8 text-slate-800 md:px-8">
      <div className="mx-auto max-w-[920px]">
        <div className="mb-6">
          <BackButton fallback="/" />
        </div>

        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#df7b59]">
            settings
          </p>
          <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.05em] text-slate-900">
            Reminder and app settings
          </h1>
          <p className="mt-3 max-w-[680px] text-[15px] leading-7 text-slate-600">
            Hinted is built to help you never forget the people and occasions that
            matter. We recommend staying meaningfully ahead so you have time to act,
            not just time to panic.
          </p>
        </div>

        {loading ? (
          <div className="rounded-[28px] border border-[#eddacf] bg-white p-6 text-center text-slate-500">
            Loading your settings...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            <section className="rounded-[28px] border border-[#eddacf] bg-white p-6 shadow-sm">
              <h2 className="text-[20px] font-semibold text-slate-900">How you hear from us</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Choose the kinds of messages Hinted should send so you can stay ahead
                without being overwhelmed.
              </p>

              <div className="mt-6 space-y-4">
                <label className="flex items-center justify-between gap-4 rounded-[20px] border border-[#f1e4dc] bg-[#fffdfa] px-4 py-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Email reminders</p>
                    <p className="text-xs text-slate-500">
                      Best if you want a calm written record of upcoming birthdays,
                      events, and gift moments.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={email_reminders}
                    onChange={(e) => setEmailReminders(e.target.checked)}
                    className="h-5 w-5 accent-[#f36f64]"
                  />
                </label>

                <label className="flex items-center justify-between gap-4 rounded-[20px] border border-[#f1e4dc] bg-[#fffdfa] px-4 py-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Personalised offers</p>
                    <p className="text-xs text-slate-500">
                      Hear about offers and gift ideas tailored to your hints, occasions,
                      and the people you are buying for.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={personalized_offers}
                    onChange={(e) => setPersonalizedOffers(e.target.checked)}
                    className="h-5 w-5 accent-[#f36f64]"
                  />
                </label>

                <label className="flex items-center justify-between gap-4 rounded-[20px] border border-[#f1e4dc] bg-[#fffdfa] px-4 py-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Hint sale alerts</p>
                    <p className="text-xs text-slate-500">
                      We’ll let you know when something linked to one of your saved hints
                      goes on sale.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={hint_sale_alerts}
                    onChange={(e) => setHintSaleAlerts(e.target.checked)}
                    className="h-5 w-5 accent-[#f36f64]"
                  />
                </label>

                <label className="flex items-center justify-between gap-4 rounded-[20px] border border-[#f1e4dc] bg-[#fffdfa] px-4 py-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Product updates</p>
                    <p className="text-xs text-slate-500">
                      Hear about improvements, new features, and changes to how Hinted works.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={product_updates}
                    onChange={(e) => setProductUpdates(e.target.checked)}
                    className="h-5 w-5 accent-[#f36f64]"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-[28px] border border-[#eddacf] bg-white p-6 shadow-sm">
              <h2 className="text-[20px] font-semibold text-slate-900">Reminder timing</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                This sets your default lead time for birthdays and events like Father’s Day,
                Valentine’s Day, anniversaries, promotions, and other important occasions.
                We recommend at least <span className="font-semibold text-slate-900">1 week before</span>
                so you still have time to choose, organise, and contribute thoughtfully.
              </p>

              <div className="mt-6">
                <label className="block text-sm font-medium text-slate-900" htmlFor="defaultReminder">
                  How early should Hinted remind you?
                </label>
                <select
                  id="defaultReminder"
                  value={default_reminder_days}
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

              <div className="mt-5 rounded-[22px] bg-[#fff7f2] p-4">
                <p className="text-sm font-semibold text-slate-900">Important for accepted pots</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Reminders for pots you have accepted cannot be turned off. This protects you
                  and the rest of your circle from losing momentum on an amazing gift for a friend.
                </p>
              </div>
            </section>

            <section className="rounded-[28px] border border-[#eddacf] bg-white p-6 shadow-sm">
              <h2 className="text-[20px] font-semibold text-slate-900">Interests</h2>
              <p className="mt-2 text-sm text-slate-500">
                Choose the categories Hinted should use across onboarding, shop suggestions,
                and gift recommendations.
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
                  <label
                    htmlFor="otherInterest"
                    className="block text-sm font-medium text-slate-900"
                  >
                    Tell us your other interest
                  </label>
                  <input
                    id="otherInterest"
                    type="text"
                    value={other_interest}
                    onChange={(e) => setOtherInterest(e.target.value)}
                    placeholder="Collecting, crafts, pets..."
                    className="mt-2 h-[54px] w-full rounded-[18px] border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#f36f64]/50 focus:ring-4 focus:ring-[#f36f64]/10"
                  />
                </div>
              ) : null}

              <p className="mt-4 text-xs leading-5 text-slate-500">
                Pick at least 2 interests.
              </p>
            </section>

            <section className="rounded-[28px] border border-[#eddacf] bg-white p-6 shadow-sm">
              <h2 className="text-[20px] font-semibold text-slate-900">Privacy and visibility</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Hinted is not an open public network. Your profile is only visible to people
                you add and accept, or who add and are accepted by you.
              </p>

              <div className="mt-6 space-y-4">
                <div className="rounded-[20px] border border-[#f1e4dc] bg-[#fffdfa] px-4 py-4">
                  <p className="text-sm font-medium text-slate-900">Your profile is contact-based</p>
                  <p className="mt-1 text-xs leading-6 text-slate-500">
                    People do not browse all Hinted users. Visibility starts only when a contact
                    connection has been added and accepted.
                  </p>
                </div>

                <div className="rounded-[20px] border border-[#f1e4dc] bg-[#fffdfa] px-4 py-4">
                  <p className="text-sm font-medium text-slate-900">Hints stay thoughtful</p>
                  <p className="mt-1 text-xs leading-6 text-slate-500">
                    Shared gift planning is designed around trusted circles, while private gift flows
                    help protect surprise moments when needed.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-[#eddacf] bg-white p-6 shadow-sm">
              <h2 className="text-[20px] font-semibold text-slate-900">Currency</h2>
              <p className="mt-2 text-sm text-slate-500">
                Choose the currency you prefer to see across pots, contributions, and shop pricing.
              </p>

              <div className="mt-6">
                <label className="block text-sm font-medium text-slate-900" htmlFor="currency">
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

            <section className="rounded-[28px] border border-[#eddacf] bg-white p-6 shadow-sm">
              <h2 className="text-[20px] font-semibold text-slate-900">Security</h2>
              <p className="mt-2 text-sm text-slate-500">
                Manage password and session-related actions.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="inline-flex h-[48px] items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-[#faf6f3]"
                >
                  Change password
                </button>

                <button
                  type="button"
                  className="inline-flex h-[48px] items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-[#faf6f3]"
                >
                  Sign out of all devices
                </button>
              </div>
            </section>

            {error && (
              <div className="rounded-[22px] bg-[#fde8e8] p-4 text-sm text-[#c12020]">
                {error}
              </div>
            )}

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
        )}
      </div>
    </main>
  );
}
