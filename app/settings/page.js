import Link from "next/link";
import BackButton from "../components/BackButton";

export const metadata = {
  title: "Settings | Hinted.io",
  description: "Manage reminder and app preferences.",
};

export default function SettingsPage() {
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

        <div className="space-y-6">
          <section className="rounded-[28px] border border-[#eddacf] bg-white p-6 shadow-sm">
            <h2 className="text-[20px] font-semibold text-slate-900">How you hear from us</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Choose the best way for Hinted to help you stay ahead of birthdays,
              anniversaries, major events, and shared gift moments.
            </p>

            <div className="mt-6 space-y-4">
              <label className="flex items-center justify-between gap-4 rounded-[20px] border border-[#f1e4dc] bg-[#fffdfa] px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">Email reminders</p>
                  <p className="text-xs text-slate-500">
                    Best if you want a calmer written record you can revisit later.
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="h-5 w-5 accent-[#f36f64]" />
              </label>

              <label className="flex items-center justify-between gap-4 rounded-[20px] border border-[#f1e4dc] bg-[#fffdfa] px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">In-app reminders</p>
                  <p className="text-xs text-slate-500">
                    Best if you check Hinted often and want prompts where you already plan.
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="h-5 w-5 accent-[#f36f64]" />
              </label>

              <label className="flex items-center justify-between gap-4 rounded-[20px] border border-[#f1e4dc] bg-[#fffdfa] px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">Priority gift prompts</p>
                  <p className="text-xs text-slate-500">
                    Helpful when a saved hint, wishlist item, or group gift needs attention.
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="h-5 w-5 accent-[#f36f64]" />
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
                defaultValue="7"
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
                defaultValue="GBP"
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

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              className="inline-flex h-[52px] items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-6 text-sm font-semibold text-white shadow-lg"
            >
              Save settings
            </button>

            <Link
              href="/"
              className="inline-flex h-[52px] items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-medium text-slate-700 hover:bg-[#faf6f3]"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
