"use client";

import { createClient } from "../../lib/supabase/client";

export default function GoogleAuthButtons({ variant = "hero-primary" }) {
  const supabase = createClient();

  const handleGoogleAuth = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "https://hinted.io/auth/callback",
      },
    });

    if (error) {
      console.error("Google sign-in error:", error.message);
    }
  };

  if (variant === "header-login") {
    return (
      <button
        type="button"
        onClick={handleGoogleAuth}
        className="shrink-0 text-[15px] font-semibold text-slate-800"
      >
        Log in
      </button>
    );
  }

  if (variant === "header-get-started") {
    return (
      <button
        type="button"
        onClick={handleGoogleAuth}
        className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-6 text-[15px] font-bold text-white shadow-lg"
      >
        Get started
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleGoogleAuth}
      className="inline-flex h-[54px] w-full items-center justify-center gap-3 rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-5 text-sm font-semibold text-white shadow-lg"
    >
      <span className="text-base">G</span>
      <span>Continue with Google</span>
    </button>
  );
}
