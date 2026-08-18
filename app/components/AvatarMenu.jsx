"use client";

import Link from "next/link";
import HintImage from "./HintImage";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "../../lib/supabase/client";

export default function AvatarMenu() {
  const supabase = createClient();
  const menuRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || ignore) return;

      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .single();

      if (!ignore && data) {
        setFullName(data.full_name || "");
        setAvatarUrl(data.avatar_url || "");
      }
    }

    loadProfile();

    return () => {
      ignore = true;
    };
  }, [supabase]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const initials = useMemo(() => {
    if (!fullName) return "U";

    return fullName
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [fullName]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-neutral-200"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open account menu"
      >
        {avatarUrl ? (
          <HintImage
            src={avatarUrl}
            alt={fullName || "User avatar"}
            fill
            sizes="40px"
            className="object-cover"
            fallbackClassName="hidden"
          />
        ) : (
          <span className="text-sm font-medium">{initials}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl border border-neutral-200 bg-white p-2 shadow-lg">
          <Link href="/account" className="block rounded-lg px-3 py-2 hover:bg-neutral-100">
            Account
          </Link>
          <Link href="/settings" className="block rounded-lg px-3 py-2 hover:bg-neutral-100">
            Settings
          </Link>
        </div>
      )}
    </div>
  );
}
