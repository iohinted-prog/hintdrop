"use client";
import Link from "next/link";
import HintImage from "./HintImage";
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

// Same pastel family used on the Calendar page's colour picker, mapped
// to relationship types for a bit of coordinated colour across the app
// rather than every card looking the same.
const ROLE_COLORS = {
  partner: { bg: "#ffb3b3", text: "#a15252" },
  spouse: { bg: "#ffb3b3", text: "#a15252" },
  family: { bg: "#ffd6a5", text: "#9a6a2e" },
  friend: { bg: "#a0c4ff", text: "#3c5a8a" },
  colleague: { bg: "#caffbf", text: "#3f7a3a" },
};
function roleColor(role) {
  return ROLE_COLORS[String(role || "").toLowerCase()] || { bg: "#bdb2ff", text: "#5c4f8a" };
}
export default function ContactCard({ contact, onOpenProfile, onDeleteClick, onEditClick, onMessageClick, previewBoards = [] }) {
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
    <article className="rounded-[22px] border border-[#f0dfd6] bg-white p-4 md:p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-[#e8c9bc]">
      <div className="flex items-center gap-3 md:gap-4">
        <div className={`h-11 w-11 md:h-14 md:w-14 shrink-0 rounded-full overflow-hidden flex items-center justify-center ${isClickable ? "cursor-pointer" : ""}`} onClick={isClickable ? handleClick : undefined}>
          {contact.avatarUrl ? (
            <HintImage src={contact.avatarUrl} alt={contact.name || "Contact"} width={56} height={56} className="rounded-full object-cover" />
          ) : (
            <div className={`flex h-11 w-11 md:h-14 md:w-14 items-center justify-center rounded-full bg-gradient-to-b ${contact.colors || "from-[#efcdbf] to-[#bb8168]"} text-[12px] md:text-[15px] font-bold text-white`}>
              {contact.initials || getInitials(contact.name)}
            </div>
          )}
        </div>
        <div className={`min-w-0 flex-1 ${isClickable ? "cursor-pointer" : ""}`} onClick={isClickable ? handleClick : undefined}>
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm md:text-[16px] font-semibold text-slate-900 truncate">{contact.name}</p>
            <span
              className="text-[10px] md:text-[11px] font-semibold rounded-full px-2 py-0.5 shrink-0"
              style={{ backgroundColor: roleColor(contact.role).bg + "66", color: roleColor(contact.role).text }}
            >
              {contact.role || "Friend"}
            </span>
          </div>
          {contact.note && contact.note !== contact.role && <p className="text-xs md:text-[13px] text-slate-500 truncate mt-0.5">{contact.note}</p>}
          {contact.birthday && (
            <p className="text-[11px] md:text-[12px] text-[#df7b59] mt-0.5 truncate flex items-center gap-1.5">
              <span>
                🎂 {new Date(contact.birthday + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {getStarSign(contact.birthday)}
              </span>
              {contact.daysUntilBirthday != null && contact.daysUntilBirthday <= 30 && (
                <span className="rounded-full bg-[#fdece0] px-2 py-0.5 text-[10px] md:text-[11px] font-semibold text-[#c9633f] shrink-0">
                  {contact.daysUntilBirthday === 0 ? "Today!" : contact.daysUntilBirthday === 1 ? "Tomorrow" : `in ${contact.daysUntilBirthday} days`}
                </span>
              )}
            </p>
          )}
          {isClickable && <p className="text-[11px] text-[#df7b59] mt-0.5">👁 See hints</p>}
        </div>
        {/* Desktop-only preview tiles, in the same row as the avatar
            rather than a separate row below (was hidden md:flex ... mt-3,
            spanning the full card width underneath everything else) -
            also sized up slightly (was h-14/56px, now h-16/64px). Mobile
            dropped its own separate small-tile preview entirely (was
            36px tiles inline under the name/role text) - not needed
            there per request. */}
        {previewBoards.length > 0 ? (
          <div className="hidden md:flex gap-2 shrink-0">
            {previewBoards.slice(0, 6).map((b, i) => {
              const overflowCount = previewBoards.length - 6;
              const showOverflowBadge = i === 5 && overflowCount > 0;
              return (
                <Link
                  key={b.id}
                  href={profileId ? `/profile/${profileId}?board=${b.id}` : "#"}
                  onClick={(e) => e.stopPropagation()}
                  className="relative h-16 w-16 md:h-20 md:w-20 shrink-0 overflow-hidden rounded-[10px] border border-[#f0dfd6] bg-[#fffaf7]"
                >
                  {b.previewImage
                    ? <HintImage src={b.previewImage} alt={b.title} fill className="object-cover" sizes="64px" fallbackClassName="text-base" />
                    : <div className={`absolute inset-0 bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} flex items-center justify-center text-base opacity-80`}>📋</div>
                  }
                  {showOverflowBadge ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/55">
                      <p className="text-[13px] font-bold text-white">+{overflowCount}</p>
                    </div>
                  ) : (
                    <>
                      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(16,12,10,0.55)_0%,rgba(255,255,255,0)_55%)]" />
                      <p className="absolute inset-x-0 bottom-0 p-1 text-[8px] font-semibold text-white leading-tight line-clamp-2">{b.title}</p>
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        ) : isClickable && (
          <p className="hidden md:block shrink-0 cursor-pointer text-[11px] text-slate-400" onClick={handleClick}>
            No hints saved yet
          </p>
        )}
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
    </article>
  );
}
