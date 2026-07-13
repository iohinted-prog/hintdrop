"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

function LogoMark() {
  return (
    <div className="relative flex h-11 w-11 items-center justify-center rounded-[16px] bg-gradient-to-b from-[#ffa47f] to-[#ff875d] text-white shadow-lg">
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

  const [inviteCount, setInviteCount] = useState(0);
  const [invites, setInvites] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [inviteActionId, setInviteActionId] = useState(null);
  const notifRef = useRef(null);

  const loadInviteCount = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const user = session.user;
    if (!user) return;
    const userEmail = user.email?.toLowerCase() || "";
    const [{ data: circleInvites }, { data: contactInvites }] = await Promise.all([
      supabase.from("circle_invites").select("id, invite_token, invite_name, user_id, created_at").or(`invited_user_id.eq.${user.id},invite_email_normalized.eq.${userEmail}`).eq("status", "pending"),
      supabase.from("contact_invites").select("id, invite_name, inviter_user_id, created_at").or(`invited_user_id.eq.${user.id},invite_email.eq.${userEmail}`).eq("status", "pending"),
    ]);
    const all = [
      ...(circleInvites || []).map(i => ({ ...i, source: "circle" })),
      ...(contactInvites || []).map(i => ({ ...i, source: "contact" })),
    ];
    // Fetch inviter names
    const ids = [...new Set(all.map(i => i.source === "circle" ? i.user_id : i.inviter_user_id).filter(Boolean))];
    let profileMap = {};
    if (ids.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids);
      profileMap = (profiles || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
    }
    const merged = all.map(i => ({ ...i, inviter: profileMap[i.source === "circle" ? i.user_id : i.inviter_user_id] || null }));
    setInvites(merged);
    setInviteCount(merged.length);
  }, [supabase]);

  useEffect(() => { loadInviteCount(); }, [loadInviteCount]);

  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleAcceptInvite(invite) {
    setInviteActionId(invite.id);
    try {
      if (invite.source === "contact") {
        await supabase.functions.invoke("accept-contact-invite", { body: { invite_id: invite.id } });
      } else {
        await supabase.functions.invoke("accept-circle-invite", { body: { token: invite.invite_token } });
      }
      await loadInviteCount();
    } finally {
      setInviteActionId(null);
    }
  }

  async function handleDeclineInvite(invite) {
    setInviteActionId(invite.id);
    try {
      if (invite.source === "contact") {
        await supabase.from("contact_invites").update({ status: "revoked" }).eq("id", invite.id);
      } else {
        await supabase.from("circle_invites").update({ status: "declined" }).eq("id", invite.id);
      }
      await loadInviteCount();
    } finally {
      setInviteActionId(null);
    }
  }

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

            <div className="relative" ref={notifRef}>
              <button type="button" onClick={() => setNotifOpen(prev => !prev)}
                className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white shadow-sm transition hover:bg-[#fff5f0]"
                aria-label="Notifications">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {inviteCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#f36f64] text-[10px] font-bold text-white">
                    {inviteCount > 9 ? "9+" : inviteCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-14 z-50 w-80 rounded-[22px] border border-[#efdcd2] bg-[#fffaf7] shadow-[0_20px_60px_rgba(88,46,31,0.15)] overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#f0e4dd]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Notifications</p>
                    <h3 className="mt-0.5 text-[17px] font-semibold text-slate-900">Pending invites</h3>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
                    {invites.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">No pending invites</p>
                    ) : invites.map(invite => (
                      <div key={invite.id} className={`rounded-[18px] border p-4 ${invite.source === "contact" ? "border-[#e6ddd7] bg-white" : "border-[#dce8d8] bg-[#f7fbf5]"}`}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#8aa587] to-[#4e684d] text-[11px] font-bold text-white overflow-hidden">
                            {invite.inviter?.avatar_url
                              ? <img src={invite.inviter.avatar_url} className="h-full w-full object-cover" alt="" />
                              : (invite.inviter?.full_name || invite.invite_name || "?").split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 truncate">{invite.inviter?.full_name || invite.invite_name || "Someone"}</p>
                            <p className="text-xs text-slate-500">{invite.source === "contact" ? "wants to connect" : "invited you to a circle"}</p>
                          </div>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${invite.source === "contact" ? "bg-[#f0f7ee] text-[#4e684d]" : "bg-[#2f3b2d] text-white"}`}>
                            {invite.source === "contact" ? "Contact" : "Circle"}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" disabled={inviteActionId === invite.id} onClick={() => handleAcceptInvite(invite)}
                            className="flex-1 h-9 rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] text-xs font-semibold text-white disabled:opacity-60">
                            {inviteActionId === invite.id ? "..." : "Accept"}
                          </button>
                          <button type="button" disabled={inviteActionId === invite.id} onClick={() => handleDeclineInvite(invite)}
                            className="flex-1 h-9 rounded-full border border-[#ead8ce] bg-white text-xs font-semibold text-slate-600 disabled:opacity-60">
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
