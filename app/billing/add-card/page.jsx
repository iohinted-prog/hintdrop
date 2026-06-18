"use client";

import { useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../lib/supabase/client";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
);

function AddCardForm() {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setSubmitting(true);
    setError("");

    const { error: submitError } = await elements.submit();

    if (submitError) {
      setError(submitError.message || "Please check your card details.");
      setSubmitting(false);
      return;
    }

    const result = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/billing?saved=1`,
      },
      redirect: "if_required",
    });

    if (result.error) {
      setError(result.error.message || "Failed to save card.");
      setSubmitting(false);
      return;
    }

    if (result.setupIntent?.status === "succeeded") {
      router.replace("/billing?saved=1");
      router.refresh();
      return;
    }

    setError("Card setup did not complete.");
    setSubmitting(false);
  }

  return (
    <main className="min-h-screen bg-[#fffaf7] px-5 py-8 text-slate-800 md:px-8">
      <div className="mx-auto max-w-[760px]">
        <div className="mb-6">
          <Link
            href="/billing"
            replace
            className="inline-flex h-11 items-center gap-2 rounded-full border border-[#ead8ce] bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-[#faf6f3]"
          >
            <span aria-hidden="true">←</span>
            <span>Back to billing</span>
          </Link>
        </div>

        <section className="rounded-[28px] border border-[#eddacf] bg-white p-6 shadow-sm md:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#df7b59]">
            billing
          </p>
          <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.05em] text-slate-900">
            Add a card
          </h1>
          <p className="mt-3 max-w-[560px] text-[15px] leading-7 text-slate-600">
            Save a card for future pots and shop purchases. You will not be charged now.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="rounded-[24px] border border-[#ead8ce] bg-[#fffdfa] p-4">
              <PaymentElement onReady={() => setReady(true)} />
            </div>

            {error && (
              <div className="rounded-[20px] bg-[#fde8e8] p-4 text-sm text-[#c12020]">
                {error}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={!stripe || !elements || !ready || submitting}
                className="inline-flex h-[52px] items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-6 text-sm font-semibold text-white shadow-lg disabled:opacity-70"
              >
                {submitting ? "Saving..." : "Save card"}
              </button>

              <Link
                href="/billing"
                replace
                className="inline-flex h-[52px] items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-medium text-slate-700 hover:bg-[#faf6f3]"
              >
                Cancel
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

export default function AddCardPage() {
  const supabase = createClient();

  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSetupIntent() {
      try {
        setLoading(true);
        setError("");

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error("You must be signed in to add a card.");
        }

        const res = await fetch("/api/billing/setup-intent", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load card form.");
        }

        if (!data.clientSecret) {
          throw new Error("Missing Stripe client secret.");
        }

        setClientSecret(data.clientSecret);
      } catch (err) {
        setError(err.message || "Failed to load card form.");
      } finally {
        setLoading(false);
      }
    }

    loadSetupIntent();
  }, [supabase]);

  const options = useMemo(
    () => ({
      clientSecret,
      appearance: {
        theme: "stripe",
      },
    }),
    [clientSecret]
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fffaf7] px-5 py-8 text-slate-800 md:px-8">
        <div className="mx-auto max-w-[760px] rounded-[28px] border border-[#eddacf] bg-white p-6 text-center text-slate-500 shadow-sm">
          Loading secure card form...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#fffaf7] px-5 py-8 text-slate-800 md:px-8">
        <div className="mx-auto max-w-[760px] rounded-[28px] border border-[#eddacf] bg-white p-6 shadow-sm">
          <div className="rounded-[20px] bg-[#fde8e8] p-4 text-sm text-[#c12020]">
            {error}
          </div>

          <div className="mt-5">
            <Link
              href="/billing"
              replace
              className="inline-flex h-[44px] items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-[#faf6f3]"
            >
              Back to billing
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!clientSecret) {
    return null;
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <AddCardForm />
    </Elements>
  );
}
