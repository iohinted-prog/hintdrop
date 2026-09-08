"use client";
import Link from "next/link";

// No reload-then-show-details state machine anymore - that added a
// layer of timing complexity (sessionStorage, when exactly the
// reload completes, whether a fast-repeating error could retrigger
// a second reload before the first one's state was ever visible)
// that made this genuinely hard to reason about and, per direct
// testing, didn't reliably behave as "first time reloads, second
// time shows details" at all - sometimes got stuck on what should
// have been the very first occurrence. Simplified to the only
// version with zero ambiguity: every error shows its real message
// immediately, every time, full stop.
export default function Error({ error, reset }) {
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
