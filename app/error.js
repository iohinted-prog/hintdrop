"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Error({ error, reset }) {
  // A second occurrence after the automatic reload below means the
  // error is genuinely repeatable (not a transient blip a reload
  // would fix), so show what actually happened instead of a fake
  // "Loading..." forever with no way out - previously this just
  // silently stuck, disguised as a loading state, on any error that
  // survived one reload. Confirmed a real problem, not theoretical:
  // this is exactly what happened when the non-URL hint-idea flow
  // threw an error - no way to tell what had gone wrong, no path
  // back except manually retyping the URL.
  const [showDetails] = useState(() => {
    if (typeof window === "undefined") return false;
    const reloaded = sessionStorage.getItem("error-reloaded");
    if (reloaded) {
      sessionStorage.removeItem("error-reloaded");
      return true;
    }
    return false;
  });

  useEffect(() => {
    if (showDetails) return;
    sessionStorage.setItem("error-reloaded", "1");
    window.location.reload();
  }, [showDetails]);

  if (!showDetails) {
    return (
      <div className="min-h-screen bg-[#fffaf7] flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-4xl">🎁</div>
        <p className="text-[15px] text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fffaf7] flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="text-4xl">🎁</div>
      <p className="text-[17px] font-semibold text-slate-900">Something went wrong.</p>
      <p className="max-w-[440px] text-[14px] leading-6 text-slate-500 break-words">
        {error?.message || "An unexpected error occurred."}
      </p>
      {error?.digest ? (
        <p className="text-[11px] text-slate-400">Error ID: {error.digest}</p>
      ) : null}
      <div className="mt-2 flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Try again
        </button>
        <Link
          href="/feed"
          className="rounded-full border border-[#ead8ce] bg-white px-5 py-2.5 text-sm font-semibold text-slate-700"
        >
          Go to Feed
        </Link>
      </div>
    </div>
  );
}
