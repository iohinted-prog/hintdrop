"use client";

import { useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";

function getBaseUrl() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_SITE_URL || "";
}

function buildRedirectTo() {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/auth/callback`;
}

function rememberProvider(provider) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem("hinted_auth_provider", provider);
  } catch (_) {}
}

export default function GoogleAuthButtons({ variant = "hero-primary" }) {
  const supabase = useMemo(() => createClient(), []);
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [pageError, setPageError] = useState("");

  async function handleGoogleSignIn() {
    try {
      setPageError("");
      setLoadingProvider("google");
      rememberProvider("google");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: buildRedirectTo(),
          scopes: "https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/contacts.other.readonly",
        },
      });

      if (error) throw error;
    } catch (error) {
      setPageError(error?.message || "Google sign in failed.");
      setLoadingProvider(null);
    }
  }

  // Required alongside Google/Microsoft per App Store Review Guideline 4.8 -
  // any app offering third-party social login must also offer Sign in with
  // Apple as an equivalent option. Uses the same web OAuth redirect flow as
  // Google/Microsoft above (rather than a native SDK-based flow) since
  // that's already how every other provider authenticates inside the
  // Capacitor-wrapped app too - consistent with the existing pattern rather
  // than a special case for just this one provider.
  async function handleAppleSignIn() {
    try {
      setPageError("");
      setLoadingProvider("apple");
      rememberProvider("apple");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: buildRedirectTo(),
        },
      });

      if (error) throw error;
    } catch (error) {
      setPageError(error?.message || "Apple sign in failed.");
      setLoadingProvider(null);
    }
  }

  async function handleMicrosoftSignIn() {
    try {
      setPageError("");
      setLoadingProvider("azure");
      rememberProvider("azure");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: {
          scopes: "email",
          redirectTo: buildRedirectTo(),
        },
      });

      if (error) throw error;
    } catch (error) {
      setPageError(error?.message || "Microsoft sign in failed.");
      setLoadingProvider(null);
    }
  }

  if (variant === "hero-primary") {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loadingProvider !== null}
          className="inline-flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-5 text-sm font-bold text-white shadow-lg transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loadingProvider === "google"
            ? "Connecting Google..."
            : "Continue with Google"}
        </button>

        {/* Apple sign-in temporarily hidden - working correctly on our
            side (JWT, Client ID, App ID, domain/return URL all verified
            correct), but Apple's own servers are returning invalid_client
            for reasons outside our control - a documented, known class of
            Apple-side bug specifically affecting newly-created/edited
            Sign in with Apple configurations (confirmed via Apple's own
            developer forums - other developers hitting the identical
            symptom with fully-verified-correct setups, sometimes
            resolving on its own after days, sometimes needing Apple's
            engineering team to intervene). handleAppleSignIn left intact
            below - re-adding this button once it's confirmed working
            again is a one-line change, not a rebuild. */}

        {pageError ? (
          <p className="rounded-[18px] border border-[#f1d2c6] bg-[#fff4ef] px-4 py-3 text-sm text-[#b85c3e]">
            {pageError}
          </p>
        ) : null}
      </div>
    );
  }

  if (variant === "header-login") {
    return (
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loadingProvider !== null}
        className="inline-flex h-12 shrink-0 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-6 text-[15px] font-semibold text-slate-700 transition hover:bg-[#fff5f0] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loadingProvider === "google" ? "Connecting..." : "Log in"}
      </button>
    );
  }

  if (variant === "header-get-started") {
    return (
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loadingProvider !== null}
        className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-6 text-[15px] font-bold text-white shadow-lg transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loadingProvider === "google" ? "Connecting..." : "Get started"}
      </button>
    );
  }

  return null;
}
