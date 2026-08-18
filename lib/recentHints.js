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
    const { data } = await supabase
      .from("hint_views")
      .select("hint_id, viewed_at, hints(id, title, image_url, retailer, user_id, profiles(full_name))")
      .eq("viewer_user_id", viewerUserId)
      .order("viewed_at", { ascending: false })
      .limit(limit);
    return (data || [])
      .filter((row) => row.hints)
      .map((row) => ({
        id: row.hints.id,
        title: row.hints.title,
        imageUrl: row.hints.image_url,
        retailer: row.hints.retailer,
        ownerUserId: row.hints.user_id,
        ownerName: row.hints.profiles?.full_name || null,
      }));
  } catch {
    return [];
  }
}
