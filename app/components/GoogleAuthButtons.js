"use client";

import { useState } from "react";
import { createClient } from "../../lib/supabase/client";

export default function GoogleAuthButtons({ variant = "hero-primary" }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const isLogin = variant === "header-login";
  const nextPath = isLogin ? "/feed" : "/onboarding";

  const handleGoogleAuth = async () => {
    if (loading) return;

    setLoading(true);

    const origin = window.location.origin;
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        scopes: [
          "openid",
          "email",
          "profile",
          "https://www.googleapis.com/auth/contacts.readonly",
        ].join(" "),
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      console.error("Google sign-in error:", error.message);
      setLoading(false);
    }
  };

  if (variant === "header-login") {
    return (
      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={loading}
        className={`shrink-0 text-[15px] font-semibold ${
          loading ? "cursor-not-allowed text-slate-400" : "text-slate-800"
        }`}
      >
        {loading ? "Redirecting..." : "Log in"}
      </button>
    );
  }

  if (variant === "header-get-started") {
    return (
      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={loading}
        className={`inline-flex h-12 shrink-0 items-center justify-center rounded-full px-6 text-[15px] font-bold text-white shadow-lg ${
          loading
            ? "cursor-not-allowed bg-[#e9a48d]"
            : "bg-gradient-to-b from-[#ff966f] to-[#ff7e54]"
        }`}
      >
        {loading ? "Redirecting..." : "Get started"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleGoogleAuth}
      disabled={loading}
      className={`inline-flex h-[54px] w-full items-center justify-center gap-3 rounded-full px-5 text-sm font-semibold text-white shadow-lg ${
        loading
          ? "cursor-not-allowed bg-[#e9a48d]"
          : "bg-gradient-to-b from-[#ff946d] to-[#f36f64]"
      }`}
    >
      <span className="text-base">G</span>
      <span>{loading ? "Redirecting..." : "Continue with Google"}</span>
    </button>
  );
}
