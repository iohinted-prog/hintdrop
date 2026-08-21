export async function recordBoardVisit(supabase, viewerUserId, boardId) {
  if (!supabase || !viewerUserId || !boardId) return;
  try {
    await supabase.from("board_visits").upsert(
      { viewer_user_id: viewerUserId, board_id: boardId, visited_at: new Date().toISOString() },
      { onConflict: "viewer_user_id,board_id" }
    );
  } catch {
    // recents are a nice-to-have — fail silently rather than disrupt the board view
  }
}

export async function getRecentBoards(supabase, viewerUserId, limit = 3) {
  if (!supabase || !viewerUserId) return [];
  try {
    const { data } = await supabase
      .from("board_visits")
      .select("board_id, visited_at, hint_boards!board_visits_board_id_fkey(id, title, user_id, is_default)")
      .eq("viewer_user_id", viewerUserId)
      .order("visited_at", { ascending: false })
      .limit(limit);
    return (data || [])
      .filter((row) => row.hint_boards) // board may have since been deleted
      .map((row) => ({
        boardId: row.board_id,
        title: row.hint_boards?.title || "Hints",
        ownerUserId: row.hint_boards?.user_id || null,
        isDefault: Boolean(row.hint_boards?.is_default),
        visitedAt: row.visited_at,
      }));
  } catch {
    return [];
  }
}
