import { createClient } from "../../../lib/supabase/server";
import HintPreviewClient from "./HintPreviewClient";

export async function generateMetadata({ params }) {
  const { hintId } = await params;
  const supabase = await createClient();
  const { data: hint } = await supabase
    .from("hints")
    .select("title, image_url, retailer, is_private, user_id, profiles(full_name)")
    .eq("id", hintId)
    .maybeSingle();

  if (!hint) {
    return { title: "Hint | HintDrop" };
  }

  const ownerName = hint.profiles?.full_name?.split(" ")[0] || "Someone";
  const title = `${ownerName}'s Hint 👀 | HintDrop`;
  const description = hint.title || "Take a look at this gift idea on HintDrop.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: hint.image_url ? [hint.image_url] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: hint.image_url ? [hint.image_url] : undefined,
    },
  };
}

export default async function HintPreviewPage({ params }) {
  const { hintId } = await params;
  return <HintPreviewClient hintId={hintId} />;
}
