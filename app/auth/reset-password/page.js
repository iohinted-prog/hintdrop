"use client";
import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      setHasSession(!!session);
      setChecking(false);
    });
    return () => { active = false; };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => {
        if (typeof window !== "undefined") window.location.href = "/feed";
      }, 1800);
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fffaf7] flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-[400px] rounded-[28px] bg-white border border-[#efdcd2] shadow-xl p-6">
        <p className="text-[18px] font-semibold text-slate-900 mb-5">Set a new password</p>

        {checking ? (
          <p className="text-sm text-slate-400">Checking your reset link...</p>
        ) : !hasSession ? (
          <>
            <p className="rounded-[14px] border border-[#f1d2c6] bg-[#fff4ef] px-4 py-3 text-[13px] text-[#b85c3e] mb-4">
              This reset link is invalid or has expired. Request a new one from the sign-in screen.
            </p>
            <a href="/" className="inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-6 text-[13px] font-semibold text-white">
              Back to HintDrop
            </a>
          </>
        ) : done ? (
          <p className="rounded-[14px] border border-[#cfe8d8] bg-[#f1faf4] px-4 py-3 text-[13px] text-[#3a7d55]">
            Password updated. Taking you to your feed...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              required
              minLength={6}
              className="w-full h-12 rounded-[12px] border border-[#ead8ce] bg-white px-4 text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#ff875d]"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              minLength={6}
              className="w-full h-12 rounded-[12px] border border-[#ead8ce] bg-white px-4 text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#ff875d]"
            />

            {error && (
              <p className="rounded-[14px] border border-[#f1d2c6] bg-[#fff4ef] px-4 py-2.5 text-[13px] text-[#b85c3e]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[14px] font-bold text-white shadow-md transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Saving..." : "Save new password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
