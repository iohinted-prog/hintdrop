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

        {/* Microsoft sign-in temporarily hidden - button works and
            calls the correct code, but personal Microsoft accounts
            (Outlook/Hotmail/Live) are blocked by a real, confirmed
            bug in Supabase's built-in azure provider: the OAuth flow
            completes successfully on Microsoft's side, then fails at
            our callback with "Error getting user profile from
            external provider" - a known, multi-year-old, still-open
            issue (supabase/auth#1549 and related). Work/school
            accounts likely still work fine (that path isn't affected
            by this bug), but showing one button that only works for
            some Microsoft accounts and not others, with no way to
            explain why in the UI, isn't a good experience - hiding
            both until either Supabase fixes it or a custom OIDC
            provider workaround gets built for personal accounts
            specifically. handleMicrosoftSignIn left intact -
            re-adding this button is a one-line change.
        <button
          type="button"
          onClick={handleMicrosoftSignIn}
          disabled={loadingProvider !== null}
          className="inline-flex h-12 w-full items-center justify-center rounded-full border border-[#ead8ce] bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-[#fff5f0] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loadingProvider === "azure"
            ? "Connecting Microsoft..."
            : "Continue with Microsoft"}
        </button>
        */}

        {/* Apple sign-in temporarily hidden again - fresh Services ID,
            key, and JWT all verified correct (see git history for the
            full rebuild), Feedback Assistant report filed, still
            waiting on Apple's side. handleAppleSignIn left intact -
            re-adding this button is a one-line change once it's
            confirmed working.
        <button
          type="button"
          onClick={handleAppleSignIn}
          disabled={loadingProvider !== null}
          className="inline-flex h-12 w-full items-center justify-center rounded-full border border-[#0f172a] bg-[#0f172a] px-5 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loadingProvider === "apple"
            ? "Connecting Apple..."
            : "Continue with Apple"}
        </button>
        */}

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
