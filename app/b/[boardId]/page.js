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

  // Same gap as /h/[hintId] - is_private was fetched but never actually
  // checked before generating the title/description. Metadata
  // generation happens before any client-side privacy check can run,
  // and it's what search engines, AI crawlers, and link-preview bots
  // actually read.
  if (board.is_private) {
    return {
      title: "Hints | HintDrop",
      description: "This board is private.",
    };
  }

  const ownerName = board.profiles?.full_name?.split(" ")[0] || "Someone";
  const title = `${board.title} — ${ownerName}'s Hints 👀 | HintDrop`;
  const description = `Take a look at ${ownerName}'s "${board.title}" Hints on HintDrop.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
    alternates: {
      canonical: `https://hintdrop.app/b/${boardId}`,
    },
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

