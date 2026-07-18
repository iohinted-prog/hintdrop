"use client";
import { useState, useEffect } from "react";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";

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

const GRADIENTS = [
  "from-[#d9dfcf] via-[#b9c7aa] to-[#90a27e]",
  "from-[#ead8ca] via-[#dbc0a8] to-[#c4a17f]",
  "from-[#efe5de] via-[#e5d2c8] to-[#d1b2a4]",
  "from-[#d5dbee] via-[#b3c0df] to-[#8f9fc9]",
  "from-[#eadce8] via-[#d8bfd1] to-[#bb9ab6]",
];

export default function ProfileClient({ userId }) {
  const supabase = createClient();
  const [profile, setProfile] = useState(null);
  const [hints, setHints] = useState([]);
  const [claims, setClaims] = useState([]);
  const [imageRatios, setImageRatios] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [filter, setFilter] = useState("default");
  const [occasionFilter, setOccasionFilter] = useState("");
  const [claimingId, setClaimingId] = useState(null);
  const [isContact, setIsContact] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const [{ data: profileData }, { data: hintsData }] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url, interests").eq("id", userId).maybeSingle(),
        supabase.from("hints")
          .select("id, title, image_url, numeric_price, currency, retailer, url, starred, occasions, position")
          .eq("user_id", userId)
          .eq("is_private", false)
          .order("position", { ascending: true })
          .limit(100),
      ]);

      setProfile(profileData);
      const hintsList = hintsData || [];
      setHints(hintsList);

      if (user && user.id !== userId && hintsList.length) {
        const { data: claimsData } = await supabase.from("hint_claims")
          .select("id, hint_id, claimed_by, claim_type")
          .in("hint_id", hintsList.map(h => h.id));
        setClaims(claimsData || []);
        const { data: contactData } = await supabase.from("contacts")
          .select("id").eq("user_id", user.id).eq("profile_id", userId).maybeSingle();
        setIsContact(!!contactData);
      }

      setLoading(false);

      // Load image ratios after render
      const ratios = {};
      await Promise.all(hintsList.filter(h => h.image_url).map(async h => {
        const r = await loadRatio(h.image_url).catch(() => null);
        if (r) ratios[h.id] = r;
      }));
      setImageRatios(ratios);
    }
    load();
  }, [userId]);

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

  const displayName = profile?.full_name || "User";
  const interests = Array.isArray(profile?.interests) ? profile.interests : [];

  return (
    <main className="min-h-screen bg-[#fffaf7]">
      {/* Header */}
      <div className="border-b border-[#f0dfd6] bg-white px-4 py-4 sm:px-8">
        <div className="mx-auto max-w-[1200px] flex items-center gap-4">
          <Link href="/feed" className="h-9 w-9 flex items-center justify-center rounded-full border border-[#ead8ce] text-slate-500 hover:bg-[#fff5f0] shrink-0">←</Link>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={displayName} className="h-14 w-14 rounded-full object-cover border-2 border-[#f0dfd6] shrink-0" />
          ) : (
            <div className="h-14 w-14 rounded-full bg-gradient-to-b from-[#efcdbf] to-[#bb8168] flex items-center justify-center text-[16px] font-bold text-white shrink-0">
              {getInitials(displayName)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-[22px] font-semibold tracking-[-0.04em] text-slate-900">{displayName}'s Hints</h1>
            {interests.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {interests.slice(0, 6).map(i => (
                  <span key={i} className="rounded-full bg-[#fff4ee] px-2.5 py-0.5 text-[11px] font-semibold text-[#df7b59]">{i}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter bar */}
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

      {/* Hints grid */}
      <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-8">
        {loading ? (
          <div className="columns-2 md:columns-3 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="mb-4 h-64 rounded-[20px] bg-[#f0e4dd] animate-pulse break-inside-avoid" />)}
          </div>
        ) : filteredHints.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg font-semibold">No hints here</p>
            <p className="text-sm mt-1">Try a different filter</p>
          </div>
        ) : (
          <div className="columns-2 md:columns-3 gap-4">
            {filteredHints.map(hint => {
              const myClaim = claims.find(c => c.hint_id === hint.id && c.claimed_by === currentUser?.id);
              const otherClaim = claims.find(c => c.hint_id === hint.id && c.claimed_by !== currentUser?.id);
              const gradient = GRADIENTS[hint.id ? hint.id.charCodeAt(0) % GRADIENTS.length : 0];
              return (
                <div key={hint.id} className="mb-4 break-inside-avoid">
                  <div className="overflow-hidden rounded-[20px] border border-[#f0dfd6] bg-white shadow-sm hover:shadow-md transition-shadow">
                    {hint.image_url ? (
                      <img src={hint.image_url} alt={hint.title} className="w-full object-cover"
                        style={imageRatios[hint.id] ? { aspectRatio: String(imageRatios[hint.id]) } : { aspectRatio: "3/4" }} />
                    ) : (
                      <div className={`w-full bg-gradient-to-br ${gradient} flex items-center justify-center text-4xl`} style={{ aspectRatio: "3/4" }}>🎁</div>
                    )}
                    <div className="p-3">
                      {hint.starred && <p className="text-[11px] font-semibold text-[#ff875d] mb-0.5">⭐ Top pick</p>}
                      <p className="text-[13px] font-semibold text-slate-900 line-clamp-2 leading-tight">{hint.title || "Hint"}</p>
                      {hint.retailer && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{hint.retailer}</p>}
                      {hint.numeric_price > 0 && (
                        <p className="text-[13px] font-bold text-[#df7b59] mt-1">
                          {new Intl.NumberFormat("en-GB", { style: "currency", currency: hint.currency || "GBP" }).format(hint.numeric_price)}
                        </p>
                      )}
                      <div className="mt-2 flex gap-2">
                        {hint.url && (
                          <a href={hint.url} target="_blank" rel="noopener noreferrer"
                            className="flex-1 h-8 flex items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[11px] font-semibold text-white">
                            Open →
                          </a>
                        )}
                        {isViewingOther && (
                          <button type="button" disabled={claimingId === hint.id}
                            onClick={() => { setClaimingId(hint.id); handleToggleClaim(hint).finally(() => setClaimingId(null)); }}
                            className={`flex-1 h-8 rounded-full text-[11px] font-semibold border transition ${
                              myClaim ? "bg-[#edf6eb] text-[#4a7a3a] border-[#c5dfc0]"
                              : otherClaim ? "bg-[#fff8ee] text-[#b87a2a] border-[#f0d9a0]"
                              : "bg-[#fff4ee] text-[#df7b59] border-[#f0c9b5] hover:bg-[#ffe9db]"
                            }`}>
                            {myClaim ? "✓ On it" : otherClaim ? "Buy anyway?" : "I'm getting this"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
