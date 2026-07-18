"use client";
import { useState, useEffect } from "react";
import { createClient } from "../../lib/supabase/client";
import Link from "next/link";

function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function loadImageAspectRatio(src) {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve(img.naturalWidth / img.naturalHeight);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export default function UserProfileModal({ userId, name, avatarUrl, initials, onClose, currentUserId, isContact, onAddContact }) {
  const supabase = createClient();
  const [hints, setHints] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState([]);
  const [claimingId, setClaimingId] = useState(null);
  const [imageRatios, setImageRatios] = useState({});
  const [filter, setFilter] = useState("default");
  const [occasionFilter, setOccasionFilter] = useState("");

  useEffect(() => {
    if (!userId) return;
    async function load() {
      setLoading(true);
      const [{ data: profileData }, { data: hintsData }] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url, interests").eq("id", userId).maybeSingle(),
        supabase.from("hints").select("id, title, image_url, numeric_price, currency, retailer, url, starred, occasions").eq("user_id", userId).eq("is_private", false).order("starred", { ascending: false }).order("position", { ascending: true }).limit(40),
      ]);
      setProfile(profileData);
      const hintsList = hintsData || [];
      setHints(hintsList);
      if (hintsList.length && currentUserId && currentUserId !== userId) {
        const { data: claimsData } = await supabase.from("hint_claims").select("id, hint_id, claimed_by, claim_type").in("hint_id", hintsList.map(h => h.id));
        setClaims(claimsData || []);
      }
      setLoading(false);
      const ratios = {};
      await Promise.all(hintsList.filter(h => h.image_url).map(async h => {
        const r = await loadImageAspectRatio(h.image_url).catch(() => null);
        if (r) ratios[h.id] = r;
      }));
      setImageRatios(ratios);
    }
    load();
  }, [userId, currentUserId]);

  async function handleToggleClaim(hint) {
    if (!currentUserId || currentUserId === userId) return;
    const myClaim = claims.find(c => c.hint_id === hint.id && c.claimed_by === currentUserId);
    if (myClaim) {
      setClaims(prev => prev.filter(c => c.id !== myClaim.id));
      await supabase.from("hint_claims").delete().eq("id", myClaim.id);
    } else {
      const tempId = crypto.randomUUID();
      setClaims(prev => [...prev, { id: tempId, hint_id: hint.id, claimed_by: currentUserId, claim_type: "solo" }]);
      const { error } = await supabase.from("hint_claims").insert({ hint_id: hint.id, claimed_by: currentUserId, claim_type: "solo" });
      if (error) {
        setClaims(prev => prev.filter(c => c.id !== tempId));
      } else {
        Promise.resolve(supabase.from("feed_items").insert({
          owner_user_id: currentUserId, actor_user_id: currentUserId,
          family: "hint", item_type: "hint_save_session",
          headline: "is getting " + (hint.title || "a hint"),
          body: hint.retailer || "", cta_label: "See Hints", cta_href: "/hints",
          visibility: "contacts", occurred_at: new Date().toISOString(),
          metadata: {
            actor_name: "", hint_title: hint.title, hint_image: hint.image_url || "",
            hint_retailer: hint.retailer || "", hide_from_user_id: userId,
            social_enabled: true,
            preview_hints: [{ id: hint.id, title: hint.title, image_url: hint.image_url || "", retailer: hint.retailer || "" }],
            hint_count: 1,
          },
        })).catch(() => {});
      }
    }
  }

  const displayName = profile?.full_name || name || "User";
  const displayAvatar = profile?.avatar_url || avatarUrl || null;
  const displayInitials = initials || getInitials(displayName);
  const interests = Array.isArray(profile?.interests) ? profile.interests : [];
  const isViewingOther = currentUserId && currentUserId !== userId;

  const allOccasions = [...new Set(hints.flatMap(h => h.occasions || []))].filter(Boolean);
  const filteredHints = hints
    .filter(h => {
      if (filter === "starred") return h.starred;
      if (occasionFilter) return (h.occasions || []).includes(occasionFilter);
      return true;
    })
    .sort((a, b) => {
      const aPrice = a.numeric_price || 0;
      const bPrice = b.numeric_price || 0;
      const aHasPrice = aPrice > 0;
      const bHasPrice = bPrice > 0;
      if (filter === "price_low") {
        if (aHasPrice && !bHasPrice) return -1;
        if (!aHasPrice && bHasPrice) return 1;
        return aPrice - bPrice;
      }
      if (filter === "price_high") {
        if (aHasPrice && !bHasPrice) return -1;
        if (!aHasPrice && bHasPrice) return 1;
        return bPrice - aPrice;
      }
      if (b.starred !== a.starred) return (b.starred ? 1 : 0) - (a.starred ? 1 : 0);
      if (aHasPrice && !bHasPrice) return -1;
      if (!aHasPrice && bHasPrice) return 1;
      return bPrice - aPrice;
    });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(33,24,20,0.42)] backdrop-blur-sm sm:items-center sm:px-4" onClick={onClose}>
      <div className="flex w-full max-w-[640px] flex-col overflow-hidden rounded-t-[32px] border border-[#efdcd2] bg-white shadow-[0_28px_80px_rgba(75,45,30,0.18)] sm:rounded-[32px]"
        style={{ maxHeight: "90dvh" }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="shrink-0 border-b border-[#f2e5de] px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {displayAvatar ? (
                <img src={displayAvatar} alt={displayName} className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-[#efcdbf] to-[#bb8168] text-[14px] font-bold text-white">
                  {displayInitials}
                </div>
              )}
              <div>
                <p className="text-[18px] font-semibold text-slate-900">{displayName}</p>
                {interests.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {interests.slice(0, 5).map((interest) => (
                      <span key={interest} className="rounded-full bg-[#fff4ee] px-2.5 py-0.5 text-[11px] font-semibold text-[#df7b59]">{interest}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href={`/profile/${userId}`} onClick={onClose} className="h-9 px-3 flex items-center justify-center rounded-full border border-[#ead8ce] text-[11px] font-semibold text-slate-600 hover:bg-[#fff5f0]">Full profile</Link>
              <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#efe0d7] text-slate-500 hover:bg-[#faf6f3]">✕</button>
            </div>
          </div>
        </div>
        {/* Hints */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-400">Loading hints...</div>
          ) : !isContact && isViewingOther ? (
            <div className="relative">
              <div className="columns-2 gap-3 blur-sm pointer-events-none select-none">
                {[1,2,3,4].map(i => <div key={i} className="mb-3 h-40 rounded-[20px] bg-[#f0e4dd]" />)}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <p className="text-sm font-semibold text-slate-700">Add as a contact to see their hints</p>
                <button type="button" onClick={onAddContact} className="inline-flex h-10 items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-6 text-sm font-semibold text-white shadow-lg">Add contact</button>
              </div>
            </div>
          ) : hints.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">No public hints yet.</div>
          ) : (
            <>
  
            <div className="columns-2 gap-3">
              {filteredHints.map((hint) => {
                const myClaim = claims.find(c => c.hint_id === hint.id && c.claimed_by === currentUserId);
                const otherClaim = claims.find(c => c.hint_id === hint.id && c.claimed_by !== currentUserId);
                return (
                  <div key={hint.id} className="mb-3 break-inside-avoid">
                    <div className="overflow-hidden rounded-[20px] border border-[#f0dfd6] bg-[#fffaf7] hover:border-[#e8c9bc] transition-colors">
                      {hint.image_url ? (
                        <img src={hint.image_url} alt={hint.title} className="w-full object-cover"
                          style={imageRatios[hint.id] ? { aspectRatio: String(imageRatios[hint.id]) } : { aspectRatio: "3/4" }} />
                      ) : (
                        <div className="w-full bg-gradient-to-br from-[#f3d5cc] to-[#d98c76] flex items-center justify-center text-2xl" style={{ aspectRatio: "3/4" }}>🎁</div>
                      )}
                      <div className="p-3">
                        {hint.starred && <p className="text-[11px] font-semibold text-[#ff875d] mb-0.5">⭐ Top pick</p>}
                        <p className="text-[13px] font-semibold text-slate-900 line-clamp-2">{hint.title}</p>
                        {hint.retailer && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{hint.retailer}</p>}
                        {hint.numeric_price > 0 && (
                          <p className="text-[12px] font-bold text-[#df7b59] mt-1">
                            {new Intl.NumberFormat("en-GB", { style: "currency", currency: hint.currency || "GBP" }).format(hint.numeric_price)}
                          </p>
                        )}
                        {isViewingOther && (
                          <div className="mt-2 flex items-center justify-between gap-2">
                            {otherClaim && !myClaim ? (
                              <span className="text-[11px] text-slate-400">Someone is on it</span>
                            ) : <span />}
                            <button type="button" disabled={claimingId === hint.id}
                              onClick={() => { setClaimingId(hint.id); handleToggleClaim(hint).finally(() => setClaimingId(null)); }}
                              className={`ml-auto text-[11px] font-semibold rounded-full px-3 py-1 border transition ${
                                myClaim ? "bg-[#edf6eb] text-[#4a7a3a] border-[#c5dfc0]"
                                : otherClaim ? "bg-[#fff8ee] text-[#b87a2a] border-[#f0d9a0] hover:bg-[#fff0d6]"
                                : "bg-[#fff4ee] text-[#df7b59] border-[#f0c9b5] hover:bg-[#ffe9db]"
                              }`}>
                              {myClaim ? "I am on it ✓" : otherClaim ? "Buy anyway?" : "I am getting this"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
