"use client";
import { useState } from "react";
import Link from "next/link";
import AuthModal from "./AuthModal";
import SocialLinks from "./SocialLinks";

function LogoMark() {
  return (
    // No colored badge/border wrapper — matches the new icon style
    // approved for the OG images (a rounded-square gradient badge used
    // to wrap the old icon here; removed for the same reason).
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand-icon-og.png" alt="" width={31} height={36} className="object-contain" />
  );
}

export default function PublicShell({ children }) {
  const [authOpen, setAuthOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[#fffaf7] text-slate-800 flex flex-col">
      <header className="border-b border-[#efe0d7] bg-[#fffaf7]/95 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto flex max-w-[1380px] items-center justify-between px-5 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-3">
            <LogoMark />
            <div className="font-nunito text-[22px] font-extrabold tracking-[-0.05em] text-slate-900">
              Hint<span className="text-[#ff875d]">Drop</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/gift-shop" className="hidden md:flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold text-slate-600 border border-[#ead8ce] hover:bg-[#fff5f0] transition">
              Gift Shop
            </Link>
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="inline-flex h-12 shrink-0 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-6 text-[15px] font-semibold text-slate-700 transition hover:bg-[#fff5f0]"
            >
              Sign in
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-[#efe0d7] py-8 px-5 text-center">
        <div className="flex flex-col items-center gap-4">
          <SocialLinks />
          <div className="flex items-center justify-center gap-6 text-[12px] text-slate-400 flex-wrap">
            <Link href="/terms" className="hover:text-slate-600 transition">Terms</Link>
            <Link href="/privacy" className="hover:text-slate-600 transition">Privacy</Link>
            <Link href="/contact" className="hover:text-slate-600 transition">Contact</Link>
            <Link href="/for-brands" className="hover:text-slate-600 transition">For Brands</Link>
            <span>© {new Date().getFullYear()} HintDrop™ LTD</span>
          </div>
        </div>
      </footer>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
