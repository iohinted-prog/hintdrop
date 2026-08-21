"use client";
import { useState } from "react";
import { buildShareUrl, whatsappShareUrl, facebookShareUrl, twitterShareUrl, emailShareUrl, nativeShare, copyToClipboard, trackShareEvent, buildShareText } from "../../lib/share";

export default function ShareButton({
  supabase,
  subjectType,
  subjectId,
  path,
  title,
  sharerName,
  text,
  currentUserId,
  className = "inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-5 text-[13px] font-semibold text-white shadow-md transition hover:brightness-105",
  label = "Share",
  icon = "",
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  // An explicit text prop always wins — for cases that aren't really "a
  // hint" (an invite link, say), the default "X's hint" template doesn't
  // fit and the caller needs to say something else entirely
  const shareText = text || buildShareText({ sharerName, title });

  function startShare() {
    const { url, token } = buildShareUrl(path);
    trackShareEvent(supabase, { eventType: "share_clicked", subjectType, subjectId, shareToken: token, viewerUserId: currentUserId });
    return { url, token };
  }

  async function handleMainClick(e) {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.share) {
      const { url } = startShare();
      await nativeShare({ title, text: shareText, url });
      return;
    }
    setOpen((v) => !v);
  }

  function handleWhatsApp(e) {
    e.stopPropagation();
    const { url } = startShare();
    window.open(whatsappShareUrl(url, shareText), "_blank");
    setOpen(false);
  }

  function handleFacebook(e) {
    e.stopPropagation();
    const { url } = startShare();
    window.open(facebookShareUrl(url), "_blank", "width=580,height=520");
    setOpen(false);
  }

  function handleTwitter(e) {
    e.stopPropagation();
    const { url } = startShare();
    window.open(twitterShareUrl(url, shareText), "_blank", "width=580,height=520");
    setOpen(false);
  }

  function handleEmail(e) {
    e.stopPropagation();
    const { url } = startShare();
    window.location.href = emailShareUrl(url, shareText, title);
    setOpen(false);
  }

  function handleSMS(e) {
    e.stopPropagation();
    const { url } = startShare();
    window.location.href = `sms:?&body=${encodeURIComponent(`${shareText} ${url}`)}`;
    setOpen(false);
  }

  async function handleCopy(e) {
    e.stopPropagation();
    const { url } = startShare();
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <div className="relative">
      <button type="button" onClick={handleMainClick} className={className}>
        {icon && <span>{icon}</span>} {label}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div className="absolute z-50 mt-2 right-0 w-64 rounded-[20px] border border-[#efdcd2] bg-white shadow-[0_18px_50px_rgba(173,101,72,0.18)] p-3">
            {title && (
              <p className="px-1 pb-2 text-[12px] font-semibold text-slate-400">
                Share{title ? ` "${title}"` : ""}
              </p>
            )}

            {/* WhatsApp first and visually distinct — the dominant channel
                for this audience, so it earns the strongest visual weight
                rather than sitting in a plain list with everything else */}
            <button
              type="button"
              onClick={handleWhatsApp}
              className="w-full flex items-center gap-2.5 rounded-[14px] bg-[#25D366] px-3.5 py-3 text-sm font-bold text-white shadow-sm hover:brightness-105"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-[16px]">💬</span>
              Share on WhatsApp
            </button>

            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <button type="button" onClick={handleFacebook} className="flex items-center gap-2 rounded-[12px] px-2.5 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-[#fff5f0]">
                <span className="text-[16px]">📘</span> Facebook
              </button>
              <button type="button" onClick={handleTwitter} className="flex items-center gap-2 rounded-[12px] px-2.5 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-[#fff5f0]">
                <span className="text-[16px]">𝕏</span> X
              </button>
              <button type="button" onClick={handleSMS} className="flex items-center gap-2 rounded-[12px] px-2.5 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-[#fff5f0]">
                <span className="text-[16px]">✉️</span> Messages
              </button>
              <button type="button" onClick={handleEmail} className="flex items-center gap-2 rounded-[12px] px-2.5 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-[#fff5f0]">
                <span className="text-[16px]">📧</span> Email
              </button>
            </div>

            <button type="button" onClick={handleCopy} className="mt-1.5 w-full flex items-center gap-2.5 rounded-[12px] border border-[#f0dfd6] px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-[#fff5f0]">
              <span className="text-[16px]">🔗</span> {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
