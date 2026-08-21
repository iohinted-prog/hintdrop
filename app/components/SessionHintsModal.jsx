"use client";
import { useState, useEffect } from "react";
import { createClient } from "../../lib/supabase/client";
import Link from "next/link";

const GRADIENTS = [
  "from-[#d9dfcf] via-[#b9c7aa] to-[#90a27e]",
  "from-[#ead8ca] via-[#dbc0a8] to-[#c4a17f]",
  "from-[#efe5de] via-[#e5d2c8] to-[#d1b2a4]",
  "from-[#d5dbee] via-[#b3c0df] to-[#8f9fc9]",
  "from-[#eadce8] via-[#d8bfd1] to-[#bb9ab6]",
];

export default function SessionHintsModal({ hints, actorUserId, actorName, actorAvatar, currentUserId, onClose }) {
  const supabase = createClient();
  const [claims, setClaims] = useState([]);
  const [claimingId, setClaimingId] = useState(null);
  const isViewingOther = currentUserId && currentUserId !== actorUserId;

  useEffect(() => {
    if (!hints.length || !currentUserId || !isViewingOther) return;
    supabase.from("hint_claims")
      .select("id, hint_id, claimed_by, claim_type")
      .in("hint_id", hints.map(h => h.id))
      .then(({ data }) => setClaims(data || []));
  }, [hints, currentUserId]);

  async function handleToggleClaim(hint) {
    if (!isViewingOther) return;
    const myClaim = claims.find(c => c.hint_id === hint.id && c.claimed_by === currentUserId);
    if (myClaim) {
      setClaims(prev => prev.filter(c => c.id !== myClaim.id));
      await supabase.from("hint_claims").delete().eq("id", myClaim.id);
    } else {
      const tempId = crypto.randomUUID();
      setClaims(prev => [...prev, { id: tempId, hint_id: hint.id, claimed_by: currentUserId, claim_type: "solo" }]);
      const { error } = await supabase.from("hint_claims").insert({ hint_id: hint.id, claimed_by: currentUserId, claim_type: "solo" });
      if (error) setClaims(prev => prev.filter(c => c.id !== tempId));
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 backdrop-blur-sm min-[480px]:items-center min-[480px]:px-4" onClick={onClose}>
      <div className="w-full max-w-[560px] rounded-t-[28px] min-[480px]:rounded-[28px] bg-[#fffaf7] border border-[#efdcd2] shadow-xl overflow-hidden flex flex-col" style={{ maxHeight: "88dvh" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f2e5de] shrink-0">
          <div className="flex items-center gap-3">
            {actorAvatar
              ? <img src={actorAvatar} alt={actorName} className="h-9 w-9 rounded-full object-cover" />
              : <div className="h-9 w-9 rounded-full bg-gradient-to-b from-[#efcdbf] to-[#bb8168] flex items-center justify-center text-[11px] font-bold text-white">{actorName?.[0]?.toUpperCase() || "?"}</div>
            }
            <div>
              <p className="text-[15px] font-semibold text-slate-900">{actorName}'s new hints</p>
              <p className="text-[11px] text-slate-400">{hints.length} hint{hints.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="h-9 w-9 flex items-center justify-center rounded-full border border-[#ead8ce] text-slate-400">✕</button>
        </div>
        <div className="overflow-y-auto p-4 grid grid-cols-2 gap-3">
          {hints.map((hint, i) => {
            const myClaim = claims.find(c => c.hint_id === hint.id && c.claimed_by === currentUserId);
            const otherClaim = claims.find(c => c.hint_id === hint.id && c.claimed_by !== currentUserId);
            const gradient = GRADIENTS[i % GRADIENTS.length];
            return (
              <div key={hint.id || i} className="overflow-hidden rounded-[18px] border border-[#f0dfd6] bg-white">
                <a href={hint.url || "#"} target="_blank" rel="noopener noreferrer" className="block">
                  {hint.image_url
                    ? <img src={hint.image_url} alt={hint.title} className="w-full object-cover" style={{ aspectRatio: "3/4" }} />
                    : <div className={`w-full bg-gradient-to-br ${gradient} flex items-center justify-center text-3xl`} style={{ aspectRatio: "3/4" }}>🎁</div>
                  }
                </a>
                <div className="p-2.5">
                  <p className="text-[12px] font-semibold text-slate-900 line-clamp-2 leading-tight">{hint.title || "Hint"}</p>
                  {hint.retailer && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{hint.retailer}</p>}
                  {isViewingOther && (
                    <button type="button" disabled={claimingId === hint.id}
                      onClick={() => { setClaimingId(hint.id); handleToggleClaim(hint).finally(() => setClaimingId(null)); }}
                      className={`mt-2 w-full h-8 rounded-full text-[11px] font-semibold border transition ${
                        myClaim ? "bg-[#edf6eb] text-[#4a7a3a] border-[#c5dfc0]"
                        : otherClaim ? "bg-[#fff8ee] text-[#b87a2a] border-[#f0d9a0]"
                        : "bg-[#fff4ee] text-[#df7b59] border-[#f0c9b5] hover:bg-[#ffe9db]"
                      }`}>
                      {myClaim ? "✓ On it" : otherClaim ? "Buy anyway?" : "I'm getting this"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {actorUserId && (
          <div className="px-4 py-3 border-t border-[#f2e5de] shrink-0">
            <Link href={`/profile/${actorUserId}`} onClick={onClose}
              className="w-full h-10 flex items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[13px] font-semibold text-white shadow-lg">
              See full profile →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
