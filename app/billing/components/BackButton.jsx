
"use client";

import { useRouter } from "next/navigation";

export default function BackButton({ fallback = "/" }) {
  const router = useRouter();

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallback);
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="inline-flex items-center gap-2 rounded-full border border-[#ead8ce] bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-[#fff5f0]"
    >
      ← Back
    </button>
  );
}
