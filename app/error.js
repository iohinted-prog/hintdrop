"use client";
import { useEffect } from "react";

export default function Error({ error, reset }) {
  useEffect(() => {
    // Auto-reload once on first error
    const reloaded = sessionStorage.getItem("error-reloaded");
    if (!reloaded) {
      sessionStorage.setItem("error-reloaded", "1");
      window.location.reload();
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#fffaf7] flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="text-4xl">🎁</div>
      <h2 className="text-[20px] font-semibold text-slate-900">Something went wrong</h2>
      <p className="text-[14px] text-slate-500">Tap reload to try again.</p>
      <button
        onClick={() => { sessionStorage.removeItem("error-reloaded"); reset(); }}
        className="mt-2 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-6 py-2.5 text-[14px] font-semibold text-white">
        Reload
      </button>
    </div>
  );
}
