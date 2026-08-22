// Builds the actual message text used across every share channel. Used to
// be a random rotation of first-person phrases ("what I'd like", "leaving
// this here") — that framing silently assumed the sharer was always
// sharing their own wishlist, which breaks the moment a Hints list is
// curated for someone else (sharing a hint from "Present for Sarah" as if
// it were your own thing to want is actively confusing). This is always
// contextual instead: who it's from, and what it is.
export function buildShareText({ sharerName, title }) {
  const name = (sharerName || "").trim() || "Someone";
  return title ? `${name}'s hint: "${title}"` : `${name}'s hint`;
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

// Non-destructive read — used at signup time to embed context into the
// email confirmation redirect URL itself (see AuthModal), since relying on
// localStorage alone breaks the moment someone opens the confirmation link
// in a different browser or app than where they started (extremely common
// — WhatsApp browser to sign up, then Mail app to confirm). The URL-based
// copy survives that; consumeShareContext() below remains the primary path
// for same-browser flows and is what actually clears the stored value once
// used.
export function peekShareContext() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SHARE_CONTEXT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
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
