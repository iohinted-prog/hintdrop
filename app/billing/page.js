import Link from "next/link";
import BackButton from "../components/BackButton";

export const metadata = {
  title: "Billing | Hinted.io",
  description: "Manage saved cards and payment preferences for pots and shop.",
};

const savedCards = [
  {
    id: 1,
    label: "Visa ending in 4242",
    expiry: "08/2028",
    default: true,
  },
  {
    id: 2,
    label: "Mastercard ending in 1189",
    expiry: "03/2027",
    default: false,
  },
];

export default function BillingPage() {
  return (
    <main className="min-h-screen bg-[#fffaf7] px-5 py-8 text-slate-800 md:px-8">
      <div className="mx-auto max-w-[980px]">
        <div className="mb-6">
          <BackButton fallback="/" />
        </div>

        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#df7b59]">
            billing
          </p>
          <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.05em] text-slate-900">
            Cards and payment details
          </h1>
          <p className="mt-3 max-w-[680px] text-[15px] leading-7 text-slate-600">
            Save and manage cards for group pots and shop purchases. There is no subscription
            here — this section is simply for secure payment storage and checkout readiness.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <section className="rounded-[28px] border border-[#eddacf] bg-white p-6 shadow-sm">
              <h2 className="text-[20px] font-semibold text-slate-900">Saved cards</h2>
              <p className="mt-2 text-sm text-slate-500">
                Use saved cards to move quickly when joining a pot or buying through shop.
              </p>

              <div className="mt-6 space-y-4">
                {savedCards.map((card) => (
                  <div
                    key={card.id}
                    className="rounded-[24px] border border-[#f1e4dc] bg-[#fffdfa] p-5"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{card.label}</p>
                        <p className="mt-1 text-xs text-slate-500">Expires {card.expiry}</p>
                      </div>

                      {card.default ? (
                        <span className="rounded-full bg-[#f3f7ef] px-3 py-1 text-[11px] font-semibold text-[#58703f]">
                          Default
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="rounded-full border border-[#ead8ce] bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-[#fff5f0]"
                        >
                          Make default
                        </button>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        className="inline-flex h-[40px] items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-[#faf6f3]"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="inline-flex h-[40px] items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-[#faf6f3]"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  className="inline-flex h-[48px] items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-5 text-sm font-semibold text-white shadow-lg"
                >
                  Add new card
                </button>
              </div>
            </section>

            <section className="rounded-[28px] border border-[#eddacf] bg-white p-6 shadow-sm">
              <h2 className="text-[20px] font-semibold text-slate-900">Billing contact</h2>
              <p className="mt-2 text-sm text-slate-500">
                This is where payment receipts and card-related notices will be sent.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-900" htmlFor="billingEmail">
                    Billing email
                  </label>
                  <input
                    id="billingEmail"
                    type="email"
                    defaultValue="cian@example.com"
                    className="mt-2 h-[54px] w-full rounded-[18px] border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#f36f64]/50 focus:ring-4 focus:ring-[#f36f64]/10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900" htmlFor="billingCountry">
                    Billing country
                  </label>
                  <select
                    id="billingCountry"
                    defaultValue="GB"
                    className="mt-2 h-[54px] w-full rounded-[18px] border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#f36f64]/50 focus:ring-4 focus:ring-[#f36f64]/10"
                  >
                    <option value="GB">United Kingdom</option>
                    <option value="US">United States</option>
                    <option value="IE">Ireland</option>
                    <option value="FR">France</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-[#eddacf] bg-white p-6 shadow-sm">
              <h2 className="text-[20px] font-semibold text-slate-900">How we handle payments</h2>
              <p className="mt-2 text-sm text-slate-500">
                We store only what is necessary to help you move quickly and safely.
              </p>

              <div className="mt-6 space-y-4">
                <div className="rounded-[20px] border border-[#f1e4dc] bg-[#fffdfa] px-4 py-4">
                  <p className="text-sm font-medium text-slate-900">Saved for convenience, not for pressure</p>
                  <p className="mt-1 text-xs leading-6 text-slate-500">
                    Your card can be kept on file so joining a pot or checking out in shop feels easy when timing matters.
                  </p>
                </div>

                <div className="rounded-[20px] border border-[#f1e4dc] bg-[#fffdfa] px-4 py-4">
                  <p className="text-sm font-medium text-slate-900">Protected carefully</p>
                  <p className="mt-1 text-xs leading-6 text-slate-500">
                    We are careful about how payment details are handled and shown, and we keep the experience focused on trust and clarity.
                  </p>
                </div>

                <div className="rounded-[20px] border border-[#f1e4dc] bg-[#fffdfa] px-4 py-4">
                  <p className="text-sm font-medium text-slate-900">No subscription billing here</p>
                  <p className="mt-1 text-xs leading-6 text-slate-500">
                    Billing in Hinted is for saved cards, receipts, and payment preferences only.
                  </p>
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-[28px] border border-[#eddacf] bg-white p-6 shadow-sm">
              <h2 className="text-[18px] font-semibold text-slate-900">Quick summary</h2>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Saved cards</span>
                  <span className="font-medium text-slate-900">2</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Default card</span>
                  <span className="font-medium text-slate-900">Visa 4242</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Used for</span>
                  <span className="font-medium text-slate-900">Pots and shop</span>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] bg-[#2f3b2d] p-6 text-white shadow-sm">
              <p className="text-xs uppercase tracking-[0.14em] text-white/60">
                Need help?
              </p>
              <p className="mt-3 text-sm leading-7 text-white/90">
                Questions about saved cards, receipts, or payment handling?
              </p>
              <Link
                href="/settings"
                className="mt-5 inline-flex h-[44px] items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-slate-900"
              >
                Contact support
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
