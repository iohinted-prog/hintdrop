"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";

export default function AvatarMenu() {
  const supabase = createClient();

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
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-neutral-200"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={fullName || "User avatar"}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-sm font-medium">{initials}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl border border-neutral-200 bg-white p-2 shadow-lg">
          <Link href="/profile" className="block rounded-lg px-3 py-2 hover:bg-neutral-100">
            Profile
          </Link>
          <Link href="/settings" className="block rounded-lg px-3 py-2 hover:bg-neutral-100">
            Settings
          </Link>
        </div>
      )}
    </div>
  );
}
