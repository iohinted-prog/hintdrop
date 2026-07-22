"use client";
export function getStarSign(birthday) {
  if (!birthday) return null;
  const d = new Date(birthday + "T00:00:00");
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if ((m === 3 && day >= 21) || (m === 4 && day <= 19)) return "♈ Aries";
  if ((m === 4 && day >= 20) || (m === 5 && day <= 20)) return "♉ Taurus";
  if ((m === 5 && day >= 21) || (m === 6 && day <= 20)) return "♊ Gemini";
  if ((m === 6 && day >= 21) || (m === 7 && day <= 22)) return "♋ Cancer";
  if ((m === 7 && day >= 23) || (m === 8 && day <= 22)) return "♌ Leo";
  if ((m === 8 && day >= 23) || (m === 9 && day <= 22)) return "♍ Virgo";
  if ((m === 9 && day >= 23) || (m === 10 && day <= 22)) return "♎ Libra";
  if ((m === 10 && day >= 23) || (m === 11 && day <= 21)) return "♏ Scorpio";
  if ((m === 11 && day >= 22) || (m === 12 && day <= 21)) return "♐ Sagittarius";
  if ((m === 12 && day >= 22) || (m === 1 && day <= 19)) return "♑ Capricorn";
  if ((m === 1 && day >= 20) || (m === 2 && day <= 18)) return "♒ Aquarius";
  return "♓ Pisces";
}
function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "C";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
const GRADIENTS = [
  "from-[#d9dfcf] via-[#b9c7aa] to-[#90a27e]",
  "from-[#ead8ca] via-[#dbc0a8] to-[#c4a17f]",
  "from-[#efe5de] via-[#e5d2c8] to-[#d1b2a4]",
  "from-[#d5dbee] via-[#b3c0df] to-[#8f9fc9]",
  "from-[#eadce8] via-[#d8bfd1] to-[#bb9ab6]",
];
export default function ContactCard({ contact, onOpenProfile, onDeleteClick, onEditClick, onMessageClick, previewHints = [] }) {
  const profileId = contact.profileId || contact.matchedProfileId || null;
  const isClickable = Boolean(profileId && !contact.isDemo && onOpenProfile);
  function handleClick() {
    if (isClickable) onOpenProfile({
      userId: profileId,
      name: contact.name,
      avatarUrl: contact.avatarUrl,
      initials: contact.initials || getInitials(contact.name),
    });
  }
  return (
    <article className="rounded-[22px] border border-[#f0dfd6] bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-[#e8c9bc]">
      <div className="flex items-center gap-3">
        <div className={`h-11 w-11 shrink-0 rounded-full overflow-hidden flex items-center justify-center ${isClickable ? "cursor-pointer" : ""}`} onClick={isClickable ? handleClick : undefined}>
          {contact.avatarUrl ? (
            <img src={contact.avatarUrl} alt={contact.name || "Contact"} className="h-11 w-11 rounded-full object-cover" />
          ) : (
            <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-b ${contact.colors || "from-[#efcdbf] to-[#bb8168]"} text-[12px] font-bold text-white`}>
              {contact.initials || getInitials(contact.name)}
            </div>
          )}
        </div>
        <div className={`min-w-0 flex-1 ${isClickable ? "cursor-pointer" : ""}`} onClick={isClickable ? handleClick : undefined}>
          <p className="text-sm font-semibold text-slate-900 truncate">{contact.name}</p>
          <p className="text-xs text-slate-500 truncate">{contact.role || "Friend"}{contact.note ? ` · ${contact.note}` : ""}</p>
          {contact.birthday && (
            <p className="text-[11px] text-[#df7b59] mt-0.5 truncate">
              🎂 {new Date(contact.birthday + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {getStarSign(contact.birthday)}
            </p>
          )}
          {isClickable && <p className="text-[11px] text-[#df7b59] mt-0.5">👁 See hints</p>}
        {previewHints.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5 md:hidden">
            {previewHints.slice(0, 2).map(h => (
              <div key={h.id} className="h-9 w-9 rounded-[8px] overflow-hidden border border-[#f0dfd6] shrink-0 bg-[#fffaf7]">
                {h.image_url
                  ? <img src={h.image_url} alt={h.title} className="h-full w-full object-cover" />
                  : <div className="h-full w-full flex items-center justify-center text-sm bg-gradient-to-br from-[#ead8ca] to-[#c4a17f]">🎁</div>
                }
              </div>
            ))}
            {previewHints.length > 2 && (
              <span className="text-[11px] font-semibold text-slate-400">+{previewHints.length - 2}</span>
            )}
          </div>
        )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onMessageClick && profileId && (
            <button type="button" onClick={e => { e.stopPropagation(); onMessageClick(contact); }}
              className="h-8 w-8 flex items-center justify-center rounded-full border border-[#ead8ce] text-slate-400 hover:bg-[#fff5f0] hover:text-[#ff875d]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </button>
          )}
          {onEditClick && (
            <button type="button" onClick={e => { e.stopPropagation(); onEditClick(contact); }}
              className="h-8 w-8 flex items-center justify-center rounded-full border border-[#ead8ce] text-slate-400 hover:bg-[#fff5f0] text-sm">✎</button>
          )}
          {onDeleteClick && (
            <button type="button" onClick={e => { e.stopPropagation(); onDeleteClick(contact); }}
              className="h-8 w-8 flex items-center justify-center rounded-full border border-[#ead8ce] text-slate-400 hover:bg-[#fff0f0] hover:text-[#b14f43] text-sm">✕</button>
          )}
        </div>
      </div>
      {/* Desktop: larger square hint previews */}
      {previewHints.length > 0 && (
        <div className="hidden md:grid grid-cols-3 gap-2 mt-3 cursor-pointer" onClick={isClickable ? handleClick : undefined}>
          {previewHints.slice(0, 3).map((h, i) => (
            <div key={h.id} className="relative overflow-hidden rounded-[14px] bg-[#fffaf7] border border-[#f0dfd6]" style={{ aspectRatio: "1/1" }}>
              {h.image_url
                ? <img src={h.image_url} alt={h.title} className="absolute inset-0 h-full w-full object-cover" />
                : <div className={`absolute inset-0 bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} flex items-center justify-center text-2xl opacity-80`}>🎁</div>
              }
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(16,12,10,0.7)_0%,rgba(255,255,255,0)_50%)]" />
              <p className="absolute inset-x-0 bottom-0 p-2 text-[10px] font-semibold text-white leading-tight line-clamp-2">{h.title}</p>
            </div>
          ))}
          {previewHints.slice(0, 3).length < 3 && Array.from({ length: 3 - previewHints.slice(0, 3).length }).map((_, i) => (
            <div key={`empty-${i}`} className="rounded-[14px] bg-[#fdf5f0] border border-[#f0dfd6]" style={{ aspectRatio: "1/1" }} />
          ))}
        </div>
      )}
      {isClickable && previewHints.length === 0 && (
        <div className="hidden md:flex mt-3 rounded-[14px] bg-[#fdf5f0] border border-[#f0dfd6] items-center justify-center py-6 text-[11px] text-slate-400 cursor-pointer" onClick={handleClick}>
          No hints yet
        </div>
      )}
    </article>
  );
}
