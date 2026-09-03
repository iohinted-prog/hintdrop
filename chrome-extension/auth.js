// Plain fetch() calls to Supabase's Auth REST API, rather than pulling in
// the full @supabase/supabase-js library - that library's meant to be used
// with a bundler, and we're deliberately keeping this extension buildstep-
// free for now (plain HTML/JS files Chrome can load directly). These are
// the same REST endpoints that library calls under the hood anyway.

// Logs in with email + password, stores the resulting session in the
// extension's own local storage (separate from the browser's cookies -
// chrome.storage.local persists across popup opens/closes, browser
// restarts, until explicitly cleared).
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

  await chrome.storage.local.set({
    hintdrop_session: {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user_id: data.user?.id,
      email: data.user?.email,
    },
  });

  return data.user;
}

// Returns the stored session if one exists, or null. Doesn't verify the
// token is still valid against Supabase - that check happens naturally
// the first time it's actually used for a real request (stage 4), where
// a 401 response means the stored token has expired and login() needs to
// run again. Keeping this stage focused on "log in and remember me."
async function getStoredSession() {
  const { hintdrop_session } = await chrome.storage.local.get("hintdrop_session");
  return hintdrop_session || null;
}

async function logout() {
  await chrome.storage.local.remove("hintdrop_session");
}
