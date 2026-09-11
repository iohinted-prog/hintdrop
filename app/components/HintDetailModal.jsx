"use client";
import { useEffect, useMemo, useState } from "react";
import HintImage from "./HintImage";
import ShareButton from "./ShareButton";
import GroupHintModal from "./GroupHintModal";
import { createClient } from "../../lib/supabase/client";
import { trackRetailerClick } from "../../lib/trackRetailerClick";
import { recordHintView } from "../../lib/recentHints";

// The one shared "view a single hint" modal. Any place that renders a hint
// as a small tile — feed cards, contact hint previews, circle members, etc.
// — should open this on click rather than falling through to a parent
// container's own click handler (a profile-open, a card-open, whatever it
// might be). Originally this lived duplicated inline in FeedClient; pulled
// out so every tile click site shares one implementation instead of each
// one silently drifting from (or missing) the others.
//
// Confirmed this is currently only actually wired up from FeedClient.js
// (the "contact hint previews, circle members" callers described above
// don't exist yet) - worth knowing if adding a new call site later, since
// this component's own claim/group-gift behavior below now depends on the
// caller passing hint.ownerId, not just a display name/avatar.
//
// Claim ("I'm getting this") and Get-group-together were missing here
// entirely - ProfileClient.jsx's own hint detail view had both, this
// shared one had neither, so the same hint looked meaningfully different
// depending on where you opened it from. Ported directly from
// ProfileClient.jsx's handleToggleClaim/GroupHintModal wiring, gated on
// hint.ownerId being present and different from the viewer (mirrors
// ProfileClient's own isViewingOther check) - this modal doesn't require
// ownerId for its other features (image/title/share/open all still work
// without it), so a caller that can't supply it degrades gracefully
// rather than being blocked from opening the modal at all.
//
// Share is always shown — every hint detail view is a share opportunity,
// so this creates its own client if a caller doesn't pass one, rather than
// silently hiding the button whenever `supabase` is omitted.
export default function HintDetailModal({ hint, onClose, supabase, currentUserId, source = "unknown" }) {
  const client = useMemo(() => supabase || createClient(), [supabase]);
  const [claims, setClaims] = useState([]);
  const [claiming, setClaiming] = useState(false);
  const [groupHintOpen, setGroupHintOpen] = useState(false);
  const [inviteConfirmation, setInviteConfirmation] = useState(null);

  const isViewingOther = Boolean(currentUserId && hint?.ownerId && currentUserId !== hint.ownerId);

  useEffect(() => {
    if (hint?.id && currentUserId) recordHintView(client, currentUserId, hint.id);
  }, [hint?.id, currentUserId]);

  useEffect(() => {
    if (!hint?.id || !isViewingOther) {
      setClaims([]);
      return;
    }
    client.from("hint_claims").select("id, hint_id, claimed_by, claim_type").eq("hint_id", hint.id).then(({ data }) => setClaims(data || []));
  }, [hint?.id, isViewingOther]);

  if (!hint) return null;

  const myClaim = claims.find((c) => c.claimed_by === currentUserId);
  const otherClaim = claims.find((c) => c.claimed_by !== currentUserId);

  async function handleToggleClaim() {
    if (!isViewingOther || claiming) return;
    setClaiming(true);
    if (myClaim) {
      setClaims((prev) => prev.filter((c) => c.id !== myClaim.id));
      await client.from("hint_claims").delete().eq("id", myClaim.id);
    } else {
      const tempId = crypto.randomUUID();
      setClaims((prev) => [...prev, { id: tempId, hint_id: hint.id, claimed_by: currentUserId, claim_type: "solo" }]);
      const { error } = await client.from("hint_claims").insert({ hint_id: hint.id, claimed_by: currentUserId, claim_type: "solo" });
      if (error) setClaims((prev) => prev.filter((c) => c.id !== tempId));
    }
    setClaiming(false);
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 backdrop-blur-sm min-[480px]:items-center min-[480px]:px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] rounded-t-[28px] min-[480px]:rounded-[28px] bg-[#fffaf7] border border-[#efdcd2] shadow-xl overflow-y-auto"
        style={{ maxHeight: "88dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end px-4 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full border border-[#ead8ce] text-slate-400"
          >
            ✕
          </button>
        </div>
        {hint.image_url ? (
          <HintImage
            src={hint.image_url}
            alt={hint.title}
            width={480}
            height={280}
            className="w-full h-auto"
            style={{ maxHeight: "280px", objectFit: "contain" }}
          />
        ) : (
          <div
            className="w-full bg-gradient-to-br from-[#ead8ca] to-[#c4a17f] flex items-center justify-center text-6xl"
            style={{ height: "200px" }}
          >
            🎁
          </div>
        )}
        <div className="p-5">
          {hint.starred && <p className="text-[11px] font-semibold text-[#ff875d] mb-1">⭐ Top pick</p>}
          <p className="text-[18px] font-semibold text-slate-900 leading-tight">{hint.title || "Hint"}</p>
          {hint.ownerName && (
            <div className="flex items-center gap-1.5 mt-1">
              {hint.ownerAvatarUrl ? (
                <div className="relative h-5 w-5 shrink-0 rounded-full overflow-hidden">
                  <HintImage src={hint.ownerAvatarUrl} alt={hint.ownerName} fill sizes="20px" className="object-cover" fallbackClassName="hidden" />
                </div>
              ) : (
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#efcdbf] to-[#bb8168] text-[9px] font-bold text-white">
                  {hint.ownerName.trim().charAt(0).toUpperCase()}
                </div>
              )}
              <p className="text-[12px] text-slate-500">Added by {hint.ownerName}</p>
            </div>
          )}
          {hint.retailer && <p className="text-[13px] text-slate-400 mt-1">{hint.retailer}</p>}
          {hint.numeric_price > 0 && (
            <p className="text-[16px] font-bold text-[#df7b59] mt-2">
              {new Intl.NumberFormat("en-GB", { style: "currency", currency: hint.currency || "GBP" }).format(hint.numeric_price)}
            </p>
          )}
          {(hint.size || hint.colour) && (
            <p className="text-[13px] text-slate-600 mt-2">
              {hint.size && <>📏 Size: <strong>{hint.size}</strong>{hint.size_type ? ` (${hint.size_type})` : ""}</>}
              {hint.size && hint.colour && "  ·  "}
              {hint.colour && <>🎨 Colour: <strong>{hint.colour}</strong></>}
            </p>
          )}
          {hint.occasions?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {hint.occasions.map((o) => (
                <span key={o} className="rounded-full bg-[#fff4ee] px-2.5 py-0.5 text-[11px] font-semibold text-[#df7b59]">{o}</span>
              ))}
            </div>
          )}
          {isViewingOther && (
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={claiming}
                onClick={handleToggleClaim}
                className={`flex-1 h-11 rounded-full text-[13px] font-semibold border transition ${myClaim ? "bg-[#edf6eb] text-[#4a7a3a] border-[#c5dfc0]" : otherClaim ? "bg-[#fff8ee] text-[#b87a2a] border-[#f0d9a0]" : "bg-[#fff4ee] text-[#df7b59] border-[#f0c9b5] hover:bg-[#ffe9db]"}`}
              >
                {myClaim ? "✓ On it" : otherClaim ? "Buy anyway?" : "I'm getting this"}
              </button>
              <button
                type="button"
                onClick={() => setGroupHintOpen(true)}
                className="flex-1 h-11 rounded-full border border-[#ead8ce] text-[13px] font-semibold text-slate-600 hover:bg-[#fff5f0]"
              >
                Get group together
              </button>
            </div>
          )}
          <div className="mt-3">
            <ShareButton
              supabase={client}
              subjectType="hint"
              subjectId={hint.id}
              path={`/h/${hint.id}`}
              title={hint.title}
              sharerName={hint.ownerName}
              currentUserId={currentUserId}
              label="Share this hint"
              className="w-full h-11 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[13px] font-semibold text-white flex items-center justify-center gap-1.5 shadow-md hover:brightness-105"
            />
          </div>
          {hint.url && (
            <a
              href={hint.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                supabase &&
                trackRetailerClick(supabase, {
                  userId: currentUserId,
                  hintId: hint.id,
                  url: hint.url,
                  retailer: hint.retailer,
                  source,
                })
              }
              className="mt-3 h-11 flex items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[13px] font-semibold text-white shadow-lg"
            >
              Open
            </a>
          )}
        </div>
      </div>
      {groupHintOpen && (
        <GroupHintModal
          hint={hint}
          recipientUserId={hint.ownerId}
          recipientName={hint.ownerName}
          currentUserId={currentUserId}
          onClose={() => setGroupHintOpen(false)}
          onSent={(count) => {
            setGroupHintOpen(false);
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
    </div>
  );
}
