"use client";
import { useState, useEffect } from "react";
import { createClient } from "../../lib/supabase/client";
import Link from "next/link";
import { recordProfileVisit } from "../../lib/recentProfiles";
import HintImage from "./HintImage";
import BoardPreviewGrid from "./BoardPreviewGrid";

function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function UserProfileModal({ userId, name, avatarUrl, initials, onClose, currentUserId, isContact, onAddContact }) {
  const supabase = createClient();
  const [boards, setBoards] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    recordProfileVisit(supabase, currentUserId, userId);
    async function load() {
      setLoading(true);
      const [{ data: profileData }, { data: boardRows }] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url, interests").eq("id", userId).maybeSingle(),
        supabase.from("hint_boards").select("id, title, is_default")
          .eq("user_id", userId).or("is_private.is.null,is_private.eq.false")
          .order("is_default", { ascending: false }).order("created_at", { ascending: true }),
      ]);
      setProfile(profileData);

      // Same pattern as HintsMenuClient's board menu — a count plus a
      // handful of preview images per board, not the full hint list
      const boardsWithPreviews = await Promise.all((boardRows || []).map(async (board) => {
        const [{ count }, { data: previewHints }] = await Promise.all([
          supabase.from("hints").select("id", { count: "exact", head: true })
            .eq("board_id", board.id).or("is_private.is.null,is_private.eq.false"),
          supabase.from("hints").select("id, image_url")
            .eq("board_id", board.id).or("is_private.is.null,is_private.eq.false")
            .order("position", { ascending: true }).limit(4),
        ]);
        return { ...board, hintCount: count || 0, previewHints: previewHints || [] };
      }));

      setBoards(boardsWithPreviews);
      setLoading(false);
    }
    load();
  }, [userId, currentUserId]);

  const displayName = profile?.full_name || name || "User";
  const displayAvatar = profile?.avatar_url || avatarUrl || null;
  const displayInitials = initials || getInitials(displayName);
  const interests = Array.isArray(profile?.interests) ? profile.interests : [];
  const isViewingOther = currentUserId && currentUserId !== userId;

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-[rgba(33,24,20,0.42)] backdrop-blur-sm min-[480px]:items-center min-[480px]:px-4" onClick={onClose}>
      <div className="flex w-full max-w-[640px] flex-col overflow-hidden rounded-t-[32px] border border-[#efdcd2] bg-white shadow-[0_28px_80px_rgba(75,45,30,0.18)] min-[480px]:rounded-[32px]"
        style={{ maxHeight: "90dvh" }} onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 border-b border-[#f2e5de] px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <Link href={"/profile/" + userId} onClick={onClose} className="flex items-center gap-4 hover:opacity-80 transition-opacity">
              {displayAvatar
                ? <HintImage src={displayAvatar} alt={displayName} width={56} height={56} className="rounded-full object-cover" fallbackClassName="hidden" />
                : <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-[#efcdbf] to-[#bb8168] text-[14px] font-bold text-white">{displayInitials}</div>
              }
              <div>
                <p className="text-[18px] font-semibold text-slate-900">{displayName}</p>
                {interests.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {interests.slice(0, 5).map(interest => (
                      <span key={interest} className="rounded-full bg-[#fff4ee] px-2.5 py-0.5 text-[11px] font-semibold text-[#df7b59]">{interest}</span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
            <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#efe0d7] text-slate-500 hover:bg-[#faf6f3]">X</button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-400">Loading...</div>
          ) : !isContact && isViewingOther ? (
            <div className="relative">
              <div className="grid grid-cols-2 gap-3 blur-sm pointer-events-none select-none">
                {[1,2,3,4].map(i => <div key={i} className="h-32 rounded-[20px] bg-[#f0e4dd]" />)}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <p className="text-sm font-semibold text-slate-700">Add as a contact to see their Hints</p>
                <button type="button" onClick={onAddContact} className="inline-flex h-10 items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-6 text-sm font-semibold text-white shadow-lg">Add contact</button>
              </div>
            </div>
          ) : boards.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">No public Hints lists yet.</div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {boards.map((board) => (
                <Link key={board.id} href={`/profile/${userId}?board=${board.id}`} onClick={onClose}
                  className="group flex flex-col overflow-hidden rounded-[20px] border border-[#f0dfd6] bg-white transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="bg-[#fdf5f0] p-0.5" style={{ aspectRatio: "16/9" }}>
                    <BoardPreviewGrid previewHints={board.previewHints} />
                  </div>
                  <div className="p-3">
                    <p className="text-[13px] font-semibold text-slate-900 truncate">{board.title}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {board.is_default ? "Personal" : "Hints for someone else"} · {board.hintCount} Hint{board.hintCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="px-4 pb-5 pt-2 shrink-0 border-t border-[#f2e5de]">
          <Link href={"/profile/" + userId} onClick={onClose}
            className="w-full h-11 flex items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[13px] font-semibold text-white shadow-lg">
            See full profile
          </Link>
        </div>
      </div>
    </div>
  );
}
