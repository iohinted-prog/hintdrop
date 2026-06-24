"use client";

import { useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";

function getBaseUrl() {
  const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (typeof window !== "undefined") {
    const origin = window.location?.origin || "";
    const hostname = window.location?.hostname || "";

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return origin || "http://localhost:3000";
    }

    if (envSiteUrl) {
      return envSiteUrl.endsWith("/") ? envSiteUrl.slice(0, -1) : envSiteUrl;
    }

    return origin || "http://localhost:3000";
  }

  if (envSiteUrl) {
    return envSiteUrl.endsWith("/") ? envSiteUrl.slice(0, -1) : envSiteUrl;
  }

  return "http://localhost:3000";
}

function buildRedirectTo(nextPath = "/onboarding") {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`;
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

  async function handleSocialSignIn(provider) {
    try {
      setPageError("");
      setLoadingProvider(provider);
      rememberProvider(provider);

      const redirectTo = buildRedirectTo("/onboarding");

      const options = {
        redirectTo,
      };

      if (provider === "azure") {
        options.scopes = "email";
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options,
      });

      if (error) throw error;
    } catch (error) {
      if (provider === "google") {
        setPageError(error?.message || "Google sign in failed.");
      } else if (provider === "azure") {
        setPageError(error?.message || "Microsoft sign in failed.");
      } else {
        setPageError(error?.message || "Sign in failed.");
      }

      setLoadingProvider(null);
    }
  }

  function handleGoogleSignIn() {
    return handleSocialSignIn("google");
  }

  function handleMicrosoftSignIn() {
    return handleSocialSignIn("azure");
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
          {loadingProvider === "google" ? "Connecting Google..." : "Continue with Google"}
        </button>

        <button
          type="button"
          onClick={handleMicrosoftSignIn}
          disabled={loadingProvider !== null}
          className="inline-flex h-12 w-full items-center justify-center rounded-full border border-[#ead8ce] bg-white px-5 text-sm font-semibold text-slate-800 transition hover:bg-[#f8f5f2] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loadingProvider === "azure"
            ? "Connecting Microsoft..."
            : "Continue with Microsoft"}
        </button>

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
