"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
import BackButton from "../components/BackButton";
import { saveBilling } from "../actions/billing";

export default function BillingClient() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState("");

  const [billing_email, setBillingEmail] = useState("");
  const [billing_country, setBillingCountry] = useState("GB");
  const [paymentMethods, setPaymentMethods] = useState([]);

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
        .select("billing_email, billing_country")
        .eq("id", user.id)
        .single();

      if (!ignore && data) {
        setBillingEmail(data.billing_email ?? "");
        setBillingCountry(data.billing_country ?? "GB");
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        const pmRes = await fetch("/api/billing/payment-methods", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const pmData = await pmRes.json();

        if (!ignore && pmRes.ok) {
          setPaymentMethods(pmData.paymentMethods ?? []);
        }
      }

      if (!ignore) {
        setLoading(false);
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [supabase]);

  async function handleSave(e) {
    e.preventDefault();

    setSaving(true);
    setError("");

    const formData = {
      billing_email,
      billing_country,
    };

    try {
      await saveBilling(formData);
    } catch (err) {
      setError(err.message || "Failed to save billing details");
    } finally {
      setSaving(false);
    }
  }

  async function handleManageCards() {
    try {
      setPortalLoading(true);
      setError("");

      const customerRes = await fetch("/api/billing/customer", {
        method: "POST",
      });

      const customerData = await customerRes.json();

      if (!customerRes.ok) {
        throw new Error(customerData.error || "Failed to create Stripe customer");
      }

      const portalRes = await fetch("/api/billing/portal-session", {
        method: "POST",
      });

      const portalData = await portalRes.json();

      if (!portalRes.ok) {
        throw new Error(portalData.error || "Failed to open billing portal");
      }

      window.location.href = portalData.url;
    } catch (err) {
      setError(err.message || "Something went wrong opening the billing portal");
    } finally {
      setPortalLoading(false);
    }
  }

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

        {loading ? (
          <div className="rounded-[28px] border border-[#eddacf] bg-white p-6 text-center text-slate-500">
            Loading your billing details...
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <section className="rounded-[28px] border border-[#eddacf] bg-white p-6 shadow-sm">
                <h2 className="text-[20px] font-semibold text-slate-900">Saved cards</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Use saved cards to move quickly when joining a pot or buying through shop.
                </p>

                <div className="mt-6 space-y-3">
                  {paymentMethods.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-[#ead8ce] bg-[#fffdfa] p-5">
                      <p className="text-sm font-semibold text-slate-900">No saved cards yet</p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        When you add a card through Stripe, it will appear here for quick reference.
                      </p>
                    </div>
                  ) : (
                    paymentMethods.map((card) => (
                      <div
                        key={card.id}
                        className="flex items-center justify-between rounded-[24px] border border-[#ead8ce] bg-[#fffdfa] p-5"
                      >
                        <div>
                          <p className="text-sm font-semibold capitalize text-slate-900">
                            {card.brand} ending in {card.last4}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Expires {String(card.exp_month).padStart(2, "0")}/{card.exp_year}
                          </p>
                        </div>

                        <span className="rounded-full bg-[#f6ebe4] px-3 py-1 text-xs font-medium text-slate-700">
                          Saved
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={handleManageCards}
                    disabled={portalLoading}
                    className="inline-flex h-[48px] items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-5 text-sm font-semibold text-white shadow-lg disabled:opacity-70"
                  >
                    {portalLoading ? "Opening Stripe..." : "Add new card"}
                  </button>
                </div>
              </section>

              <section className="rounded-[28px] border border-[#eddacf] bg-white p-6 shadow-sm">
                <h2 className="text-[20px] font-semibold text-slate-900">Billing contact</h2>
                <p className="mt-2 text-sm text-slate-500">
                  This is where payment receipts and card-related notices will be sent.
                </p>

                <form onSubmit={handleSave} className="mt-6 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-900" htmlFor="billingEmail">
                      Billing email
                    </label>
                    <input
                      id="billingEmail"
                      type="email"
                      value={billing_email}
                      onChange={(e) => setBillingEmail(e.target.value)}
                      placeholder="billing@example.com"
                      className="mt-2 h-[54px] w-full rounded-[18px] border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#f36f64]/50 focus:ring-4 focus:ring-[#f36f64]/10"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900" htmlFor="billingCountry">
                      Billing country
                    </label>
                    <select
                      id="billingCountry"
                      value={billing_country}
                      onChange={(e) => setBillingCountry(e.target.value)}
                      className="mt-2 h-[54px] w-full rounded-[18px] border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#f36f64]/50 focus:ring-4 focus:ring-[#f36f64]/10"
                    >
                      <option value="GB">United Kingdom</option>
                      <option value="US">United States</option>
                      <option value="IE">Ireland</option>
                      <option value="FR">France</option>
                    </select>
                  </div>

                  {error && (
                    <div className="md:col-span-2 rounded-[22px] bg-[#fde8e8] p-4 text-sm text-[#c12020]">
                      {error}
                    </div>
                  )}

                  <div className="md:col-span-2 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex h-[52px] items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-6 text-sm font-semibold text-white shadow-lg disabled:opacity-70"
                    >
                      {saving ? "Saving..." : "Save billing details"}
                    </button>

                    <Link
                      href="/"
                      className="inline-flex h-[52px] items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-medium text-slate-700 hover:bg-[#faf6f3]"
                    >
                      Cancel
                    </Link>
                  </div>
                </form>
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
                    <span className="font-medium text-slate-900">{paymentMethods.length}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Default card</span>
                    <span className="font-medium text-slate-900">
                      {paymentMethods.length > 0 ? `${paymentMethods[0].brand} •••• ${paymentMethods[0].last4}` : "None yet"}
                    </span>
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
        )}
      </div>
    </main>
  );
}
