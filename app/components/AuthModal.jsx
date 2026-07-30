"use client";
import { useState } from "react";
import { createClient } from "../../lib/supabase/client";

function getBaseUrl() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_SITE_URL || "";
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim().toLowerCase());
}

function getErrorMessage(err, fallback) {
  console.error("Auth error:", err);
  const msg = err?.message;
  if (typeof msg === "string" && msg.trim() && msg.trim() !== "{}" && msg.trim() !== "[object Object]") {
    return msg;
  }
  return fallback;
}

export default function AuthModal({ open, onClose }) {
  const supabase = createClient();
  const [mode, setMode] = useState("signin"); // "signin" | "signup" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  if (!open) return null;

  function reset() {
    setEmail(""); setPassword(""); setConfirmPassword(""); setError(""); setMessage(""); setLoading(false); setMode("signin");
  }

  function handleClose() {
    reset();
    onClose?.();
  }

  async function handleGoogleSignIn() {
    setError(""); setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${getBaseUrl()}/auth/callback`,
          scopes: "https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/contacts.other.readonly",
        },
      });
      if (error) throw error;
    } catch (err) {
      setError(getErrorMessage(err, "Google sign in failed."));
      setLoading(false);
    }
  }

  async function redirectAfterAuth() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", user.id)
          .maybeSingle();
        if (typeof window !== "undefined") {
          window.location.href = profile?.onboarding_completed ? "/feed" : "/onboarding";
        }
        return;
      }
    } catch {
      // fall through to default below
    }
    if (typeof window !== "undefined") window.location.href = "/feed";
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setError(""); setMessage("");

    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { emailRedirectTo: `${getBaseUrl()}/auth/callback` },
        });
        if (error) throw error;
        if (data?.session) {
          handleClose();
          await redirectAfterAuth();
        } else if (data?.user && (data.user.identities?.length ?? 0) === 0) {
          // Supabase returns a user with no identities (and no error, by
          // design, to avoid email enumeration) when the email is already
          // registered. We surface a clear message anyway since HintDrop
          // is accepting that UX tradeoff deliberately.
          setError("That email is already in use. Try signing in instead.");
        } else {
          setMessage("Check your email to confirm your account, then come back and sign in.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) throw error;
        handleClose();
        await redirectAfterAuth();
      }
    } catch (err) {
      setError(getErrorMessage(err, "Something went wrong. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotSubmit(e) {
    e.preventDefault();
    setError(""); setMessage("");
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${getBaseUrl()}/auth/reset-password`,
      });
      if (error) throw error;
      setMessage("If that email has an account, a reset link is on its way. Check your inbox.");
    } catch (err) {
      setError(getErrorMessage(err, "Something went wrong. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-[400px] rounded-t-[28px] sm:rounded-[28px] bg-[#fffaf7] border border-[#efdcd2] shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <p className="text-[18px] font-semibold text-slate-900">
            {mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Sign in"}
          </p>
          <button type="button" onClick={handleClose}
            className="h-8 w-8 flex items-center justify-center rounded-full border border-[#ead8ce] text-slate-400">✕</button>
        </div>

        {mode !== "forgot" && (
          <>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full h-12 flex items-center justify-center rounded-full border border-[#ead8ce] bg-white text-[14px] font-semibold text-slate-700 transition hover:bg-[#fff5f0] disabled:cursor-not-allowed disabled:opacity-70"
            >
              Continue with Google
            </button>

            <div className="flex items-center gap-3 my-5">
              <div className="h-px flex-1 bg-[#ead8ce]" />
              <span className="text-[12px] text-slate-400">or</span>
              <div className="h-px flex-1 bg-[#ead8ce]" />
            </div>
          </>
        )}

        {mode === "forgot" ? (
          <form onSubmit={handleForgotSubmit} className="space-y-3">
            <p className="text-[13px] text-slate-500 -mt-1 mb-1">
              Enter your email and we'll send you a link to reset your password.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              required
              className="w-full h-12 rounded-[12px] border border-[#ead8ce] bg-white px-4 text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#ff875d]"
            />

            {error && (
              <p className="rounded-[14px] border border-[#f1d2c6] bg-[#fff4ef] px-4 py-2.5 text-[13px] text-[#b85c3e]">
                {error}
              </p>
            )}
            {message && (
              <p className="rounded-[14px] border border-[#cfe8d8] bg-[#f1faf4] px-4 py-2.5 text-[13px] text-[#3a7d55]">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[14px] font-bold text-white shadow-md transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
        ) : (
        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            className="w-full h-12 rounded-[12px] border border-[#ead8ce] bg-white px-4 text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#ff875d]"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={6}
            className="w-full h-12 rounded-[12px] border border-[#ead8ce] bg-white px-4 text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#ff875d]"
          />
          {mode === "signup" && (
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              required
              minLength={6}
              className="w-full h-12 rounded-[12px] border border-[#ead8ce] bg-white px-4 text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#ff875d]"
            />
          )}

          {mode === "signin" && (
            <div className="flex justify-end -mt-1">
              <button type="button" onClick={() => { setMode("forgot"); setError(""); setMessage(""); }} className="text-[12px] font-semibold text-[#ff875d]">
                Forgot password?
              </button>
            </div>
          )}

          {error && (
            <p className="rounded-[14px] border border-[#f1d2c6] bg-[#fff4ef] px-4 py-2.5 text-[13px] text-[#b85c3e]">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-[14px] border border-[#cfe8d8] bg-[#f1faf4] px-4 py-2.5 text-[13px] text-[#3a7d55]">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[14px] font-bold text-white shadow-md transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>
        )}

        <p className="mt-4 text-center text-[13px] text-slate-500">
          {mode === "signup" ? (
            <>Already have an account?{" "}
              <button type="button" onClick={() => { setMode("signin"); setError(""); setMessage(""); setConfirmPassword(""); }} className="font-semibold text-[#ff875d]">Sign in</button>
            </>
          ) : mode === "forgot" ? (
            <button type="button" onClick={() => { setMode("signin"); setError(""); setMessage(""); }} className="font-semibold text-[#ff875d]">← Back to sign in</button>
          ) : (
            <>Don't have an account?{" "}
              <button type="button" onClick={() => { setMode("signup"); setError(""); setMessage(""); }} className="font-semibold text-[#ff875d]">Sign up</button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
