import Link from "next/link";

export const metadata = {
  title: "Settings | Hinted.io",
  description: "Manage your preferences, reminders, and privacy settings.",
};

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-[#fffaf7] px-5 py-8 text-slate-800 md:px-8">
      <div className="mx-auto max-w-[920px]">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-[#ead8ce] bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-[#fff5f0]"
          >
            ← Back to home
          </Link>
        </div>

        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#df7b59]">
            settings
          </p>
          <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.05em] text-slate-900">
            Preferences and privacy
          </h1>
          <p className="mt-3 max-w-[620px] text-[15px] leading-7 text-slate-600">
            Manage reminders, notifications, privacy, and account security.
          </p>
        </div>

        <div className="space-y-6">
          <section className="rounded-[28px] border border-[#eddacf] bg-white p-6 shadow-sm">
            <h2 className="text-[20px] font-semibold text-slate-900">Notifications</h2>
            <p className="mt-2 text-sm text-slate-500">
              Choose how Hinted keeps you updated.
            </p>

            <div className="mt-6 space-y-4">
              <label className="flex items-center justify-between gap-4 rounded-[20px] border border-[#f1e4dc] bg-[#fffdfa] px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">Email reminders</p>
                  <p className="text-xs text-slate-500">
                    Get reminder emails for birthdays and upcoming occasions.
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="h-5 w-5 accent-[#f36f64]" />
              </label>

              <label className="flex items-center justify-between gap-4 rounded-[20px] border border-[#f1e4dc] bg-[#fffdfa] px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">Gift idea updates</p>
                  <p className="text-xs text-slate-500">
                    Receive suggestions when wishlists or hints change.
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="h-5 w-5 accent-[#f36f64]" />
              </label>

              <label className="flex items-center justify-between gap-4 rounded-[20px] border border-[#f1e4dc] bg-[#fffdfa] px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">Product updates</p>
                  <p className="text-xs text-slate-500">
                    Hear about new features and improvements.
                  </p>
                </div>
                <input type="checkbox" className="h-5 w-5 accent-[#f36f64]" />
              </label>
            </div>
          </section>

          <section className="rounded-[28px] border border-[#eddacf] bg-white p-6 shadow-sm">
            <h2 className="text-[20px] font-semibold text-slate-900">Reminder defaults</h2>
            <p className="mt-2 text-sm text-slate-500">
              Set how early you want reminders by default.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-900" htmlFor="birthdayReminder">
                  Birthday reminders
                </label>
                <select
                  id="birthdayReminder"
                  defaultValue="7"
                  className="mt-2 h-[54px] w-full rounded-[18px] border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#f36f64]/50 focus:ring-4 focus:ring-[#f36f64]/10"
                >
                  <option value="1">1 day before</option>
                  <option value="3">3 days before</option>
                  <option value="7">1 week before</option>
                  <option value="14">2 weeks before</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900" htmlFor="anniversaryReminder">
                  Anniversary reminders
                </label>
                <select
                  id="anniversaryReminder"
                  defaultValue="14"
                  className="mt-2 h-[54px] w-full rounded-[18px] border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#f36f64]/50 focus:ring-4 focus:ring-[#f36f64]/10"
                >
                  <option value="1">1 day before</option>
                  <option value="7">1 week before</option>
                  <option value="14">2 weeks before</option>
                  <option value="30">1 month before</option>
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-[#eddacf] bg-white p-6 shadow-sm">
            <h2 className="text-[20px] font-semibold text-slate-900">Privacy</h2>
            <p className="mt-2 text-sm text-slate-500">
              Control how your account appears to others.
            </p>

            <div className="mt-6 space-y-4">
              <label className="flex items-center justify-between gap-4 rounded-[20px] border border-[#f1e4dc] bg-[#fffdfa] px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">Show my profile to friends</p>
                  <p className="text-xs text-slate-500">
                    Let people in your circles view your profile and wishlist context.
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="h-5 w-5 accent-[#f36f64]" />
              </label>

              <label className="flex items-center justify-between gap-4 rounded-[20px] border border-[#f1e4dc] bg-[#fffdfa] px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">Allow group planning</p>
                  <p className="text-xs text-slate-500">
                    Let trusted contacts coordinate gifts around your occasions.
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="h-5 w-5 accent-[#f36f64]" />
              </label>
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
