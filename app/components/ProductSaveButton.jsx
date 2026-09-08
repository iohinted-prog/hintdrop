"use client";

import { useState } from "react";
import AuthModal from "./AuthModal";

// Matches the existing "Sign in to save" behaviour on /gift-shop-uk
// and /gift-shop-us (GiftShopClient.jsx) exactly - always opens the
// auth modal on click, rather than checking auth state first. That's
// consistent with the rest of the signed-out shop surface, not a new
// pattern introduced here.
export default function ProductSaveButton({ label = "Save to hints" }) {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAuthOpen(true)}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[16px] border border-[#f1dfd6] bg-white px-6 text-[14px] font-semibold text-slate-700 hover:border-[#e37b57] hover:text-[#e37b57] sm:w-auto"
      >
        {label}
      </button>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
