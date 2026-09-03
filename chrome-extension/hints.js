// Direct PostgREST calls against Supabase's REST API, same reasoning as
// auth.js: no bundler, so no @supabase/supabase-js SDK - plain fetch()
// with the same headers that library builds under the hood anyway.
// The access_token from the read session is what lets Supabase's RLS
// policies resolve auth.uid() correctly, same as any other authenticated
// request to this project.

async function fetchBoards(session) {
  const url = `${SUPABASE_URL}/rest/v1/hint_boards?user_id=eq.${session.user_id}&select=id,title,is_default,is_private&order=is_default.desc,created_at.asc`;

  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Couldn't load your hint lists.");
  }

  return response.json();
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

  const response = await fetch(`${SUPABASE_URL}/rest/v1/hints`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
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
