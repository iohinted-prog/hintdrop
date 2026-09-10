// Mirrors lib/avatarColor.js on the web app exactly - same palette
// keys, same hash function - so the same person's color is identical
// whether viewed on web or mobile, since profiles.avatar_color is a
// shared database value read by both.
export const AVATAR_PALETTE = {
  coral: { from: "#f19a78", to: "#df7b59" },
  sage: { from: "#8fb8a8", to: "#5f9080" },
  periwinkle: { from: "#a3a8d6", to: "#6f76b3" },
  rose: { from: "#e8a0b4", to: "#c96e88" },
  amber: { from: "#f0c674", to: "#d19a3a" },
  sky: { from: "#8fc4d6", to: "#4f96ac" },
  lilac: { from: "#c2a3d6", to: "#8f66ac" },
  olive: { from: "#a8bd7a", to: "#7a934a" },
};

const PALETTE_KEYS = Object.keys(AVATAR_PALETTE);

export function resolveAvatarColor({ avatarColor, id } = {}) {
  if (avatarColor && AVATAR_PALETTE[avatarColor]) return AVATAR_PALETTE[avatarColor];
  return avatarColorFor(id);
}

export function avatarColorFor(key) {
  const str = String(key || "");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_PALETTE[PALETTE_KEYS[Math.abs(hash) % PALETTE_KEYS.length]];
}

// Non-users (email-only invites, no matched HintDrop account) always
// get this sand gradient instead of a personal color.
export const NON_USER_AVATAR_COLOR = { from: "#efcdbf", to: "#bb8168" };
