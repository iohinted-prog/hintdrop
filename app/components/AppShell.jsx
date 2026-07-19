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
  const [currentUserId, setCurrentUserId] = useState(null);

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
        setCurrentUserId(user.id);
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
  const [activityNotifs, setActivityNotifs] = useState([]);
  const [invites, setInvites] = useState([]);
  const [circleNotifs, setCircleNotifs] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [inviteActionId, setInviteActionId] = useState(null);
  const [notifActionId, setNotifActionId] = useState(null);
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
    // Load activity notifications (reactions, comments)
      const { data: notifData } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(20);
      setActivityNotifs(notifData || []);

    // Load circle notifications for organiser
    const { data: cnData } = await supabase
      .from("circle_notifications")
      .select("*")
      .eq("organiser_id", user.id)
      .eq("acted_on", false)
      .order("created_at", { ascending: false });
    const cn = cnData || [];
    setCircleNotifs(cn);
    setInvites(merged);
    setInviteCount(merged.length + cn.length + (notifData?.length || 0));
  }, [supabase]);

  useEffect(() => {
    loadInviteCount();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(loadInviteCount, 30000);
    return () => clearInterval(interval);
  }, [loadInviteCount]);

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

  async function handleCircleNotifAction(notif, action) {
    setNotifActionId(notif.id);
    try {
      if (action === "cancel") {
        await supabase.from("circles").update({ status: "cancelled" }).eq("id", notif.circle_id);
      }
      await supabase.from("circle_notifications").update({ acted_on: true }).eq("id", notif.id);
      await loadInviteCount();
    } finally {
      setNotifActionId(null);
    }
  }

  async function handleDeclineInvite(invite) {
    setInviteActionId(invite.id);
    try {
      if (invite.source === "contact") {
        await supabase.from("contact_invites").update({ status: "revoked" }).eq("id", invite.id);
      } else {
        await supabase.from("circle_invites").update({ status: "declined" }).eq("id", invite.id);
        supabase.functions.invoke("notify-circle-decline", { body: { invite_id: invite.id } }).catch(() => {});
      }
      await loadInviteCount();
    } finally {
      setInviteActionId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#fffaf7] text-slate-800">
      <header className="border-b border-[#efe0d7] bg-[#fffaf7]/95 backdrop-blur relative z-[100]">
        <div className="mx-auto flex max-w-[1380px] items-center justify-between px-5 py-4 md:px-8">
          <Link href="/feed" className="flex items-center gap-3.5">
            <LogoMark />
            <div className="text-[22px] font-extrabold tracking-[-0.05em] text-slate-900">
              Hint<span className="text-[#ff875d]">Drop</span>
            </div>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <nav className="hidden md:flex items-center justify-center gap-1">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                const icons = { "/feed": "🏠", "/hints": "🎁", "/circles": "⭕", "/shop": "🛍️" };
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-[13px] font-semibold transition ${
                      isActive
                        ? "bg-[#ff875d] text-white shadow-sm"
                        : "text-slate-500 hover:bg-[#fff5f0] hover:text-slate-800"
                    }`}
                  >
                    <span>{icons[item.href]}</span>
                    <span>{item.label}</span>
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
                    {activityNotifs.map(notif => (
                      <div key={notif.id} className="rounded-[18px] border border-[#e6ddd7] bg-white p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#efcdbf] to-[#bb8168] text-[11px] font-bold text-white overflow-hidden">
                            {notif.data?.actor_avatar_url
                              ? <img src={notif.data.actor_avatar_url} className="h-full w-full object-cover" alt="" />
                              : (notif.data?.actor_name || "?")[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 truncate">{notif.title}</p>
                            {notif.body && <p className="text-xs text-slate-500 truncate mt-0.5">{notif.body}</p>}
                          </div>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${notif.type === "reaction" ? "bg-[#fff4ee] text-[#df7b59]" : "bg-[#eef4ff] text-[#5676b3]"}`}>
                            {notif.type === "reaction" ? "React" : "Comment"}
                          </span>
                        </div>
                        <button type="button"
                          onClick={async () => {
                            await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", notif.id);
                            setActivityNotifs(prev => prev.filter(n => n.id !== notif.id));
                            setInviteCount(prev => Math.max(0, prev - 1));
                          }}
                          className="mt-2 text-[11px] text-slate-400 hover:text-slate-600">
                          Mark as read
                        </button>
                      </div>
                    ))}
                    {circleNotifs.map(notif => (
                      <div key={notif.id} className="rounded-[18px] border border-[#fde0d0] bg-[#fff4f2] p-4">
                        <p className="text-sm font-semibold text-slate-900 mb-1">Circle update</p>
                        <p className="text-xs text-slate-500 mb-3">{notif.message}</p>
                        <div className="flex gap-2">
                          <button type="button" disabled={notifActionId === notif.id}
                            onClick={() => handleCircleNotifAction(notif, "continue")}
                            className="flex-1 h-8 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[11px] font-semibold text-white disabled:opacity-60">
                            {notifActionId === notif.id ? "..." : "Keep going"}
                          </button>
                          <button type="button" disabled={notifActionId === notif.id}
                            onClick={() => handleCircleNotifAction(notif, "cancel")}
                            className="flex-1 h-8 rounded-full border border-[#efc0ba] bg-white text-[11px] font-semibold text-[#b14f43] disabled:opacity-60">
                            Cancel circle
                          </button>
                        </div>
                      </div>
                    ))}
                    {invites.length === 0 && circleNotifs.length === 0 ? (
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
                <div className="absolute right-0 z-50 mt-3 w-[220px] overflow-hidden rounded-[22px] border border-[#ead8ce] bg-white p-2 shadow-[0_18px_50px_rgba(173,101,72,0.18)] z-[100]">
                  <div className="rounded-[18px] bg-[#fff8f4] px-3 py-3">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {fullName || "Your account"}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {email || "Signed in"}
                    </p>
                  </div>

          <div className="mt-2 flex flex-col">
            {currentUserId && (
              <Link href={"/profile/" + currentUserId} className="rounded-[16px] px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-[#fff5f0]">Profile</Link>
            )}
            <Link href="/settings" className="rounded-[16px] px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-[#fff5f0]">Settings</Link>
            <Link href="/account" className="rounded-[16px] px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-[#fff5f0]">Account</Link>
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

      {/* Mobile bottom tab bar */}
      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden items-center justify-around border-t border-[#efe0d7] bg-[#fffaf7]/95 backdrop-blur-sm px-2 pb-2">
        <a href="/feed" className={`flex flex-col items-center gap-0.5 px-3 py-2 ${pathname === "/feed" ? "text-[#ff875d]" : "text-slate-400"}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span className="text-[10px] font-semibold">Home</span>
        </a>
        <a href="/people" className={`flex flex-col items-center gap-0.5 px-3 py-2 ${pathname === "/people" ? "text-[#ff875d]" : "text-slate-400"}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>
          <span className="text-[10px] font-semibold">Circle</span>
        </a>
        <a href="/hints" className="flex flex-col items-center gap-0.5 px-2 -mt-3">
          <div className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] shadow-lg shadow-[#ff7e54]/40 text-2xl ${pathname === "/hints" ? "ring-2 ring-[#ff875d] ring-offset-2" : ""}`}>
            🎁
          </div>
          <span className={`text-[10px] font-semibold mt-0.5 ${pathname === "/hints" ? "text-[#ff875d]" : "text-slate-400"}`}>Hints</span>
        </a>
        <a href="/calendar" className={`flex flex-col items-center gap-0.5 px-3 py-2 ${pathname === "/calendar" ? "text-[#ff875d]" : "text-slate-400"}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span className="text-[10px] font-semibold">Calendar</span>
        </a>
        <a href="/shop" className={`flex flex-col items-center gap-0.5 px-3 py-2 ${pathname === "/shop" ? "text-[#ff875d]" : "text-slate-400"}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          <span className="text-[10px] font-semibold">Shop</span>
        </a>
      </nav>
      <div className="h-20 md:hidden" />
    </div>
  );
}
