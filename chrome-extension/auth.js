// Cian's HintDrop account uses Google sign-in only, no password - so an
// email+password login form (the original stage 3 plan) doesn't work for
// him, and likely doesn't for many users who sign in with Google. Fix:
// don't ask for a separate login at all. If he's logged into hintdrop.app
// in this same browser (which he already is), read that existing session
// straight out of the cookie the web app itself already set - no new
// login flow needed, works regardless of which method (Google, email/
// password) was originally used to sign in.
//
// @supabase/ssr's createBrowserClient (used by the main app) stores the
// session in a cookie named sb-<project-ref>-auth-token, via plain
// document.cookie (not httpOnly) - confirmed from Supabase's own SSR
// package source. Two wrinkles to handle, both real and documented:
// 1. If the session is too large for one cookie (~3180 bytes), it's split
//    across sb-<ref>-auth-token.0, .1, .2, etc.
// 2. The value is often prefixed with "base64-" and base64url-encoded.
// This follows Supabase's own documented extraction approach for exactly
// this scenario (reading their SSR cookie format from outside their own
// client library).
const BASE64_PREFIX = "base64-";

async function getCookieValue(name) {
  const cookie = await chrome.cookies.get({ url: "https://hintdrop.app", name });
  return cookie?.value || null;
}

async function getSessionFromWebCookie() {
  const ref = new URL(SUPABASE_URL).hostname.split(".")[0];
  const storageKey = `sb-${ref}-auth-token`;

  let raw = await getCookieValue(storageKey);

  // Not found as a single cookie - try reassembling it from chunks.
  if (!raw) {
    const chunks = [];
    for (let i = 0; ; i++) {
      const chunk = await getCookieValue(`${storageKey}.${i}`);
      if (!chunk) break;
      chunks.push(chunk);
    }
    if (chunks.length > 0) raw = chunks.join("");
  }

  if (!raw) return null;

  let decoded = raw;
  if (decoded.startsWith(BASE64_PREFIX)) {
    try {
      const base64 = decoded.substring(BASE64_PREFIX.length).replace(/-/g, "+").replace(/_/g, "/");
      decoded = atob(base64);
    } catch {
      return null;
    }
  }

  try {
    const session = JSON.parse(decoded);
    if (!session?.access_token) return null;
    return {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      user_id: session.user?.id,
      email: session.user?.email,
    };
  } catch {
    return null;
  }
}

// Kept as a fallback for the (probably rare) case of an actual email+
// password account, alongside the cookie-read approach above which
// covers Google sign-in and every other method - reading the existing
// web session works regardless of how someone originally signed in, so
// this manual form only matters if they're not currently logged into
// hintdrop.app in this browser at all.
async function login(email, password) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error_description || data?.msg || "Login failed. Check your email and password.");
  }

  const session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    user_id: data.user?.id,
    email: data.user?.email,
  };

  await chrome.storage.local.set({ hintdrop_session: session });
  return session;
}

async function getStoredSession() {
  const { hintdrop_session } = await chrome.storage.local.get("hintdrop_session");
  return hintdrop_session || null;
}

async function storeSession(session) {
  await chrome.storage.local.set({ hintdrop_session: session });
}

async function logout() {
  await chrome.storage.local.remove("hintdrop_session");
}
