"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import PublicShell from "../../components/PublicShell";
import AuthModal from "../../components/AuthModal";
import HintImage from "../../components/HintImage";
import HintDetailModal from "../../components/HintDetailModal";
import ShareButton from "../../components/ShareButton";
import { createClient } from "../../../lib/supabase/client";
import { trackShareEvent, recordShareContext } from "../../../lib/share";
import { recordBoardVisit } from "../../../lib/recentActivity";

function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatMonthYear(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function loadRatio(src) {
  return new Promise(res => {
    const img = new window.Image();
    img.onload = () => res(img.naturalWidth / img.naturalHeight);
    img.onerror = () => res(null);
    img.src = src;
  });
}

export default function BoardPreviewClient({ boardId }) {
  const supabase = createClient();
  const [board, setBoard] = useState(null);
  const [hints, setHints] = useState([]);
  const [imageRatios, setImageRatios] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [signUpOpen, setSignUpOpen] = useState(false);
  const [contactState, setContactState] = useState("none"); // "none" | "pending" | "active"
  const [contactSince, setContactSince] = useState(null);
  const [addingContact, setAddingContact] = useState(false);
  const [addContactError, setAddContactError] = useState("");
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

      if (user && user.id !== boardRow.user_id) {
        const { data: contactData } = await supabase.from("contacts")
          .select("id, status, created_at").eq("user_id", user.id).eq("profile_id", boardRow.user_id).maybeSingle();
        setContactState(contactData ? (contactData.status === "active" ? "active" : "pending") : "none");
        setContactSince(contactData?.created_at || null);
      }

      if (user?.id) recordBoardVisit(supabase, user.id, boardId);
      setLoading(false);

      recordShareContext("board", boardId, boardRow.user_id);
      trackShareEvent(supabase, { eventType: "share_link_opened", subjectType: "board", subjectId: boardId, viewerUserId: user?.id });

      const ratios = {};
      await Promise.all(enrichedHints.filter(h => h.image_url).map(async h => {
        const r = await loadRatio(h.image_url).catch(() => null);
        if (r) ratios[h.id] = r;
      }));
      setImageRatios(ratios);
    }
    load();
  }, [boardId]);

  async function handleAddToCircle() {
    if (!currentUser || !board?.user_id) return;
    setAddingContact(true);
    setAddContactError("");
    // Same request/accept flow as every other way of adding a contact —
    // creates the contact on both sides plus syncs birthdays to both
    // calendars once accepted, rather than a one-sided instant add.
    const { error } = await supabase.functions.invoke("send-contact-invite", {
      body: { target_user_id: board.user_id, name: board.profiles?.full_name || "" },
    });
    if (error) {
      setAddContactError("Could not send the request. Try again.");
    } else {
      setContactState("pending");
      trackShareEvent(supabase, { eventType: "hint_saved_from_share", subjectType: "board", subjectId: boardId, viewerUserId: currentUser.id });
    }
    setAddingContact(false);
  }

  const ownerName = board?.profiles?.full_name || "Someone";
  const isOwnBoard = currentUser?.id === board?.user_id;

  return (
    <PublicShell>
      {!loading && board && (
        <div className="border-b border-[#f0dfd6] bg-white px-4 py-4 sm:px-8">
          <div className="mx-auto max-w-[1200px] flex items-center gap-4">
            <Link href="/feed" className="h-9 w-9 flex items-center justify-center rounded-full border border-[#ead8ce] text-slate-500 hover:bg-[#fff5f0] shrink-0"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 5l-7 7 7 7"/></svg></Link>
            <div className="ml-auto shrink-0">
              <ShareButton
                supabase={supabase}
                subjectType="board"
                subjectId={boardId}
                path={`/b/${boardId}`}
                title={board.title}
                sharerName={ownerName}
                currentUserId={currentUser?.id}
                label="Share"
                className="h-9 flex items-center gap-1.5 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-3.5 text-[13px] font-semibold text-white shadow-md hover:brightness-105"
              />
            </div>
            <Link href={`/profile/${board.user_id}`} className="shrink-0">
              {board.profiles?.avatar_url
                ? <HintImage src={board.profiles.avatar_url} alt={ownerName} width={56} height={56} className="rounded-full object-cover border-2 border-[#f0dfd6]" fallbackClassName="hidden" />
                : <div className="h-14 w-14 rounded-full bg-gradient-to-b from-[#efcdbf] to-[#bb8168] flex items-center justify-center text-[16px] font-bold text-white">{getInitials(ownerName)}</div>
              }
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/profile/${board.user_id}`} className="hover:underline">
                <h1 className="text-[22px] font-semibold tracking-[-0.04em] text-slate-900">{board.title}</h1>
              </Link>
              <p className="text-[12px] text-slate-400 mt-0.5">By {ownerName}</p>
              {!isOwnBoard && currentUser && (
                <button type="button" onClick={contactState === "none" ? handleAddToCircle : undefined}
                  disabled={addingContact || contactState !== "none"}
                  className={`mt-2 text-[12px] font-semibold px-3 py-1 rounded-full border transition ${
                    contactState === "active" ? "border-[#c3e0c3] bg-[#f0faf0] text-[#3a7a3a] cursor-default"
                    : contactState === "pending" ? "border-[#f0dfc9] bg-[#fff8ee] text-[#a87d3a] cursor-default"
                    : "border-[#ead8ce] bg-white text-slate-600 hover:bg-[#fff5f0] hover:border-[#ff875d] hover:text-[#ff875d]"
                  }`}>
                  {contactState === "active" ? `✓ In your circle since ${formatMonthYear(contactSince)}` : contactState === "pending" ? "Request sent — we'll let you know once accepted" : addingContact ? "Sending..." : "+ Add to circle"}
                </button>
              )}
              {!isOwnBoard && !currentUser && (
                <button type="button" onClick={() => setSignUpOpen(true)} className="mt-2 inline-flex text-[12px] font-semibold px-3 py-1 rounded-full border border-[#ead8ce] bg-white text-slate-600 hover:bg-[#fff5f0] hover:border-[#ff875d] hover:text-[#ff875d] transition">
                  Sign up to join {ownerName.split(" ")[0]}'s Circle
                </button>
              )}
              {addContactError && <p className="mt-1 text-[11px] text-[#b14f43]">{addContactError}</p>}
            </div>
          </div>
        </div>
      )}

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
            {hints.length === 0 ? (
              <p className="mt-2 text-center text-sm text-slate-400">No Hints here yet.</p>
            ) : (
              <div className="mt-2 columns-2 gap-4 sm:columns-3">
                {hints.map((hint) => (
                  <button
                    type="button"
                    key={hint.id}
                    onClick={() => setSelectedHint(hint)}
                    className="mb-4 block w-full break-inside-avoid overflow-hidden rounded-[20px] border border-[#f0dfd6] bg-white text-left transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="relative w-full bg-[#fdf5f0]" style={hint.image_url ? (imageRatios[hint.id] ? { aspectRatio: String(imageRatios[hint.id]) } : { aspectRatio: "3/4" }) : { aspectRatio: "4/3" }}>
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

