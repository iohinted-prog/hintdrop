"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function LogoMark() {
  return (
    <div className="relative flex h-11 w-11 items-center justify-center rounded-[16px] bg-gradient-to-b from-[#ffa47f] to-[#ff875d] text-white shadow-lg">
      <span className="text-lg">🎁</span>
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="border-b border-[#efe0d7] bg-[#fffaf7]/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1380px] items-center justify-between px-5 py-4 md:px-8">
        <Link href="/feed" className="flex items-center gap-3.5">
          <LogoMark />
          <div className="text-[22px] font-extrabold tracking-[-0.05em] text-slate-900">
            Hinted<span className="text-[#f36f64]">.io</span>
          </div>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          <Link href="/feed" className="inline-flex h-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-4 text-[14px] font-semibold text-slate-700 hover:bg-[#fff5f0] sm:px-5">
            Feed
          </Link>
          <Link href="/hints" className="inline-flex h-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-4 text-[14px] font-semibold text-slate-700 hover:bg-[#fff5f0] sm:px-5">
            Hints
          </Link>
          <Link href="/circles" className="inline-flex h-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-4 text-[14px] font-semibold text-slate-700 hover:bg-[#fff5f0] sm:px-5">
            Circles
          </Link>
          <Link href="/shop" className="inline-flex h-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-4 text-[14px] font-semibold text-slate-700 hover:bg-[#fff5f0] sm:px-5">
            Shop
          </Link>
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-[#efe0d7] bg-[#fffaf7]">
      <div className="mx-auto flex max-w-[1380px] flex-col items-center justify-between gap-3 px-5 py-6 text-sm text-slate-500 md:flex-row md:px-8">
        <p>© 2026 Hinted.io</p>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-slate-700">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-slate-700">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}

export default function AppShell({ children }) {
  const pathname = usePathname();

  const hideChrome = pathname === "/";

  if (hideChrome) {
    return children;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#fffaf7] text-slate-800">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
