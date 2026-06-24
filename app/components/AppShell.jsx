"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AvatarMenu from "./AvatarMenu";

function LogoMark() {
  return (
    <div className="relative flex h-11 w-11 items-center justify-center rounded-[16px] border border-[#efc4b2] bg-gradient-to-b from-[#ffa47f] to-[#ff875d] text-white shadow-lg">
      <span className="text-lg">🎁</span>
    </div>
  );
}

const navItems = [
  { href: "/feed", label: "Feed" },
  { href: "/hints", label: "Hints" },
  { href: "/circles", label: "Circles" },
  { href: "/shop", label: "Shop" },
];

function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-[#efe0d7] bg-[#fffaf7]/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1380px] items-center justify-between px-5 py-4 md:px-8">
        <Link href="/feed" className="flex items-center gap-3.5">
          <LogoMark />
          <div className="text-[22px] font-extrabold tracking-[-0.05em] text-slate-900">
            Hinted<span className="text-[#f36f64]">.io</span>
          </div>
        </Link>

        <div className="flex items-center gap-3 sm:gap-4">
          <nav className="flex items-center gap-2 sm:gap-3">
            {navItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex h-11 items-center justify-center rounded-full px-4 text-[14px] font-semibold sm:px-5 ${
                    isActive
                      ? "border border-[#3c4d39] bg-[#2f3b2d] text-white"
                      : "border border-[#ead8ce] bg-white text-slate-700 hover:bg-[#fff5f0]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <AvatarMenu />
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-[#efe0d7] bg-[#fffaf7]">
      <div className="mx-auto max-w-[1380px] px-5 py-6 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">Hinted.io</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Thoughtful gifting, reminders, circles, and curated shopping.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs leading-5 text-slate-500">
            <a
              href="mailto:iohinted@gmail.com"
              className="font-medium text-slate-700 underline underline-offset-2"
            >
              Contact
            </a>

            <Link
              href="/for-brands"
              className="font-medium text-slate-700 underline underline-offset-2"
            >
              For brands
            </Link>

            <Link
              href="/privacy"
              className="font-medium text-slate-700 underline underline-offset-2"
            >
              Privacy Policy
            </Link>

            <Link
              href="/terms"
              className="font-medium text-slate-700 underline underline-offset-2"
            >
              Terms
            </Link>
          </div>
        </div>

        <div className="mt-4 border-t border-[#efe0d7] pt-4">
          <p className="text-xs leading-5 text-slate-500">
            By continuing, you agree to Hinted’s{" "}
            <Link
              href="/terms"
              className="font-medium text-slate-700 underline underline-offset-2"
            >
              Terms
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="font-medium text-slate-700 underline underline-offset-2"
            >
              Privacy Policy
            </Link>
            .
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-400">
            © 2026 Hinted.io. All rights reserved.
          </p>
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
