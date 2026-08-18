const STORAGE_KEY = "hintdrop_recent_profiles";
const MAX_RECENTS = 3;

export function recordProfileVisit({ userId, name, avatarUrl, initials }) {
  if (typeof window === "undefined" || !userId) return;
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const withoutThisUser = existing.filter((p) => p.userId !== userId);
    const updated = [{ userId, name, avatarUrl, initials, visitedAt: Date.now() }, ...withoutThisUser].slice(0, MAX_RECENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage unavailable or full — recents are a nice-to-have, fail silently
  }
}

export function getRecentProfiles() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}
