import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";

export async function generateMetadata({ params }) {
  const { boardId } = await params;
  const supabase = await createClient();
  const { data: board } = await supabase
    .from("hint_boards")
    .select("title, user_id, is_private, profiles(full_name)")
    .eq("id", boardId)
    .maybeSingle();

  if (!board) {
    return { title: "Hints | HintDrop" };
  }

  const ownerName = board.profiles?.full_name?.split(" ")[0] || "Someone";
  const title = `${board.title} — ${ownerName}'s Hints 👀 | HintDrop`;
  const description = `Take a look at ${ownerName}'s "${board.title}" Hints on HintDrop.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

// /b/[boardId] no longer has its own page — every board lives on its
// owner's profile now (deep-linked via ?board=), so this just forwards
// old and new links there rather than maintaining a second, near-
// identical page. generateMetadata above still runs for this URL first,
// so a shared /b/... link still gets a proper preview card before the
// redirect happens.
export default async function BoardPreviewPage({ params }) {
  const { boardId } = await params;
  const supabase = await createClient();
  const { data: board } = await supabase
    .from("hint_boards")
    .select("user_id")
    .eq("id", boardId)
    .maybeSingle();

  if (!board) {
    redirect("/");
  }
  redirect(`/profile/${board.user_id}?board=${boardId}`);
}

