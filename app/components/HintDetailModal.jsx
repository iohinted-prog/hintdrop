"use client";
import { useMemo } from "react";
import HintImage from "./HintImage";
import ShareButton from "./ShareButton";
import { createClient } from "../../lib/supabase/client";
import { trackRetailerClick } from "../../lib/trackRetailerClick";

// The one shared "view a single hint" modal. Any place that renders a hint
// as a small tile — feed cards, contact hint previews, circle members, etc.
// — should open this on click rather than falling through to a parent
// container's own click handler (a profile-open, a card-open, whatever it
// might be). Originally this lived duplicated inline in FeedClient; pulled
// out so every tile click site shares one implementation instead of each
// one silently drifting from (or missing) the others.
//
// Share is always shown — every hint detail view is a share opportunity,
// so this creates its own client if a caller doesn't pass one, rather than
// silently hiding the button whenever `supabase` is omitted.
export default function HintDetailModal({ hint, onClose, supabase, currentUserId, source = "unknown" }) {
  const client = useMemo(() => supabase || createClient(), [supabase]);
  if (!hint) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] rounded-t-[28px] sm:rounded-[28px] bg-[#fffaf7] border border-[#efdcd2] shadow-xl overflow-y-auto"
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
          <p className="text-[18px] font-semibold text-slate-900 leading-tight">{hint.title || "Hint"}</p>
          {hint.retailer && <p className="text-[13px] text-slate-400 mt-1">{hint.retailer}</p>}
          {supabase && (
            <div className="mt-4">
              <ShareButton
                supabase={supabase}
                subjectType="hint"
                subjectId={hint.id}
                path={`/h/${hint.id}`}
                title={hint.title}
                currentUserId={currentUserId}
                icon="↗"
                label="Share this hint"
                className="w-full h-11 rounded-full border border-[#ead8ce] bg-white text-[13px] font-semibold text-slate-700 flex items-center justify-center gap-1.5 hover:bg-[#fff5f0]"
              />
            </div>
          )}
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
    </div>
  );
}
