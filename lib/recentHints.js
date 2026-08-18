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
      .select("id, title, image_url, retailer, user_id")
      .in("id", hintIds);
    const hintsById = {};
    (hints || []).forEach((h) => { hintsById[h.id] = h; });

    const ownerIds = [...new Set((hints || []).map((h) => h.user_id).filter(Boolean))];
    const { data: owners } = ownerIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", ownerIds)
      : { data: [] };
    const ownersById = {};
    (owners || []).forEach((o) => { ownersById[o.id] = o; });

    return hintIds
      .map((id) => hintsById[id])
      .filter(Boolean)
      .map((h) => ({
        id: h.id,
        title: h.title,
        imageUrl: h.image_url,
        retailer: h.retailer,
        ownerUserId: h.user_id,
        ownerName: ownersById[h.user_id]?.full_name || null,
      }));
  } catch {
    return [];
  }
}
