const SHARE_PHRASES = [
  "Leaving this here for future reference 👀",
  "Tiny hint for anyone wondering what I'd like 🎁",
  "This would be perfect — what do we think?",
];

export function randomSharePhrase() {
  return SHARE_PHRASES[Math.floor(Math.random() * SHARE_PHRASES.length)];
}

const SHARE_CONTEXT_KEY = "hintdrop_share_context";

// Called on a public share preview page — bridges the gap between an
// anonymous visit and a possible signup minutes, hours, or days later.
// Overwrites on every visit, so the most recently opened share wins if
// someone clicks multiple links before eventually signing up.
// ownerUserId is optional (a hint/board's owner isn't known until its data
// loads, so callers often call this twice — once early with just the
// subject, again once the owner is known) — it's what lets onboarding
// auto-send a contact request to the right person after signup, without
// an extra lookup.
export function recordShareContext(subjectType, subjectId, ownerUserId) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SHARE_CONTEXT_KEY, JSON.stringify({ subjectType, subjectId, ownerUserId: ownerUserId || null, at: Date.now() }));
  } catch {
    // best-effort — attribution is a nice-to-have, never worth breaking the page over
  }
}

// Called once, at the moment a genuinely new account reaches onboarding.
// Reads and clears in one step so it can never be double-counted.
export function consumeShareContext() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SHARE_CONTEXT_KEY);
    localStorage.removeItem(SHARE_CONTEXT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
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

export function facebookShareUrl(url) {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function twitterShareUrl(url, text) {
  return `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}${text ? `&text=${encodeURIComponent(text)}` : ""}`;
}

export function emailShareUrl(url, text, subject) {
  const body = text ? `${text}\n\n${url}` : url;
  return `mailto:?subject=${encodeURIComponent(subject || "Take a look at this")}&body=${encodeURIComponent(body)}`;
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
