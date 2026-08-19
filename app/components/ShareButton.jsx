"use client";
import { useState } from "react";
import { buildShareUrl, whatsappShareUrl, nativeShare, copyToClipboard, trackShareEvent, randomSharePhrase } from "../../lib/share";

export default function ShareButton({
  supabase,
  subjectType,
  subjectId,
  path,
  title,
  currentUserId,
  className = "",
  label = "Share",
  icon = "🔗",
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function startShare() {
    const { url, token } = buildShareUrl(path);
    trackShareEvent(supabase, { eventType: "share_clicked", subjectType, subjectId, shareToken: token, viewerUserId: currentUserId });
    return { url, token };
  }

  async function handleMainClick(e) {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.share) {
      const { url } = startShare();
      await nativeShare({ title, text: randomSharePhrase(), url });
      return;
    }
    setOpen((v) => !v);
  }

  function handleWhatsApp(e) {
    e.stopPropagation();
    const { url } = startShare();
    window.open(whatsappShareUrl(url, randomSharePhrase()), "_blank");
    setOpen(false);
  }

  function handleSMS(e) {
    e.stopPropagation();
    const { url } = startShare();
    window.location.href = `sms:?&body=${encodeURIComponent(`${randomSharePhrase()} ${url}`)}`;
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
        <span>{icon}</span> {label}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div className="absolute z-50 mt-2 right-0 w-52 rounded-[18px] border border-[#efdcd2] bg-white shadow-lg p-1.5">
            <button type="button" onClick={handleWhatsApp} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[12px] text-sm font-semibold text-slate-700 hover:bg-[#fff5f0]">
              <span className="text-[17px]">💬</span> WhatsApp
            </button>
            <button type="button" onClick={handleSMS} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[12px] text-sm font-medium text-slate-700 hover:bg-[#fff5f0]">
              <span className="text-[17px]">✉️</span> Messages
            </button>
            <button type="button" onClick={handleCopy} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[12px] text-sm font-medium text-slate-700 hover:bg-[#fff5f0]">
              <span className="text-[17px]">🔗</span> {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
