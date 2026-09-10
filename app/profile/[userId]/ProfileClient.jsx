"use client";
import PublicShell from "../../components/PublicShell";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";
import GroupHintModal from "../../components/GroupHintModal";
import { trackRetailerClick } from "../../../lib/trackRetailerClick";
import HintImage from "../../components/HintImage";
import BoardPreviewGrid from "../../components/BoardPreviewGrid";
import ShareButton from "../../components/ShareButton";
import AuthModal from "../../components/AuthModal";
import { recordShareContext } from "../../../lib/share";
import { recordBoardVisit } from "../../../lib/recentActivity";
import { recordHintView } from "../../../lib/recentHints";

function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function loadRatio(src) {
  return new Promise(res => {
    const img = new window.Image();
    img.onload = () => res(img.naturalWidth / img.naturalHeight);
    img.onerror = () => res(null);
    img.src = src;
  });
}

function daysUntilBirthday(birthday) {
  if (!birthday) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const bday = new Date(birthday);
  const next = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return Math.round((next - today) / (1000 * 60 * 60 * 24));
}

const GRADIENTS = [
  "from-[#d9dfcf] via-[#b9c7aa] to-[#90a27e]",
  "from-[#ead8ca] via-[#dbc0a8] to-[#c4a17f]",
  "from-[#efe5de] via-[#e5d2c8] to-[#d1b2a4]",
  "from-[#d5dbee] via-[#b3c0df] to-[#8f9fc9]",
  "from-[#eadce8] via-[#d8bfd1] to-[#bb9ab6]",
];

export default function ProfileClient({ userId }) {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [boards, setBoards] = useState(null); // null = not loaded yet
  // Set only when a ?board= link points at a private board not in
  // `boards` (which deliberately excludes private ones from the menu) -
  // holds just enough of that board's own row for the header/share
  // title to resolve correctly without adding it to the visible menu.
  const [directBoard, setDirectBoard] = useState(null);
  const [selectedBoardId, setSelectedBoardId] = useState(null);
  const [boardHintsLoading, setBoardHintsLoading] = useState(false);
  const [hints, setHints] = useState([]);
  const [claims, setClaims] = useState([]);
  const [imageRatios, setImageRatios] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [filter, setFilter] = useState("default");
  const [filterPopupOpen, setFilterPopupOpen] = useState(false);
  const [occasionFilter, setOccasionFilter] = useState("");
  const [claimingId, setClaimingId] = useState(null);
  const [contactState, setContactState] = useState("none"); // "none" | "pending" | "active"
  const [collabStatus, setCollabStatus] = useState("none"); // "none" | "pending" | "accepted"
  const [collabStatusLoading, setCollabStatusLoading] = useState(true);
  const [requestingCollab, setRequestingCollab] = useState(false);
  const [collabRequestError, setCollabRequestError] = useState("");
  const [contactSince, setContactSince] = useState(null);
  const [selectedHint, setSelectedHint] = useState(null);
  const [groupHint, setGroupHint] = useState(null);
  const [inviteConfirmation, setInviteConfirmation] = useState(null);

  useEffect(() => {
    async function load() {
      // getSession() reads from local storage and resolves almost
      // instantly — getUser() re-validates against Supabase's auth server
      // over the network, which matters for anything security-sensitive
      // but was the reason this page's signed-in-vs-signed-out chrome
      // decision visibly flickered on load. Set the fast local read first
      // so the correct header renders immediately, then confirm/replace
      // with the authoritative check once it resolves.
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setCurrentUser(session.user);
      setAuthChecked(true);

      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      recordShareContext("profile", userId, userId);

      // Uses an RPC rather than a direct table select — birthday is only
      // ever returned by this function when the caller has an active
      // contact relationship with this profile, enforced at the database
      // level (not just hidden in the UI, which a direct API call could
      // bypass). Returns a single-row array since it's a table function.
      const requestedBoardId = searchParams.get("board");

      const [{ data: profileRows, error: profileRpcError }, { data: boardRows }, directBoardResult] = await Promise.all([
        supabase.rpc("get_public_profile", { target_id: userId }),
        supabase.from("hint_boards")
          .select("id, title, is_default")
          .eq("user_id", userId).or("is_private.is.null,is_private.eq.false")
          .order("is_default", { ascending: false }).order("created_at", { ascending: true }),
        // Speculatively fetched in parallel with everything else,
        // rather than only after discovering the requested id isn't
        // in the public list - that used to be a third, fully
        // sequential round trip tacked onto the end of the whole
        // load, adding real wall-clock time to every shared-board
        // visit (the common case for this page) even when it turns
        // out not to be needed.
        requestedBoardId
          ? supabase.from("hint_boards").select("id, title, is_default, is_private").eq("id", requestedBoardId).eq("user_id", userId).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      let profileData = profileRows?.[0] || null;
      // Fall back to a direct select if the RPC itself isn't available yet
      // (e.g. the migration creating it hasn't been run) — better to show
      // the right name/avatar without the birthday-privacy enforcement
      // than to silently show neither at all.
      if (!profileData && profileRpcError) {
        console.error("get_public_profile RPC failed, falling back to direct select:", profileRpcError.message);
        const { data: fallbackProfile } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, interests")
          .eq("id", userId)
          .maybeSingle();
        profileData = fallbackProfile;
      }
      setProfile(profileData);

      const boardsWithPreviews = await Promise.all(
        (boardRows || []).map(async (board) => {
          const [{ count }, { data: previewHints }] = await Promise.all([
            supabase.from("hints").select("id", { count: "exact", head: true }).eq("board_id", board.id),
            supabase.from("hints").select("image_url").eq("board_id", board.id).order("position", { ascending: true }).limit(4),
          ]);
          return { ...board, hintCount: count || 0, previewHints: previewHints || [] };
        })
      );
      setBoards(boardsWithPreviews);

      if (user && user.id !== userId) {
        const { data: contactData } = await supabase.from("contacts")
          .select("id, status, created_at").eq("user_id", user.id).eq("profile_id", userId).maybeSingle();
        setContactState(contactData ? (contactData.status === "active" ? "active" : "pending") : "none");
        setContactSince(contactData?.created_at || null);
      }

      // A ?board= link (e.g. from Feed's "Jump back in", or the new /b/
      // redirect) should land directly in that specific list — anything
      // else always shows the menu first, even for a single-board
      // profile, so "see profile" consistently means the same thing
      // rather than sometimes skipping straight past it.
      //
      // This must also work for a private board someone was sent a
      // direct link to — the boardRows query above deliberately
      // excludes private boards (so they never show up in the general
      // menu list), so a private board's id genuinely isn't in
      // boardsWithPreviews. The link itself is the access control here
      // (unguessable id, only shared deliberately) rather than the
      // board being visible to anyone browsing the menu, so a
      // separate, explicit-id lookup is correct precisely because it
      // bypasses the privacy filter only for the one id actually
      // requested, not for browsing.
      let requestedBoardValid = requestedBoardId && boardsWithPreviews.some((b) => b.id === requestedBoardId);

      if (requestedBoardId && !requestedBoardValid && directBoardResult?.data) {
        requestedBoardValid = true;
        setDirectBoard(directBoardResult.data);
      }

      if (requestedBoardValid) {
        setSelectedBoardId(requestedBoardId);
      }

      // Only now - after selectedBoardId/directBoard are already set,
      // not before - does the skeleton come down. Clearing loading
      // earlier meant the real header rendered for a moment with no
      // board selected yet (showing the generic "{name}'s Hints" title
      // as if no board were requested), then immediately re-rendered
      // with the real board title once these finished a beat later.
      setLoading(false);
    }
    load();
  }, [userId]);

  useEffect(() => {
    if (!selectedBoardId) return;
    let cancelled = false;
    async function loadBoardHints() {
      setBoardHintsLoading(true);
      if (currentUser?.id) recordBoardVisit(supabase, currentUser.id, selectedBoardId);
      const { data: hintsData } = await supabase
        .from("hints")
        .select("id, title, image_url, numeric_price, currency, retailer, url, starred, occasions, position, size, size_type, colour")
        .eq("board_id", selectedBoardId).or("is_private.is.null,is_private.eq.false")
        .order("position", { ascending: true }).order("created_at", { ascending: false }).limit(100);
      if (cancelled) return;
      const hintsList = hintsData || [];
      setHints(hintsList);
      if (currentUser && currentUser.id !== userId && hintsList.length) {
        const { data: claimsData } = await supabase.from("hint_claims")
          .select("id, hint_id, claimed_by, claim_type")
          .in("hint_id", hintsList.map(h => h.id));
        if (!cancelled) setClaims(claimsData || []);
      }
      // Measure image aspect ratios BEFORE revealing the cards, not
      // after - doing it after meant the skeleton disappeared and
      // cards appeared at a default aspect ratio, then visibly
      // resized once ratios came in a moment later, on top of each
      // image's own normal load time. Keeping the skeleton up through
      // this step means cards appear already correctly sized.
      const ratios = {};
      await Promise.all(hintsList.filter(h => h.image_url).map(async h => {
        const r = await loadRatio(h.image_url).catch(() => null);
        if (r) ratios[h.id] = r;
      }));
      if (cancelled) return;
      setImageRatios(ratios);
      setBoardHintsLoading(false);
    }
    loadBoardHints();
    return () => { cancelled = true; };
  }, [selectedBoardId]);

  useEffect(() => {
    setCollabStatus("none");
    if (!selectedBoardId || !currentUser || currentUser.id === userId) {
      setCollabStatusLoading(false);
      return;
    }
    setCollabStatusLoading(true);
    let cancelled = false;
    supabase.from("board_collaborators")
      .select("status")
      .eq("board_id", selectedBoardId)
      .eq("user_id", currentUser.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setCollabStatus(data?.status || "none");
        setCollabStatusLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedBoardId, currentUser, userId]);

  async function handleRequestCollab() {
    if (!currentUser || !selectedBoardId || requestingCollab) return;
    setRequestingCollab(true);
    setCollabRequestError("");
    const { error } = await supabase.from("board_collaborators").insert({
      board_id: selectedBoardId,
      user_id: currentUser.id,
      status: "pending",
      requested_by: currentUser.id,
    });
    setRequestingCollab(false);
    if (error) {
      setCollabRequestError(error.message);
      return;
    }
    setCollabStatus("pending");
    console.log("[collab] insert succeeded, about to fetch collab-notify", { selectedBoardId, requesterId: currentUser.id });

    // Email and the in-app bell notification are both created here in
    // one call (the route fetches the requester's own profile itself)
    // - see the route for why the bell insert moved out of the
    // separate /api/notifications/create path.
    fetch("/api/collab-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "request", boardId: selectedBoardId, requesterId: currentUser.id }),
    }).then(async (res) => {
      const body = await res.json().catch(() => null);
      console.log("[collab] collab-notify response", res.status, body);
      if (!res.ok || body?.notifError) {
        console.error("collab-notify issue:", res.status, body);
      }
    }).catch(console.error);
  }

  async function handleToggleClaim(hint) {
    if (!currentUser || currentUser.id === userId) return;
    const myClaim = claims.find(c => c.hint_id === hint.id && c.claimed_by === currentUser.id);
    if (myClaim) {
      setClaims(prev => prev.filter(c => c.id !== myClaim.id));
      await supabase.from("hint_claims").delete().eq("id", myClaim.id);
    } else {
      const tempId = crypto.randomUUID();
      setClaims(prev => [...prev, { id: tempId, hint_id: hint.id, claimed_by: currentUser.id, claim_type: "solo" }]);
      const { error } = await supabase.from("hint_claims").insert({ hint_id: hint.id, claimed_by: currentUser.id, claim_type: "solo" });
      if (error) setClaims(prev => prev.filter(c => c.id !== tempId));
    }
  }

  const allOccasions = [...new Set(hints.flatMap(h => h.occasions || []))].filter(Boolean);
  const isViewingOther = currentUser && currentUser.id !== userId;

  const filteredHints = hints
    .filter(h => {
      if (filter === "starred") return h.starred;
      if (occasionFilter) return (h.occasions || []).includes(occasionFilter);
      return true;
    })
    .sort((a, b) => {
      const aP = a.numeric_price || 0, bP = b.numeric_price || 0;
      const aHas = aP > 0, bHas = bP > 0;
      if (filter === "price_low") { if (aHas && !bHas) return -1; if (!aHas && bHas) return 1; return aP - bP; }
      if (filter === "price_high") { if (aHas && !bHas) return -1; if (!aHas && bHas) return 1; return bP - aP; }
      if (filter === "starred") return (b.starred ? 1 : 0) - (a.starred ? 1 : 0);
      return (a.position ?? 999) - (b.position ?? 999);
    });

  const [addingContact, setAddingContact] = useState(false);
  const [addContactError, setAddContactError] = useState("");
  const [signUpOpen, setSignUpOpen] = useState(false);

  // Clears both the board-selection state and the ?board= URL param
  // together — the existing back-link only ever cleared the state,
  // leaving the URL out of sync with what was on screen (harmless until
  // someone refreshes or re-shares from that exact moment, at which point
  // it would silently jump back into the board that was just left).
  function goToMenu() {
    if (!selectedBoardId) return;
    setSelectedBoardId(null);
    router.push(`/profile/${userId}`, { scroll: false });
  }

  async function handleDeleteBoard(board) {
    if (board.is_default) return;
    const confirmed = window.confirm(
      `Delete "${board.title}"? This removes the list and everything saved in it (${board.hintCount} hint${board.hintCount === 1 ? "" : "s"}). This can't be undone.`
    );
    if (!confirmed) return;

    try {
      const { error: deleteError } = await supabase.from("hint_boards").delete().eq("id", board.id);
      if (deleteError) throw deleteError;
      setBoards((prev) => (prev || []).filter((b) => b.id !== board.id));
      if (selectedBoardId === board.id) setSelectedBoardId(null);
    } catch (err) {
      alert(err?.message || "Couldn't delete this list. Try again.");
    }
  }

  async function handleAddToCircle() {
    if (!currentUser) return;
    setAddingContact(true);
    setAddContactError("");
    // Goes through the same request/accept flow as every other way of
    // adding a contact — send-contact-invite already supports target_user_id
    // directly (no email needed since we already know who this is), and
    // accepting creates the contact on BOTH sides plus syncs birthdays to
    // both calendars. A raw insert here would have skipped all of that.
    const { error } = await supabase.functions.invoke("send-contact-invite", {
      body: { target_user_id: userId, name: profile?.full_name || "" },
    });
    if (error) {
      setAddContactError("Could not send the request. Try again.");
    } else {
      setContactState("pending");
    }
    setAddingContact(false);
  }

  const isOwnProfile = currentUser?.id === userId;

  const displayName = profile?.full_name || "User";
  const interests = Array.isArray(profile?.interests) ? profile.interests : [];
  // Falls back to directBoard when the selected board is a privately-
  // shared one not present in the (deliberately public-only) boards
  // menu list.
  const selectedBoardData = selectedBoardId
    ? boards?.find((b) => b.id === selectedBoardId) || directBoard
    : null;

  const inner = (
    <main className="min-h-screen bg-[#fffaf7]">
      {(loading || collabStatusLoading) ? (
        <div className="border-b border-[#f0dfd6] bg-white px-4 py-3 sm:px-8 sm:py-4">
          <div className="mx-auto max-w-[1200px] animate-pulse">
            <div className="flex items-center justify-between gap-3">
              <div className="h-9 w-9 rounded-full bg-[#f0e4dd]" />
              <div className="h-9 w-24 rounded-full bg-[#f0e4dd]" />
            </div>
            <div className="mt-3 flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-[#f0e4dd] shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="h-5 w-40 rounded-full bg-[#f0e4dd]" />
                <div className="h-4 w-24 rounded-full bg-[#f0e4dd]" />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <div className="h-10 flex-1 rounded-full bg-[#f0e4dd]" />
              <div className="h-10 flex-1 rounded-full bg-[#f0e4dd]" />
            </div>
          </div>
        </div>
      ) : (
      <div className="border-b border-[#f0dfd6] bg-white px-4 py-3 sm:px-8 sm:py-4">
        <div className="mx-auto max-w-[1200px]">
          {/* Row 1: back on the left, Share + Filter (icon-only) grouped
              on the right. Add to circle / Request collaboration moved
              out of this row entirely - they're about the identity
              block below, not page-level actions, and reads cleaner
              placed there instead of crowding this row. */}
          <div className="flex items-center justify-between gap-3">
            <Link href="/feed" className="h-9 w-9 flex items-center justify-center rounded-full border border-[#ead8ce] text-slate-500 hover:bg-[#fff5f0] shrink-0"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 5l-7 7 7 7"/></svg></Link>

            <div className="flex items-center gap-2">
              <ShareButton
                supabase={supabase}
                subjectType={selectedBoardId ? "board" : "profile"}
                subjectId={selectedBoardId || userId}
                path={selectedBoardId ? `/b/${selectedBoardId}` : `/profile/${userId}`}
                title={selectedBoardId ? selectedBoardData?.title : `${displayName}'s Hints`}
                text={selectedBoardId
                  ? `${displayName}'s hint: "${selectedBoardData?.title}"`
                  : `Check out ${displayName}'s Hints on HintDrop`}
                currentUserId={currentUser?.id}
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                }
                label="Share"
                className="h-9 flex items-center gap-1.5 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-3.5 text-[13px] font-semibold text-white shadow-md hover:brightness-105 shrink-0"
              />
              {selectedBoardId && (
                <button
                  type="button"
                  onClick={() => setFilterPopupOpen(true)}
                  aria-label="Filter"
                  className={`h-9 w-9 flex items-center justify-center rounded-full border shrink-0 transition ${
                    filter !== "default" || occasionFilter
                      ? "border-[#ff875d] bg-[#fff4ee] text-[#ff875d]"
                      : "border-[#ead8ce] bg-white text-slate-600 hover:bg-[#fff5f0]"
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
                </button>
              )}
            </div>
          </div>

          {/* Row 2: identity - avatar + name/status/interests. Avatar
              stays side-by-side with the text rather than stacking, a
              56px avatar isn't what was eating the space - the filter
              bar competing for room in the same row was. */}
          <div className="mt-3 flex items-center gap-4">
            {profile?.avatar_url
              ? <button type="button" onClick={goToMenu} className={selectedBoardId ? "cursor-pointer" : "cursor-default"}>
                  <HintImage src={profile.avatar_url} alt={displayName} width={56} height={56} className="rounded-full object-cover border-2 border-[#f0dfd6] shrink-0" fallbackClassName="hidden" />
                </button>
              : <button type="button" onClick={goToMenu} className={`h-14 w-14 rounded-full bg-gradient-to-b from-[#efcdbf] to-[#bb8168] flex items-center justify-center text-[16px] font-bold text-white shrink-0 ${selectedBoardId ? "cursor-pointer" : "cursor-default"}`}>{getInitials(displayName)}</button>
            }
            <div className="flex-1 min-w-0">
              <button type="button" onClick={goToMenu} className={`block text-left ${selectedBoardId ? "cursor-pointer hover:underline" : "cursor-default"}`}>
                <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.04em] text-slate-900">
                  {selectedBoardId && selectedBoardData && !selectedBoardData.is_default
                    ? selectedBoardData.title
                    : `${displayName}'s Hints`}
                </h1>
              </button>
              {(!selectedBoardId || selectedBoardData?.is_default) && interests.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {interests.slice(0, 6).map(i => <span key={i} className="rounded-full bg-[#fff4ee] px-2.5 py-0.5 text-[11px] font-semibold text-[#df7b59]">{i}</span>)}
                </div>
              )}
            </div>
          </div>

          {/* Row 3: relationship actions - add to circle and (on a
              specific board) request collaboration, as an equal-weight
              pair rather than one buried in the text column and the
              other crammed into row 1. */}
          {!isOwnProfile && currentUser && (
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={contactState === "none" ? handleAddToCircle : undefined}
                disabled={addingContact || contactState !== "none"}
                className={`flex-1 h-10 flex items-center justify-center gap-1.5 text-[13px] font-semibold rounded-full border transition ${
                  contactState === "active" ? "border-[#c3e0c3] bg-[#f0faf0] text-[#3a7a3a] cursor-default"
                  : contactState === "pending" ? "border-[#f0dfc9] bg-[#fff8ee] text-[#a87d3a] cursor-default"
                  : "border-transparent bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-white shadow-md hover:brightness-105"
                }`}>
                {contactState === "active" ? "✓ In your circle" : contactState === "pending" ? "Request sent" : addingContact ? "Sending..." : "+ Add to circle"}
              </button>
              {selectedBoardId && !selectedBoardData?.is_default && (
                <div className="relative flex-1">
                  {collabStatusLoading ? (
                    <div className="h-10 w-full rounded-full bg-[#f0e4dd] animate-pulse" />
                  ) : collabStatus === "accepted" ? (
                    <Link href={`/hints/${selectedBoardId}`} className="h-10 w-full flex items-center justify-center gap-1.5 rounded-full border border-[#bfe4cf] bg-[#e3f5ea] text-[13px] font-semibold text-[#2f8a5f] hover:brightness-105">
                      ✏️ Add or edit hints
                    </Link>
                  ) : collabStatus === "pending" ? (
                    <span className="h-10 w-full flex items-center justify-center gap-1.5 rounded-full border border-[#bfe4cf] bg-[#e3f5ea] text-[13px] font-semibold text-[#2f8a5f]">
                      ✓ Request sent
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRequestCollab}
                      disabled={requestingCollab}
                      className="h-10 w-full flex items-center justify-center gap-1.5 rounded-full border border-[#ead8ce] bg-white text-[13px] font-semibold text-slate-600 hover:bg-[#fff5f0] disabled:opacity-60"
                    >
                      👥 {requestingCollab ? "Sending..." : "Request to collaborate"}
                    </button>
                  )}
                  {collabRequestError && (
                    <p className="absolute top-full left-0 mt-1 text-[11px] text-[#b14f43] whitespace-nowrap">{collabRequestError}</p>
                  )}
                </div>
              )}
            </div>
          )}
          {!isOwnProfile && !currentUser && (
            <button type="button" onClick={() => setSignUpOpen(true)} className="mt-3 inline-flex text-[12px] font-semibold px-3 py-1 rounded-full border border-[#ead8ce] bg-white text-slate-600 hover:bg-[#fff5f0] hover:border-[#ff875d] hover:text-[#ff875d] transition">
              Sign up to join {displayName.split(" ")[0]}'s Circle
            </button>
          )}
          {addContactError && <p className="mt-1 text-[11px] text-[#b14f43]">{addContactError}</p>}
          {contactState === "active" && (() => {
            const days = daysUntilBirthday(profile?.birthday);
            if (days === null || days > 30) return null;
            return (
              <p className="mt-1.5 text-[12px] font-semibold text-[#df7b59]">
                🎂 {days === 0 ? "Birthday is today!" : days === 1 ? "Birthday is tomorrow" : `Birthday in ${days} days`}
              </p>
            );
              })()}
        </div>
      </div>
      )}

      {selectedBoardId && filterPopupOpen && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-[rgba(33,24,20,0.42)] backdrop-blur-sm min-[480px]:items-center min-[480px]:px-4" onClick={() => setFilterPopupOpen(false)}>
          <div className="flex w-full max-w-[420px] flex-col overflow-hidden rounded-t-[32px] border border-[#efdcd2] bg-white shadow-[0_28px_80px_rgba(75,45,30,0.18)] min-[480px]:rounded-[32px]"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-4 border-b border-[#f2e5de] px-6 py-5">
              <h2 className="text-[18px] font-semibold text-slate-900">Filter hints</h2>
              <button type="button" onClick={() => setFilterPopupOpen(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#efe0d7] text-slate-500 hover:bg-[#faf6f3]">✕</button>
            </div>
            <div className="px-6 py-5">
              <div className="flex flex-wrap gap-2">
                {["default","starred","price_low","price_high"].map(f => (
                  <button key={f} type="button" onClick={() => { setFilter(f); setOccasionFilter(""); }}
                    className={`h-9 px-4 rounded-full text-[13px] font-semibold transition ${filter === f && !occasionFilter ? "bg-[#ff875d] text-white" : "border border-[#ead8ce] bg-white text-slate-600 hover:bg-[#fff5f0]"}`}>
                    {f === "default" ? "All" : f === "starred" ? "⭐ Favourites" : f === "price_low" ? "Price ↑" : "Price ↓"}
                  </button>
                ))}
              </div>
              {allOccasions.length > 0 && (
                <div className="mt-4">
                  <label className="block text-[12px] font-semibold text-slate-500 mb-2">Occasion</label>
                  <select value={occasionFilter} onChange={e => { setOccasionFilter(e.target.value); setFilter("default"); }}
                    className="h-11 w-full rounded-full border border-[#ead8ce] bg-white px-4 text-[13px] font-semibold text-slate-600 outline-none">
                    <option value="">All occasions</option>
                    {allOccasions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              )}
              <button type="button" onClick={() => setFilterPopupOpen(false)}
                className="mt-6 w-full h-12 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[14px] font-semibold text-white shadow-md hover:brightness-105">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <div key={i} className="h-48 rounded-[26px] bg-[#f0e4dd] animate-pulse" />)}
          </div>
        </div>
      )}

      {!loading && !selectedBoardId && (
        <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-8">
          {boards && boards.length > 0 && (
            <p className="mb-4 text-[13px] font-semibold text-slate-500">
              🎁 {boards.reduce((sum, b) => sum + b.hintCount, 0)} gift idea{boards.reduce((sum, b) => sum + b.hintCount, 0) === 1 ? "" : "s"} across {boards.length} Hints list{boards.length === 1 ? "" : "s"}
            </p>
          )}
          {boards && boards.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-lg font-semibold">{displayName} hasn't shared any Hints yet</p>
              <p className="text-sm mt-1">Check back soon</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(boards || []).map((board) => (
                <div key={board.id} className="group relative flex flex-col overflow-hidden rounded-[26px] border border-[#f0dfd6] bg-white transition hover:-translate-y-1 hover:shadow-md">
                  <button
                    type="button"
                    onClick={() => setSelectedBoardId(board.id)}
                    className="flex flex-col text-left"
                  >
                    <div className="bg-[#fdf5f0]" style={{ aspectRatio: "16/9" }}>
                      <BoardPreviewGrid previewHints={board.previewHints} />
                    </div>
                    <div className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold text-slate-900">{board.title}</p>
                        <p className="mt-0.5 text-[12px] text-slate-400">{board.hintCount} Hint{board.hintCount === 1 ? "" : "s"}</p>
                      </div>
                      <span className="shrink-0 text-slate-300 transition group-hover:text-[#df7b59]">→</span>
                    </div>
                  </button>
                  {isOwnProfile && !board.is_default && (
                    <button
                      type="button"
                      onClick={() => handleDeleteBoard(board)}
                      className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-[#ead8ce] bg-white/90 text-slate-400 opacity-0 backdrop-blur transition hover:bg-[#fff0f0] hover:text-[#b14f43] group-hover:opacity-100"
                      aria-label={`Delete ${board.title}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedBoardId && (
      <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-8">
        {boardHintsLoading ? (
          <div className="columns-2 md:columns-3 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="mb-4 h-64 rounded-[20px] bg-[#f0e4dd] animate-pulse break-inside-avoid" />)}
          </div>
        ) : filteredHints.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg font-semibold">No Hints match that filter</p>
            <p className="text-sm mt-1">Try a different filter</p>
          </div>
        ) : (
          <div className="columns-2 md:columns-3 gap-4">
            {filteredHints.map((hint, idx) => {
              const gradient = GRADIENTS[idx % GRADIENTS.length];
              return (
                <div key={hint.id} className="mb-4 break-inside-avoid cursor-pointer" onClick={() => { setSelectedHint(hint); if (currentUser?.id) recordHintView(supabase, currentUser.id, hint.id); }}>
                  <article className="relative overflow-hidden rounded-[22px] shadow-sm" style={hint.image_url ? (imageRatios[hint.id] ? { aspectRatio: String(imageRatios[hint.id]) } : { aspectRatio: "3/4" }) : undefined}>
                    {hint.image_url
                      ? <HintImage src={hint.image_url} alt={hint.title} fill className="object-cover" sizes="(max-width: 768px) 50vw, 33vw" fallbackClassName="hidden" />
                      : <div className={`w-full bg-gradient-to-br ${gradient} flex items-center justify-center text-4xl`} style={{ aspectRatio: "3/4", minHeight: "220px" }}>🎁</div>
                    }
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                    {hint.starred && <div className="absolute top-2 right-2 text-[18px]" >⭐</div>}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-[15px] font-bold text-white leading-tight line-clamp-2" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>{hint.title || "Hint"}</p>
                      {hint.numeric_price > 0 && (
                        <span className="mt-1 inline-block text-[11px] font-bold text-white rounded-full px-2 py-0.5" style={{ background: "#ff875d" }}>
                          {new Intl.NumberFormat("en-GB", { style: "currency", currency: hint.currency || "GBP" }).format(hint.numeric_price)}
                        </span>
                      )}
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {selectedHint && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 backdrop-blur-sm min-[480px]:items-center min-[480px]:px-4" onClick={() => setSelectedHint(null)}>
          <div className="w-full max-w-[480px] rounded-t-[28px] min-[480px]:rounded-[28px] bg-[#fffaf7] border border-[#efdcd2] shadow-xl overflow-y-auto flex flex-col" style={{ maxHeight: "88dvh" }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-end px-4 pt-3 shrink-0">
              <button type="button" onClick={() => setSelectedHint(null)} className="h-8 w-8 flex items-center justify-center rounded-full border border-[#ead8ce] text-slate-400">✕</button>
            </div>
            {selectedHint.image_url
              ? <HintImage src={selectedHint.image_url} alt={selectedHint.title} width={480} height={280} className="w-full h-auto" style={{ maxHeight: "280px", objectFit: "contain" }} />
              : <div className="w-full bg-gradient-to-br from-[#ead8ca] to-[#c4a17f] flex items-center justify-center text-6xl" style={{ height: "200px" }}>🎁</div>
            }
            <div className="p-5">
              {selectedHint.starred && <p className="text-[11px] font-semibold text-[#ff875d] mb-1">⭐ Top pick</p>}
              <p className="text-[18px] font-semibold text-slate-900 leading-tight">{selectedHint.title || "Hint"}</p>
              {selectedHint.retailer && <p className="text-[13px] text-slate-400 mt-1">{selectedHint.retailer}</p>}
              {selectedHint.numeric_price > 0 && (
                <p className="text-[16px] font-bold text-[#df7b59] mt-2">
                  {new Intl.NumberFormat("en-GB", { style: "currency", currency: selectedHint.currency || "GBP" }).format(selectedHint.numeric_price)}
                </p>
              )}
              {(selectedHint.size || selectedHint.colour) && (
                <p className="text-[13px] text-slate-600 mt-2">
                  {selectedHint.size && <>📏 Size: <strong>{selectedHint.size}</strong>{selectedHint.size_type ? ` (${selectedHint.size_type})` : ""}</>}
                  {selectedHint.size && selectedHint.colour && "  ·  "}
                  {selectedHint.colour && <>🎨 Colour: <strong>{selectedHint.colour}</strong></>}
                </p>
              )}
              {selectedHint.occasions?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedHint.occasions.map(o => <span key={o} className="rounded-full bg-[#fff4ee] px-2.5 py-0.5 text-[11px] font-semibold text-[#df7b59]">{o}</span>)}
                </div>
              )}
              <div className="mt-4 mb-3">
                <ShareButton
                  supabase={supabase}
                  subjectType="hint"
                  subjectId={selectedHint.id}
                  path={`/h/${selectedHint.id}`}
                  title={selectedHint.title}
                  sharerName={displayName}
                  currentUserId={currentUser?.id}
                  label="Share this hint"
                  className="w-full h-11 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[13px] font-semibold text-white flex items-center justify-center gap-1.5 shadow-md hover:brightness-105"
                />
              </div>
              <div className="flex gap-3">
                {selectedHint.url && (
                  <a href={selectedHint.url} target="_blank" rel="noopener noreferrer"
                    onClick={() => trackRetailerClick(supabase, { userId: currentUser?.id, hintId: selectedHint.id, url: selectedHint.url, retailer: selectedHint.retailer, source: "public_profile" })}
                    className="flex-1 h-11 flex items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[13px] font-semibold text-white shadow-lg">
                    Open →
                  </a>
                )}
                {!isViewingOther && (
                  <a href="/hints"
                    className="flex-1 h-11 flex items-center justify-center rounded-full border border-[#ead8ce] text-[13px] font-semibold text-slate-600">
                    Edit in hints →
                  </a>
                )}
                {isViewingOther && (
                  <button type="button" onClick={() => setGroupHint(selectedHint)}
                    className="flex-1 h-11 rounded-full border border-[#ead8ce] text-[13px] font-semibold text-slate-600 hover:bg-[#fff5f0]">
                    Get group together
                  </button>
                )}
                {isViewingOther && (() => {
                  const myClaim = claims.find(c => c.hint_id === selectedHint.id && c.claimed_by === currentUser?.id);
                  const otherClaim = claims.find(c => c.hint_id === selectedHint.id && c.claimed_by !== currentUser?.id);
                  return (
                    <button type="button" disabled={claimingId === selectedHint.id}
                      onClick={() => { setClaimingId(selectedHint.id); handleToggleClaim(selectedHint).finally(() => setClaimingId(null)); }}
                      className={`flex-1 h-11 rounded-full text-[13px] font-semibold border transition ${myClaim ? "bg-[#edf6eb] text-[#4a7a3a] border-[#c5dfc0]" : otherClaim ? "bg-[#fff8ee] text-[#b87a2a] border-[#f0d9a0]" : "bg-[#fff4ee] text-[#df7b59] border-[#f0c9b5] hover:bg-[#ffe9db]"}`}>
                      {myClaim ? "✓ On it" : otherClaim ? "Buy anyway?" : "I'm getting this"}
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    {groupHint && (
        <GroupHintModal
          hint={groupHint}
          recipientUserId={userId}
          recipientName={displayName}
          currentUserId={currentUser?.id}
          onClose={() => setGroupHint(null)}
          onSent={(count) => {
            setGroupHint(null);
            setInviteConfirmation(count);
            setTimeout(() => setInviteConfirmation(null), 4000);
          }}
        />
      )}
      {inviteConfirmation != null && (
        <div className="fixed inset-x-0 bottom-6 z-[130] flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-[#2f3b2d] px-5 py-3 text-[13px] font-semibold text-white shadow-xl">
            <span>✓</span>
            <span>
              Invite{inviteConfirmation > 1 ? "s" : ""} sent — you&apos;ll find {inviteConfirmation > 1 ? "them" : "it"} in your chats
            </span>
          </div>
        </div>
      )}
      <AuthModal open={signUpOpen} onClose={() => setSignUpOpen(false)} initialMode="signup" />
    </main>
  );
  // Don't decide between PublicShell and the normal app chrome until
  // the first auth check has actually resolved - currentUser starts
  // null for every visitor including a signed-in one, so checking
  // !currentUser before authChecked is true meant a signed-in visitor
  // saw the public "Sign in" header flash before the real one took
  // over. inner already carries its own loading skeleton, so it's
  // safe to render bare during this window.
  if (!authChecked) return inner;
  if (!currentUser) return <PublicShell>{inner}</PublicShell>;
  return inner;
}
