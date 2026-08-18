// Fire-and-forget outbound retailer click tracking. Never awaited by
// callers and never throws — this must not delay or block someone
// actually opening the link, and a tracking failure should never
// interfere with the click itself.
export function trackRetailerClick(supabase, { userId, hintId, url, retailer, source }) {
  if (!supabase || !url) return;
  try {
    supabase.from("retailer_clicks").insert({
      user_id: userId || null,
      hint_id: hintId || null,
      url,
      retailer: retailer || null,
      source: source || null,
    }).then(({ error }) => {
      if (error) console.error("trackRetailerClick failed:", error);
    });
  } catch {
    // never let tracking break the actual click
  }
}
