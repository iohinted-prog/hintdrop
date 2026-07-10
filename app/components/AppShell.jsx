"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

function LogoMark() {
  return (
    <svg width="44" height="44" viewBox="0 0 200 190" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="HintDrop">
      <defs>
        <linearGradient id="hdG1" x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0%" stopColor="#ffb899"/>
          <stop offset="100%" stopColor="#ff8f6b"/>
        </linearGradient>
      </defs>
      <rect x="18" y="12" width="152" height="148" rx="34" fill="url(#hdG1)"/>
      <path d="M28 140 Q10 165 4 178 Q36 166 56 148 Z" fill="#ff9a72"/>
      <rect x="55" y="82" width="82" height="52" rx="5" fill="white" opacity="0.93"/>
      <rect x="49" y="69" width="94" height="19" rx="5" fill="white" opacity="0.93"/>
      <rect x="93" y="69" width="10" height="65" rx="3" fill="#ff7a55" opacity="0.85"/>
      <rect x="49" y="74" width="94" height="10" rx="3" fill="#ff7a55" opacity="0.85"/>
      <path d="M97 65 Q80 47 70 53 Q64 59 80 67 Z" fill="#ff7a55"/>
      <path d="M97 65 Q114 47 124 53 Q130 59 114 67 Z" fill="#ff7a55"/>
      <circle cx="97" cy="65" r="6" fill="#ff5e3a"/>
      <line x1="158" y1="18" x2="168" y2="7" stroke="#ff7a55" strokeWidth="4" strokeLinecap="round"/>
      <line x1="172" y1="34" x2="185" y2="29" stroke="#ff7a55" strokeWidth="4" strokeLinecap="round"/>
      <line x1="173" y1="52" x2="186" y2="55" stroke="#ff7a55" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );

  );
}

function getMetadataName(metadata = {}) {
  return (
    metadata.full_name ||
    metadata.name ||
    [metadata.given_name, metadata.family_name].filter(Boolean).join(" ") ||
    ""
  ).trim();
}

function getMetadataAvatar(metadata = {}) {
  return metadata.avatar_url || metadata.picture || "";
}

function getInitials(fullName = "", email = "") {
  const source = fullName.trim() || email.trim();

  if (!source) {
    return "U";
  }

  const parts = source.split(/\s+|@|[._-]/).filter(Boolean);

  return (
    parts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U"
  );
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const supabase = createClient();
  const menuRef = useRef(null);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = useMemo(() => getInitials(fullName, email), [fullName, email]);

  const hideChrome =
    pathname === "/" ||
    pathname === "/home" ||
    pathname === "/gift-shop" ||
    pathname === "/onboarding" ||
    pathname.startsWith("/gift-shop/");

  const showShell = !hideChrome;

  useEffect(() => {
    if (!showShell) {
      return;
    }

    let activeListener = true;

    async function loadHeaderProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !activeListener) {
        return;
      }

      const metadata = user.user_metadata || {};
      const metadataName = getMetadataName(metadata);
      const metadataAvatar = getMetadataAvatar(metadata);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (!activeListener) {
        return;
      }

      setEmail(user.email || "");
      setFullName(profile?.full_name || metadataName || "");
      setAvatarUrl(profile?.avatar_url || metadataAvatar || "");
    }

    loadHeaderProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadHeaderProfile();
    });

    return () => {
      activeListener = false;
      subscription.unsubscribe();
    };
  }, [supabase, showShell]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (!showShell) {
    return <>{children}</>;
  }

  const navItems = [
    { href: "/feed", label: "Feed" },
    { href: "/hints", label: "Hints" },
    { href: "/circles", label: "Circles" },
    { href: "/shop", label: "Shop" },
  ];

  return (
    <div className="min-h-screen bg-[#fffaf7] text-slate-800">
      <header className="border-b border-[#efe0d7] bg-[#fffaf7]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1380px] items-center justify-between px-5 py-4 md:px-8">
          <Link href="/feed" className="flex items-center gap-3.5">
            <LogoMark />
            <div className="text-[22px] font-extrabold tracking-[-0.05em] text-slate-900">
              Hint<span className="text-[#ff875d]">Drop</span>
            </div>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <nav className="flex items-center gap-2 sm:gap-3">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      isActive
                        ? "inline-flex h-11 items-center justify-center rounded-full border border-[#ffb38f] bg-[#ff875d] px-4 text-[14px] font-semibold text-white shadow-sm transition hover:bg-[#f47145] sm:px-5"
                        : "inline-flex h-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-4 text-[14px] font-semibold text-slate-700 transition hover:bg-[#fff5f0] sm:px-5"
                    }
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                aria-label="Open account menu"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((prev) => !prev)}
                className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-[#ead8ce] bg-white shadow-sm transition hover:bg-[#fff5f0]"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Your profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-[12px] font-bold text-slate-700">
                    {initials}
                  </span>
                )}
              </button>

              {menuOpen ? (
                <div className="absolute right-0 z-50 mt-3 w-[220px] overflow-hidden rounded-[22px] border border-[#ead8ce] bg-white p-2 shadow-[0_18px_50px_rgba(173,101,72,0.18)]">
                  <div className="rounded-[18px] bg-[#fff8f4] px-3 py-3">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {fullName || "Your account"}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {email || "Signed in"}
                    </p>
                  </div>

                  <div className="mt-2 flex flex-col">
                    <Link
                      href="/settings"
                      className="rounded-[16px] px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-[#fff5f0]"
                    >
                      Settings
                    </Link>
                    <Link
                      href="/account"
                      className="rounded-[16px] px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-[#fff5f0]"
                    >
                      Account
                    </Link>
                    <Link
                      href="/billing"
                      className="rounded-[16px] px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-[#fff5f0]"
                    >
                      Billing
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-[#eaded6] bg-[#fffaf7]">
        <div className="mx-auto flex max-w-[1380px] flex-col gap-4 px-5 py-6 text-sm text-slate-500 md:px-8 lg:flex-row lg:items-center lg:justify-between">
          <p className="max-w-[720px] text-xs leading-5 text-slate-500 lg:text-sm">
            By continuing, you agree to{" "}
            <Link
              href="/terms"
              className="font-medium text-slate-700 underline underline-offset-2 transition hover:text-slate-900"
            >
              Terms
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="font-medium text-slate-700 underline underline-offset-2 transition hover:text-slate-900"
            >
              Privacy Policy
            </Link>
            .
          </p>

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <Link href="/about" className="transition hover:text-slate-900">
              About
            </Link>
            <Link href="/for-brands" className="transition hover:text-slate-900">
              For Brands
            </Link>
            <Link href="/contact" className="transition hover:text-slate-900">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
