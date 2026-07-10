"use client";
import { useEffect } from "react";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";

export default function AuthCodeError() {
  useEffect(() => {
    // Clear any broken session state
    const supabase = createClient();
    supabase.auth.signOut();
  }, []);

  return (
    <main className="min-h-screen bg-[#fffaf7] flex items-center justify-center px-4">
      <div className="w-full max-w-[480px] text-center">
        <div className="text-4xl mb-4">🎁</div>
        <h1 className="text-[28px] font-semibold tracking-[-0.04em] text-slate-900">
          Something went wrong
        </h1>
        <p className="mt-3 text-[15px] leading-7 text-slate-500">
          We could not complete your sign in. Please try again.
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-sm font-semibold text-white shadow-lg"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
