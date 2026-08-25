"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import PublicShell from "../../components/PublicShell";
import AuthModal from "../../components/AuthModal";
import HintImage from "../../components/HintImage";
import HintDetailModal from "../../components/HintDetailModal";
import { createClient } from "../../../lib/supabase/client";
import { trackShareEvent, recordShareContext } from "../../../lib/share";
import { recordBoardVisit } from "../../../lib/recentActivity";

export default function BoardPreviewClient({ boardId }) {
  const supabase = createClient();
  const [board, setBoard] = useState(null);
  const [hints, setHints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [signUpOpen, setSignUpOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedHint, setSelectedHint] = useState(null);

  useEffect(() => {
    recordShareContext("board", boardId);
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const { data: boardRow, error: boardError } = await supabase
        .from("hint_boards")
        .select("id, title, user_id, is_private, profiles(full_name, avatar_url)")
        .eq("id", boardId)
        .maybeSingle();

      if (boardError) {
        console.error("Board fetch failed:", boardError.message);
      }

      if (!boardRow) {
        setBoard(null);
        setLoading(false);
        return;
      }

      const { data: hintRows } = await supabase
        .from("hints")
        .select("id, title, image_url, retailer, numeric_price, currency, url, occasions, size, size_type, colour, starred")
        .eq("board_id", boardId)
        .or("is_private.is.null,is_private.eq.false")
        .order("position", { ascending: true });

      // Every hint here belongs to the same board owner — attach their
      // name/avatar once rather than needing a per-hint lookup, so the
      // detail modal can show who it's from
      const enrichedHints = (hintRows || []).map((h) => ({
        ...h,
        ownerName: boardRow.profiles?.full_name || null,
        ownerAvatarUrl: boardRow.profiles?.avatar_url || null,
      }));

      setBoard(boardRow);
      setHints(enrichedHints);
      if (user?.id) recordBoardVisit(supabase, user.id, boardId);
      setLoading(false);

      recordShareContext("board", boardId, boardRow.user_id);
      trackShareEvent(supabase, { eventType: "share_link_opened", subjectType: "board", subjectId: boardId, viewerUserId: user?.id });
    }
    load();
  }, [boardId]);

  async function handleSaveToCircle() {
    if (!currentUser || !board?.user_id || saved) return;
    setSaved("sending");
    await supabase.functions.invoke("send-contact-invite", {
      body: { target_user_id: board.user_id, name: board.profiles?.full_name || "" },
    });
    trackShareEvent(supabase, { eventType: "hint_saved_from_share", subjectType: "board", subjectId: boardId, viewerUserId: currentUser.id });
    setSaved(true);
  }

  const ownerName = board?.profiles?.full_name || "Someone";

  return (
    <PublicShell>
      <div className="mx-auto max-w-[900px] px-4 py-10">
        {loading ? (
          <p className="text-center text-sm text-slate-400 py-16">Loading...</p>
        ) : !board ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🎁</p>
            <p className="text-[18px] font-semibold text-slate-900">These Hints aren't available</p>
            <p className="mt-1 text-sm text-slate-500">It may be private, or no longer exists.</p>
            <Link href="/" className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-6 text-sm font-semibold text-white shadow-lg">
              Explore HintDrop
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="relative h-8 w-8 rounded-full overflow-hidden shrink-0">
                  <HintImage src={board.profiles?.avatar_url} alt={ownerName} fill sizes="32px" className="object-cover" fallbackClassName="text-sm" />
                </div>
                <p className="text-[13px] text-slate-500">Made by <span className="font-semibold text-slate-700">{ownerName}</span></p>
              </div>
              <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-slate-900">{board.title}</h1>

              <div className="mt-5 flex flex-col items-center gap-2.5 sm:flex-row sm:justify-center">
                <Link href={"/profile/" + board.user_id} className="h-11 flex items-center justify-center rounded-full border border-[#ead8ce] px-5 text-sm font-semibold text-slate-700 hover:bg-[#fff5f0]">
                  See {ownerName.split(" ")[0]}'s profile
                </Link>
                {currentUser ? (
                  <button type="button" onClick={handleSaveToCircle} disabled={Boolean(saved)}
                    className="h-11 flex items-center justify-center rounded-full border border-[#ead8ce] px-5 text-sm font-semibold text-slate-700 hover:bg-[#fff5f0] disabled:opacity-60">
                    {saved === "sending" ? "Sending request..." : saved ? "Request sent ✓" : `Add ${ownerName.split(" ")[0]} to your Circle`}
                  </button>
                ) : (
                  <button type="button" onClick={() => setSignUpOpen(true)} className="h-11 flex items-center justify-center rounded-full border border-[#ead8ce] px-5 text-sm font-semibold text-slate-700 hover:bg-[#fff5f0]">
                    Sign up to join {ownerName.split(" ")[0]}'s Circle
                  </button>
                )}
              </div>
            </div>

            {hints.length === 0 ? (
              <p className="mt-12 text-center text-sm text-slate-400">No Hints here yet.</p>
            ) : (
              <div className="mt-10 columns-2 gap-4 sm:columns-3">
                {hints.map((hint) => (
                  <button
                    type="button"
                    key={hint.id}
                    onClick={() => setSelectedHint(hint)}
                    className="mb-4 block w-full break-inside-avoid overflow-hidden rounded-[20px] border border-[#f0dfd6] bg-white text-left transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="relative w-full bg-[#fdf5f0]" style={{ aspectRatio: "4/3" }}>
                      <HintImage src={hint.image_url} alt={hint.title} fill className="object-cover" sizes="300px" fallbackClassName="text-3xl" />
                    </div>
                    <div className="p-3">
                      <p className="text-[13px] font-semibold text-slate-900 leading-tight line-clamp-2">{hint.title || "Hint"}</p>
                      {hint.retailer && <p className="mt-1 text-[11px] text-slate-400">{hint.retailer}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {selectedHint && (
        <HintDetailModal
          hint={selectedHint}
          onClose={() => setSelectedHint(null)}
          supabase={supabase}
          currentUserId={currentUser?.id}
          source="shared_board"
        />
      )}
      <AuthModal open={signUpOpen} onClose={() => setSignUpOpen(false)} initialMode="signup" />
    </PublicShell>
  );
}
