"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import PublicShell from "../../components/PublicShell";
import HintImage from "../../components/HintImage";
import { createClient } from "../../../lib/supabase/client";
import { trackShareEvent, recordShareContext } from "../../../lib/share";
import { trackRetailerClick } from "../../../lib/trackRetailerClick";

export default function HintPreviewClient({ hintId }) {
  const supabase = createClient();
  const [hint, setHint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    recordShareContext("hint", hintId);
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const { data } = await supabase
        .from("hints")
        .select("id, title, image_url, retailer, numeric_price, currency, url, occasions, user_id, profiles(full_name, avatar_url)")
        .eq("id", hintId)
        .eq("is_private", false)
        .maybeSingle();
      setHint(data);
      setLoading(false);

      if (data) {
        trackShareEvent(supabase, { eventType: "share_link_opened", subjectType: "hint", subjectId: hintId, viewerUserId: user?.id });
      }
    }
    load();
  }, [hintId]);

  async function handleSaveToCircle() {
    if (!currentUser || !hint?.user_id) return;
    await supabase.from("contacts").insert({
      owner_user_id: currentUser.id,
      profile_id: hint.user_id,
      name: hint.profiles?.full_name || "New contact",
    });
    trackShareEvent(supabase, { eventType: "hint_saved_from_share", subjectType: "hint", subjectId: hintId, viewerUserId: currentUser.id });
    setSaved(true);
  }

  const ownerName = hint?.profiles?.full_name || "Someone";
  const price = hint?.numeric_price > 0
    ? new Intl.NumberFormat("en-GB", { style: "currency", currency: hint.currency || "GBP" }).format(hint.numeric_price)
    : null;

  return (
    <PublicShell>
      <div className="mx-auto max-w-[480px] px-4 py-10">
        {loading ? (
          <p className="text-center text-sm text-slate-400 py-16">Loading...</p>
        ) : !hint ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🎁</p>
            <p className="text-[18px] font-semibold text-slate-900">This hint isn't available</p>
            <p className="mt-1 text-sm text-slate-500">It may be private, or no longer exists.</p>
            <Link href="/" className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-6 text-sm font-semibold text-white shadow-lg">
              Explore HintDrop
            </Link>
          </div>
        ) : (
          <div className="rounded-[28px] border border-[#efdcd2] bg-white shadow-sm overflow-hidden">
            <div className="relative w-full" style={{ aspectRatio: "4/3" }}>
              <HintImage src={hint.image_url} alt={hint.title} fill className="object-cover" sizes="480px" fallbackClassName="text-5xl" />
            </div>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="relative h-8 w-8 rounded-full overflow-hidden shrink-0">
                  <HintImage src={hint.profiles?.avatar_url} alt={ownerName} fill sizes="32px" className="object-cover" fallbackClassName="text-sm" />
                </div>
                <p className="text-[13px] text-slate-500">Added by <span className="font-semibold text-slate-700">{ownerName}</span></p>
              </div>

              <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-slate-900 leading-tight">{hint.title || "Hint"}</h1>
              {hint.retailer && <p className="mt-1 text-[13px] text-slate-400">{hint.retailer}</p>}
              {price && <p className="mt-2 text-[17px] font-bold text-[#df7b59]">{price}</p>}

              {hint.occasions?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {hint.occasions.map((o) => (
                    <span key={o} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#fff4ee] text-[#df7b59]">{o}</span>
                  ))}
                </div>
              )}

              <div className="mt-5 flex flex-col gap-2.5">
                {hint.url && (
                  <a
                    href={hint.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackRetailerClick(supabase, { userId: currentUser?.id, hintId: hint.id, url: hint.url, retailer: hint.retailer, source: "shared_hint" })}
                    className="h-11 flex items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-sm font-semibold text-white shadow-lg"
                  >
                    Open item
                  </a>
                )}
                <Link href={"/profile/" + hint.user_id} className="h-11 flex items-center justify-center rounded-full border border-[#ead8ce] text-sm font-semibold text-slate-700 hover:bg-[#fff5f0]">
                  See {ownerName.split(" ")[0]}'s other Hints
                </Link>
                {currentUser ? (
                  <button type="button" onClick={handleSaveToCircle} disabled={saved}
                    className="h-11 flex items-center justify-center rounded-full border border-[#ead8ce] text-sm font-semibold text-slate-700 hover:bg-[#fff5f0] disabled:opacity-60">
                    {saved ? "Saved to your Circle ✓" : `Save ${ownerName.split(" ")[0]} to your Circle`}
                  </button>
                ) : (
                  <Link href="/" className="h-11 flex items-center justify-center rounded-full border border-[#ead8ce] text-sm font-semibold text-slate-700 hover:bg-[#fff5f0]">
                    Sign up to save to your Circle
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </PublicShell>
  );
}
