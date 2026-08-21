"use client";
import PublicShell from "../../components/PublicShell";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";
import GroupHintModal from "../../components/GroupHintModal";
import { trackRetailerClick } from "../../../lib/trackRetailerClick";
import HintImage from "../../components/HintImage";
import ShareButton from "../../components/ShareButton";
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

function formatMonthYear(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
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
  const [profile, setProfile] = useState(null);
  const [boards, setBoards] = useState(null); // null = not loaded yet
  const [selectedBoardId, setSelectedBoardId] = useState(null);
  const [boardHintsLoading, setBoardHintsLoading] = useState(false);
  const [hints, setHints] = useState([]);
  const [claims, setClaims] = useState([]);
  const [imageRatios, setImageRatios] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [filter, setFilter] = useState("default");
  const [occasionFilter, setOccasionFilter] = useState("");
  const [claimingId, setClaimingId] = useState(null);
  const [contactState, setContactState] = useState("none"); // "none" | "pending" | "active"
  const [contactSince, setContactSince] = useState(null);
  const [selectedHint, setSelectedHint] = useState(null);
  const [groupHint, setGroupHint] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      recordShareContext("profile", userId, userId);

      // Uses an RPC rather than a direct table select — birthday is only
      // ever returned by this function when the caller has an active
      // contact relationship with this profile, enforced at the database
      // level (not just hidden in the UI, which a direct API call could
      // bypass). Returns a single-row array since it's a table function.
      const [{ data: profileRows }, { data: boardRows }] = await Promise.all([
        supabase.rpc("get_public_profile", { target_id: userId }),
        supabase.from("hint_boards")
          .select("id, title, is_default")
          .eq("user_id", userId).or("is_private.is.null,is_private.eq.false")
          .order("is_default", { ascending: false }).order("created_at", { ascending: true }),
      ]);
      const profileData = profileRows?.[0] || null;
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

      setLoading(false);

      // A ?board= link (e.g. from Feed's "Jump back in") should land
      // directly in that specific list, not the menu — falls through to
      // the single-board shortcut below if the param is missing or points
      // at a board that isn't actually in this person's public list.
      const requestedBoardId = searchParams.get("board");
      const requestedBoardValid = requestedBoardId && boardsWithPreviews.some((b) => b.id === requestedBoardId);
      if (requestedBoardValid) {
        setSelectedBoardId(requestedBoardId);
      } else if (boardsWithPreviews.length === 1) {
        // A single-board profile (everyone's default state before they
        // make any extra lists) can skip straight to that board instead
        // of showing a one-item menu with nothing else to click
        setSelectedBoardId(boardsWithPreviews[0].id);
      }
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
      setBoardHintsLoading(false);
      const ratios = {};
      await Promise.all(hintsList.filter(h => h.image_url).map(async h => {
        const r = await loadRatio(h.image_url).catch(() => null);
        if (r) ratios[h.id] = r;
      }));
      if (!cancelled) setImageRatios(ratios);
    }
    loadBoardHints();
    return () => { cancelled = true; };
  }, [selectedBoardId]);

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

  const inner = (
    <main className="min-h-screen bg-[#fffaf7]">
      <div className="border-b border-[#f0dfd6] bg-white px-4 py-4 sm:px-8">
        <div className="mx-auto max-w-[1200px] flex items-center gap-4">
          <Link href="/feed" className="h-9 w-9 flex items-center justify-center rounded-full border border-[#ead8ce] text-slate-500 hover:bg-[#fff5f0] shrink-0"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 5l-7 7 7 7"/></svg></Link>
          <div className="ml-auto shrink-0">
            <ShareButton
              supabase={supabase}
              subjectType="profile"
              subjectId={userId}
              path={`/profile/${userId}`}
              title={`${displayName}'s Hints`}
              currentUserId={currentUser?.id}
              label="Share"
              className="h-9 flex items-center gap-1.5 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-3.5 text-[13px] font-semibold text-white shadow-md hover:brightness-105"
            />
          </div>
          {profile?.avatar_url
            ? <HintImage src={profile.avatar_url} alt={displayName} width={56} height={56} className="rounded-full object-cover border-2 border-[#f0dfd6] shrink-0" fallbackClassName="hidden" />
            : <div className="h-14 w-14 rounded-full bg-gradient-to-b from-[#efcdbf] to-[#bb8168] flex items-center justify-center text-[16px] font-bold text-white shrink-0">{getInitials(displayName)}</div>
          }
          <div className="flex-1 min-w-0">
            <h1 className="text-[22px] font-semibold tracking-[-0.04em] text-slate-900">{displayName}'s Hints</h1>
            {!isOwnProfile && currentUser && (
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
            {interests.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {interests.slice(0, 6).map(i => <span key={i} className="rounded-full bg-[#fff4ee] px-2.5 py-0.5 text-[11px] font-semibold text-[#df7b59]">{i}</span>)}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedBoardId && boards && boards.length > 1 && (
        <div className="border-b border-[#f0dfd6] bg-[#fff7f2] px-4 py-2.5 sm:px-8">
          <div className="mx-auto max-w-[1200px]">
            <button type="button" onClick={() => setSelectedBoardId(null)}
              className="text-[13px] font-semibold text-[#df7b59] hover:text-[#b14f43]">
              ← All of {isOwnProfile ? "your" : `${displayName}'s`} Hints
            </button>
          </div>
        </div>
      )}

      {selectedBoardId && (
        <div className="border-b border-[#f0dfd6] bg-white px-4 py-3 sm:px-8">
          <div className="mx-auto max-w-[1200px] flex items-center gap-3 flex-wrap">
            <div className="flex gap-2 overflow-x-auto">
              {["default","starred","price_low","price_high"].map(f => (
                <button key={f} type="button" onClick={() => { setFilter(f); setOccasionFilter(""); }}
                  className={`shrink-0 h-9 px-4 rounded-full text-[12px] font-semibold transition ${filter === f && !occasionFilter ? "bg-[#ff875d] text-white" : "border border-[#ead8ce] bg-white text-slate-600 hover:bg-[#fff5f0]"}`}>
                  {f === "default" ? "All" : f === "starred" ? "⭐ Favourites" : f === "price_low" ? "Price ↑" : "Price ↓"}
                </button>
              ))}
            </div>
            {allOccasions.length > 0 && (
              <select value={occasionFilter} onChange={e => { setOccasionFilter(e.target.value); setFilter("default"); }}
                className="h-9 rounded-full border border-[#ead8ce] bg-white px-3 text-[12px] font-semibold text-slate-600 outline-none">
                <option value="">All occasions</option>
                {allOccasions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            )}
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
                <button
                  key={board.id}
                  type="button"
                  onClick={() => setSelectedBoardId(board.id)}
                  className="group flex flex-col overflow-hidden rounded-[26px] border border-[#f0dfd6] bg-white text-left transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="grid grid-cols-2 gap-0.5 bg-[#fdf5f0] p-0.5" style={{ aspectRatio: "16/9" }}>
                    {[0, 1, 2, 3].map((i) => {
                      const hint = board.previewHints?.[i];
                      return (
                        <div key={i} className="relative overflow-hidden bg-[#fdf5f0]">
                          {hint?.image_url ? (
                            <HintImage src={hint.image_url} alt="" fill className="object-cover" sizes="200px" fallbackClassName="hidden" />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-[#ead8ca] to-[#dbc0a8]" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-slate-900">{board.title}</p>
                      <p className="mt-0.5 text-[12px] text-slate-400">{board.hintCount} Hint{board.hintCount === 1 ? "" : "s"}</p>
                    </div>
                    <span className="shrink-0 text-slate-300 transition group-hover:text-[#df7b59]">→</span>
                  </div>
                </button>
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
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:px-4" onClick={() => setSelectedHint(null)}>
          <div className="w-full max-w-[480px] rounded-t-[28px] sm:rounded-[28px] bg-[#fffaf7] border border-[#efdcd2] shadow-xl overflow-y-auto flex flex-col" style={{ maxHeight: "88dvh" }} onClick={e => e.stopPropagation()}>
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
        />
      )}
    </main>
  );
  if (!currentUser) return <PublicShell>{inner}</PublicShell>;
  return inner;
}
