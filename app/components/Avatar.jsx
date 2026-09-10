"use client";
import HintImage from "./HintImage";
import { resolveAvatarColor, NON_USER_AVATAR_COLOR } from "../../lib/avatarColor";

function getInitials(name) {
  return String(name || "").trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("");
}

// Single shared source of truth for avatar rendering - a photo when
// set, otherwise a color fallback with initials. isUser distinguishes
// a real HintDrop account (gets a persisted, personal color) from a
// non-user like an email-only invite (always the sand gradient),
// per the rule: color is earned by having an account, not by having
// a name.
export default function Avatar({ name, avatarUrl, avatarColor, userId, isUser = true, size = 40, className = "" }) {
  const colors = isUser ? resolveAvatarColor({ avatarColor, id: userId }) : NON_USER_AVATAR_COLOR;
  const px = `${size}px`;

  if (avatarUrl) {
    return (
      <div className={`relative shrink-0 overflow-hidden rounded-full ${className}`} style={{ width: px, height: px }}>
        <HintImage src={avatarUrl} alt={name || "Avatar"} fill className="object-cover" sizes={px} fallbackClassName="hidden" />
      </div>
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${className}`}
      style={{ width: px, height: px, fontSize: Math.max(10, Math.round(size * 0.36)), background: `linear-gradient(to bottom, ${colors.from}, ${colors.to})` }}
    >
      {getInitials(name) || "?"}
    </div>
  );
}
