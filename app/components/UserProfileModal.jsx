"use client";
import { useState, useEffect } from "react";
import { createClient } from "../../lib/supabase/client";

function loadImageAspectRatio(src) {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve(img.naturalWidth / img.naturalHeight);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function UserProfileModal({ userId, name, avatarUrl, initials, onClose, currentUserId, isContact, onAddContact }) {
  const supabase = createClient();
  const [hints, setHints] = useState([]);
  const [imageRatios, setImageRatios] = useState({});
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState([]);
  const [claimingId, setClaimingId] = useState(null);

  useEffect(() => {
    if (!userId) return;
    async function load() {
      setLoading(true);
      const [{ data: profileData }, { data: hintsData }] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url, interests").eq("id", userId).maybeSingle(),
        supabase.from("hints").select("id, title, image_url, numeric_price, currency, retailer, url, starred, occasions").eq("user_id", userId).eq("is_private", false).order("position", { ascending: true }).limit(40),
      ]);
      setProfile(profileData);
      const hintsList = hintsData || [];
      setHints(hintsList);
      if (hintsList.length && currentUserId && currentUserId !== userId) {
        const { data: claimsData } = await supabase
          .from("hint_claims")
          .select("id, hint_id, claimed_by, claim_type")
          .in("hint_id", hintsList.map(h => h.id));
        setClaims(claimsData || []);
      }
      setLoading(false);
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
      const { error } = await supabase.from("hint_claims")
        .insert({ hint_id: hint.id, claimed_by: currentUserId, claim_type: "solo" });
      const data = error ? null : { id: tempId, hint_id: hint.id, claimed_by: currentUserId, claim_type: "solo" };
      if (error) {
        setClaims(prev => prev.filter(c => c.id !== tempId));
      } else if (data) {
        setClaims(prev => prev.map(c => c.id === tempId ? data : c));
        // Feed update visible to contacts but not hint owner
        supabase.from("feed_items").insert({
          owner_user_id: currentUserId,
          actor_user_id: currentUserId,
          family: "hint",
          item_type: "hint_save_session",
          headline: "is getting " + (hint.title || "a hint"),
          body: hint.retailer || "",
          cta_label: "See Hints",
          cta_href: "/hints",
          visibility: "contacts",
          occurred_at: new Date().toISOString(),
          metadata: {
            actor_name: "",
            hint_title: hint.title,
            hint_image: hint.image_url || "",
            hint_retailer: hint.retailer || "",
            hide_from_user_id: userId,
            social_enabled: true,
            preview_hints: [{ id: hint.id, title: hint.title, image_url: hint.image_url || "", retailer: hint.retailer || "" }],
            hint_count: 1,
          },
        }).catch(() => {});

      }
    }
  }

  const displayName = profile?.full_name || name || "User";
  const displayAvatar = profile?.avatar_url || avatarUrl;
  const interests = Array.isArray(profile?.interests) ? profile.interests : [];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(33,24,20,0.42)] backdrop-blur-sm sm:items-center sm:px-4" onClick={onClose}>
      <div
        className="flex w-full max-w-[640px] flex-col overflow-hidden rounded-t-[32px] border border-[#efdcd2] bg-white shadow-[0_28px_80px_rgba(75,45,30,0.18)] sm:rounded-[32px]"
        style={{ maxHeight: "90dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-[#f2e5de] px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {displayAvatar ? (
                <img src={displayAvatar} alt={displayName} className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-[#efcdbf] to-[#bb8168] text-[14px] font-bold text-white">
                  {initials || getInitials(displayName)}
                </div>
              )}
              <div>
                <p className="text-[18px] font-semibold text-slate-900">{displayName}</p>
                {interests.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {interests.slice(0, 5).map((interest) => (
                      <span key={interest} className="rounded-full bg-[#fff4ee] px-2.5 py-0.5 text-[11px] font-semibold text-[#df7b59]">
                        {interest}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#efe0d7] text-slate-500 hover:bg-[#faf6f3]">
              ✕
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-400">Loading hints...</div>
          ) : !isContact && currentUserId && currentUserId !== userId ? (
            <div className="relative">
              <div className="columns-2 gap-3 blur-sm pointer-events-none select-none">
                {hints.slice(0, 4).map((hint) => (
                  <div key={hint.id} className="mb-3 break-inside-avoid">
                    <div className="overflow-hidden rounded-[20px] border border-[#f0dfd6] bg-[#fffaf7]">
                      {hint.image_url ? (
                        <img src={hint.image_url} alt={hint.title} className="w-full object-contain"  />
                      ) : (
                        <div className="flex items-center justify-center bg-gradient-to-br from-[#f3d5cc] to-[#d98c76]" >
                          <span className="text-2xl">🎁</span>
                        </div>
                      )}
                      <div className="p-3">
                        <p className="text-[13px] font-semibold text-slate-900 line-clamp-2">{hint.title}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <p className="text-sm font-semibold text-slate-700">Add as a contact to see their hints</p>
                <button type="button" onClick={onAddContact}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-6 text-sm font-semibold text-white shadow-lg">
                  Add contact
                </button>
              </div>
            </div>
          ) : hints.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">No public hints yet.</div>
          ) : (
            <div className="columns-2 gap-3">
              {hints.map((hint) => {
                const myClaim = claims.find(c => c.hint_id === hint.id && c.claimed_by === currentUserId);
                const otherClaim = claims.find(c => c.hint_id === hint.id && c.claimed_by !== currentUserId);
                const isViewingOther = currentUserId && currentUserId !== userId;
                return (
                  <div key={hint.id} className="mb-3 break-inside-avoid">
                    <div className="overflow-hidden rounded-[20px] border border-[#f0dfd6] bg-[#fffaf7] hover:border-[#e8c9bc] transition-colors">
                      <a href={hint.url} target="_blank" rel="noopener noreferrer" className="block">
                        {hint.image_url ? (
                          <img src={hint.image_url} alt={hint.title} className="w-full object-contain"  />
                        ) : (
                          <div className="flex items-center justify-center bg-gradient-to-br from-[#f3d5cc] to-[#d98c76]" >
                            <span className="text-2xl">🎁</span>
                          </div>
                        )}
                        <div className="p-3">
                          <p className="text-[13px] font-semibold text-slate-900 line-clamp-2">{hint.title}</p>
                          {hint.numeric_price != null && (
                            <p className="mt-1 text-[12px] text-[#df7b59] font-medium">
                              {new Intl.NumberFormat("en-GB", { style: "currency", currency: hint.currency || "GBP" }).format(hint.numeric_price)}
                            </p>
                          )}
                          <p className="mt-0.5 text-[11px] text-slate-400 truncate">{hint.retailer}</p>
                          {hint.occasions?.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {hint.occasions.slice(0, 2).map(o => (
                                <span key={o} className="rounded-full bg-[#f0f7ee] px-2 py-0.5 text-[10px] font-semibold text-[#4a7a3a]">{o}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </a>
                      {isViewingOther ? (
                        <div className="border-t border-[#f0dfd6] px-3 py-2 flex items-center justify-between gap-2">
                          {otherClaim && !myClaim ? (
                            <span className="text-[11px] text-slate-400">Someone is on it</span>
                          ) : <span />}
                          <button
                            type="button"
                            disabled={claimingId === hint.id}
                            onClick={() => {
                              setClaimingId(hint.id);
                              handleToggleClaim(hint).finally(() => setClaimingId(null));
                            }}
                            className={`ml-auto text-[11px] font-semibold rounded-full px-3 py-1 border transition ${
                              myClaim
                                ? "bg-[#edf6eb] text-[#4a7a3a] border-[#c5dfc0]"
                                : otherClaim
                                  ? "bg-[#fff8ee] text-[#b87a2a] border-[#f0d9a0] hover:bg-[#fff0d6]"
                                  : "bg-[#fff4ee] text-[#df7b59] border-[#f0c9b5] hover:bg-[#ffe9db]"
                            }`}
                          >
                            {myClaim ? "I am on it ✓" : otherClaim ? "Buy anyway?" : "I am getting this"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



export default UserProfileModal;
