"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

function LogoMark() {
  return (
    <div className="relative flex h-11 w-11 items-center justify-center rounded-[16px] border border-[#efc4b2] bg-gradient-to-b from-[#ffa47f] to-[#ff875d] text-white shadow-lg">
      <span className="text-lg">🎁</span>
    </div>
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
              Hinted<span className="text-[#ff875d]">.io</span>
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
