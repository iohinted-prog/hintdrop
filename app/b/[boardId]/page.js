import { createClient } from "../../../lib/supabase/server";
import BoardPreviewClient from "./BoardPreviewClient";

export async function generateMetadata({ params }) {
  const { boardId } = await params;
  const supabase = await createClient();
  const { data: board } = await supabase
    .from("hint_boards")
    .select("title, user_id, is_private, profiles(full_name)")
    .eq("id", boardId)
    .or("is_private.is.null,is_private.eq.false")
    .maybeSingle();

  if (!board) {
    return { title: "Hints board | HintDrop" };
  }

  const ownerName = board.profiles?.full_name?.split(" ")[0] || "Someone";
  const title = `${board.title} — ${ownerName}'s Hints 👀 | HintDrop`;
  const description = `Take a look at ${ownerName}'s "${board.title}" hints board on HintDrop.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function BoardPreviewPage({ params }) {
  const { boardId } = await params;
  return <BoardPreviewClient boardId={boardId} />;
}
