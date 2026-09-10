// Named, keyed palette (not just an array) so a color can be
// persisted in the database as a stable key ("sage", "coral") rather
// than raw hex values - if the palette's exact shades ever get tuned
// later, every existing user's stored choice still resolves correctly
// rather than needing a data migration too.
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

// A registered person's persisted choice (profiles.avatar_color) is
// the source of truth wherever it's set. A key that's missing or not
// recognized (an existing account from before this column existed)
// falls back to a deterministic hash of their id, so the color is
// still consistent everywhere even before they've been assigned one
// for real - and a non-user (email-only invite, no account) always
// gets the sand gradient instead, regardless of key.
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

export function randomAvatarColorKey() {
  return PALETTE_KEYS[Math.floor(Math.random() * PALETTE_KEYS.length)];
}

// The shared sand/tan gradient used for non-users (email-only
// invites, not yet a HintDrop account).
export const NON_USER_AVATAR_COLOR = { from: "#efcdbf", to: "#bb8168" };
