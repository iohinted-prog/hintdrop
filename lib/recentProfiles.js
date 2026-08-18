export async function recordProfileVisit(supabase, viewerUserId, viewedUserId) {
  if (!supabase || !viewerUserId || !viewedUserId || viewerUserId === viewedUserId) return;
  try {
    await supabase.from("profile_visits").upsert(
      { viewer_user_id: viewerUserId, viewed_user_id: viewedUserId, visited_at: new Date().toISOString() },
      { onConflict: "viewer_user_id,viewed_user_id" }
    );
  } catch {
    // recents are a nice-to-have — fail silently rather than disrupt the profile view
  }
}

export async function getRecentProfiles(supabase, viewerUserId, limit = 3) {
  if (!supabase || !viewerUserId) return [];
  try {
    const { data } = await supabase
      .from("profile_visits")
      .select("viewed_user_id, visited_at, profiles!profile_visits_viewed_user_id_fkey(full_name, avatar_url)")
      .eq("viewer_user_id", viewerUserId)
      .order("visited_at", { ascending: false })
      .limit(limit);
    return (data || []).map((row) => ({
      userId: row.viewed_user_id,
      name: row.profiles?.full_name || "Someone",
      avatarUrl: row.profiles?.avatar_url || null,
      initials: getInitials(row.profiles?.full_name),
    }));
  } catch {
    return [];
  }
}

function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
