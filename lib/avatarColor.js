// Deterministic avatar fallback color, keyed off a stable id (user id
// preferred, name as a fallback) so the same person always gets the
// same color rather than it varying by render/context. Reserved apart
// from the sand/tan gradient used elsewhere in the app specifically
// for non-users (an email invite for someone who hasn't signed up
// yet) - a registered person without an avatar photo gets one of
// these instead, so the two cases read as visually distinct.
const PALETTE = [
  ["#f19a78", "#df7b59"], // coral
  ["#8fb8a8", "#5f9080"], // sage
  ["#a3a8d6", "#6f76b3"], // periwinkle
  ["#e8a0b4", "#c96e88"], // rose
  ["#f0c674", "#d19a3a"], // amber
  ["#8fc4d6", "#4f96ac"], // sky
  ["#c2a3d6", "#8f66ac"], // lilac
  ["#a8bd7a", "#7a934a"], // olive
];

export function avatarColorFor(key) {
  const str = String(key || "");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const [from, to] = PALETTE[Math.abs(hash) % PALETTE.length];
  return { from, to };
}

// The shared sand/tan gradient used for non-users (email-only
// invites, not yet a HintDrop account) - unchanged, just centralized
// here so both cases live next to each other.
export const NON_USER_AVATAR_COLOR = { from: "#efcdbf", to: "#bb8168" };
