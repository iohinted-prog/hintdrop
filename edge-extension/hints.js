// Direct PostgREST calls against Supabase's REST API, same reasoning as
// auth.js: no bundler, so no @supabase/supabase-js SDK - plain fetch()
// with the same headers that library builds under the hood anyway.
// The access_token from the read session is what lets Supabase's RLS
// policies resolve auth.uid() correctly, same as any other authenticated
// request to this project.

// Wraps a fetch to Supabase's REST API with automatic token-refresh:
// if the access_token has expired (401), refreshes it via refreshSession()
// and retries exactly once with the new token. Mutates the passed-in
// session object in place with the refreshed tokens, so the caller's
// reference (popup.js's currentSession) stays current for any further
// calls in the same popup session too, not just this one.
async function authorizedFetch(session, url, options = {}) {
  async function attempt() {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
    });
  }

  let response = await attempt();

  if (response.status === 401) {
    const refreshed = await refreshSession(session);
    session.access_token = refreshed.access_token;
    session.refresh_token = refreshed.refresh_token;
    response = await attempt();
  }

  return response;
}

async function fetchBoards(session) {
  const url = `${SUPABASE_URL}/rest/v1/hint_boards?user_id=eq.${session.user_id}&select=id,title,is_default,is_private&order=is_default.desc,created_at.asc`;

  const response = await authorizedFetch(session, url);

  if (!response.ok) {
    throw new Error("Couldn't load your hint lists.");
  }

  const boards = await response.json();

  // Same idea as HintsMenuClient.jsx's own board list and the Shop page's
  // Add-to-hints picker - a small visual preview of what's already in
  // each list makes it much easier to recognise which one you actually
  // want, versus picking blind from titles alone.
  const boardsWithPreviews = await Promise.all(
    boards.map(async (board) => {
      const previewUrl = `${SUPABASE_URL}/rest/v1/hints?board_id=eq.${board.id}&select=image_url&order=position.asc&limit=4`;
      const previewResponse = await authorizedFetch(session, previewUrl);
      const previewHints = previewResponse.ok ? await previewResponse.json() : [];
      return { ...board, previewImages: previewHints.map((h) => h.image_url).filter(Boolean) };
    })
  );

  return boardsWithPreviews;
}

async function createBoard(session, title, isPrivate = false) {
  const response = await authorizedFetch(session, `${SUPABASE_URL}/rest/v1/hint_boards`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ user_id: session.user_id, title, is_default: false, is_private: isPrivate }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.message || "Couldn't create that list.");
  }

  const [board] = await response.json();
  return board;
}

// Same normaliseRetailer approach as the main app - just the hostname,
// matching how retailer is displayed everywhere else in HintDrop.
function normaliseRetailer(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function extractNumericPrice(priceStr) {
  if (!priceStr) return null;
  const cleaned = String(priceStr).replace(/,/g, "");
  const match = cleaned.match(/(\d+(?:\.\d{1,2})?)/);
  if (!match) return null;
  const num = Number(match[1]);
  return Number.isFinite(num) ? num : null;
}

async function saveHint(session, boardId, pageInfo) {
  const payload = {
    user_id: session.user_id,
    board_id: boardId,
    title: pageInfo.title?.trim() || "Saved from extension",
    url: pageInfo.url,
    image_url: pageInfo.image || "",
    source: "extension",
    is_private: false,
    retailer: normaliseRetailer(pageInfo.url),
    price_text: pageInfo.price ? `${pageInfo.currency || ""}${pageInfo.price}` : "",
    numeric_price: extractNumericPrice(pageInfo.price),
    starred: false,
    position: 0,
  };

  const response = await authorizedFetch(session, `${SUPABASE_URL}/rest/v1/hints`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.message || "Couldn't save this hint.");
  }
}
