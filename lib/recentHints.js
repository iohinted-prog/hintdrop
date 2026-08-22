export async function recordHintView(supabase, viewerUserId, hintId) {
  if (!supabase || !viewerUserId || !hintId) return;
  try {
    await supabase.from("hint_views").upsert(
      { viewer_user_id: viewerUserId, hint_id: hintId, viewed_at: new Date().toISOString() },
      { onConflict: "viewer_user_id,hint_id" }
    );
  } catch {
    // recents are a nice-to-have — fail silently rather than disrupt the hint view
  }
}

export async function getRecentHints(supabase, viewerUserId, limit = 3) {
  if (!supabase || !viewerUserId) return [];
  try {
    const { data: views } = await supabase
      .from("hint_views")
      .select("hint_id, viewed_at")
      .eq("viewer_user_id", viewerUserId)
      .order("viewed_at", { ascending: false })
      .limit(limit);
    const hintIds = (views || []).map((v) => v.hint_id);
    if (!hintIds.length) return [];

    const { data: hints } = await supabase
      .from("hints")
      .select("id, title, image_url, retailer, user_id, numeric_price, currency, occasions, size, size_type, colour, starred, url")
      .in("id", hintIds);
    const hintsById = {};
    (hints || []).forEach((h) => { hintsById[h.id] = h; });

    const ownerIds = [...new Set((hints || []).map((h) => h.user_id).filter(Boolean))];
    const { data: owners } = ownerIds.length
      ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ownerIds)
      : { data: [] };
    const ownersById = {};
    (owners || []).forEach((o) => { ownersById[o.id] = o; });

    return hintIds
      .map((id) => hintsById[id])
      .filter(Boolean)
      .map((h) => ({
        id: h.id,
        title: h.title,
        // image_url kept alongside the older imageUrl alias — the shared
        // HintDetailModal expects snake_case (matching the DB row shape
        // every other caller passes it), and this mismatch meant a hint
        // opened from "Jump back in" showed no image in the modal at all
        image_url: h.image_url,
        imageUrl: h.image_url,
        retailer: h.retailer,
        numeric_price: h.numeric_price,
        currency: h.currency,
        occasions: h.occasions,
        size: h.size,
        size_type: h.size_type,
        colour: h.colour,
        starred: h.starred,
        url: h.url,
        ownerUserId: h.user_id,
        ownerName: ownersById[h.user_id]?.full_name || null,
        ownerAvatarUrl: ownersById[h.user_id]?.avatar_url || null,
        viewedAt: (views || []).find((v) => v.hint_id === h.id)?.viewed_at || null,
      }));
  } catch {
    return [];
  }
}
