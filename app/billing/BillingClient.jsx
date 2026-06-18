"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
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
      try {
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
      } catch (err) {
        if (!ignore) {
          setError(err.message || "Failed to load billing details");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
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

    try {
      await saveBilling({
        billing_email,
        billing_country,
      });
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

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("You must be signed in to add a card");
      }

      const res = await fetch("/api/billing/setup-intent", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to open card form");
      }

      window.location.href = "/billing/add-card";
    } catch (err) {
      setError(err.message || "Something went wrong opening card form");
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fffaf7] px-5 py-8 text-slate-800 md:px-8">
      <div className="mx-auto max-w-[980px]">
        <div className="mb-6">
          <Link
            href="/settings"
            replace
            className="inline-flex h-11 items-center gap-2 rounded-full border border-[#ead8ce] bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-[#faf6f3]"
          >
            <span aria-hidden="true">←</span>
            <span>Back to settings</span>
          </Link>
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
                        Add a card to keep payment ready for future pots and shop purchases.
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
                    {portalLoading ? "Opening form..." : "Add card"}
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
                      href="/settings"
                      replace
                      className="inline-flex h-[52px] items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-medium text-slate-700 hover:bg-[#faf6f3]"
                    >
                      Cancel
                    </Link>
                  </div>
                </form>
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
                      {paymentMethods.length > 0
                        ? `${paymentMethods[0].brand} •••• ${paymentMethods[0].last4}`
                        : "None yet"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Used for</span>
                    <span className="font-medium text-slate-900">Pots and shop</span>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
