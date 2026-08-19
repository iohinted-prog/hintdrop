const SHARE_PHRASES = [
  "Leaving this here for future reference 👀",
  "Tiny hint for anyone wondering what I'd like 🎁",
  "This would be perfect — what do we think?",
];

export function randomSharePhrase() {
  return SHARE_PHRASES[Math.floor(Math.random() * SHARE_PHRASES.length)];
}

export function buildShareUrl(path) {
  const token = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  const base = typeof window !== "undefined" ? window.location.origin : "https://hintdrop.app";
  const url = new URL(path, base);
  url.searchParams.set("s", token);
  return { url: url.toString(), token };
}

export function whatsappShareUrl(url, text) {
  return `https://wa.me/?text=${encodeURIComponent(text ? `${text} ${url}` : url)}`;
}

export async function trackShareEvent(supabase, { eventType, subjectType, subjectId, shareToken, viewerUserId }) {
  if (!supabase) return;
  try {
    supabase.from("share_events").insert({
      event_type: eventType,
      subject_type: subjectType,
      subject_id: subjectId,
      share_token: shareToken || null,
      viewer_user_id: viewerUserId || null,
    }).then(({ error }) => {
      if (error) console.error("trackShareEvent failed:", error);
    });
  } catch {
    // never let tracking break the share flow
  }
}

// Opens the native OS share sheet if available (mobile browsers, some
// desktop browsers). Returns true if it was used, false if the caller
// should fall back to something else (e.g. copy to clipboard).
export async function nativeShare({ title, text, url }) {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch {
      // user cancelled the share sheet — not an error worth surfacing
      return true;
    }
  }
  return false;
}

export async function copyToClipboard(text) {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
