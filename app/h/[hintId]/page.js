import { createClient } from "../../../lib/supabase/server";
import HintPreviewClient from "./HintPreviewClient";

// Same reasoning as /b/[boardId] - a hint's image/title can change
// (edited, image re-scraped) and privacy can be toggled, so this must
// regenerate per request rather than risk serving a stale cached
// metadata response.
export const dynamic = "force-dynamic";

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

  // Metadata generation happens before any client-side privacy check in
  // HintPreviewClient can run, and it's what search engines, AI
  // crawlers, and link-preview bots (Slack, iMessage, etc.) actually
  // read - a private hint's real title/image would otherwise leak
  // through metadata even if the page content itself is properly
  // gated. Found while auditing metadata for the AI-SEO pass, not
  // originally what was being looked for, but a real gap worth closing
  // rather than leaving once spotted.
  if (hint.is_private) {
    return {
      title: "Hint | HintDrop",
      description: "This hint is private.",
    };
  }

  const ownerName = hint.profiles?.full_name?.split(" ")[0] || "Someone";
  const title = `${ownerName}'s Hint 👀 | HintDrop`;
  const description = hint.title || "Take a look at this gift idea on HintDrop.";
  // Same reasoning as /b/[boardId] - proxied through Next's own image
  // optimizer rather than linked directly, since external retailer
  // image hosts often block hotlinking/crawler user agents.
  const ogImage = hint.image_url
    ? `https://hintdrop.app/_next/image?url=${encodeURIComponent(hint.image_url)}&w=1200&q=75`
    : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
    alternates: {
      canonical: `https://hintdrop.app/h/${hintId}`,
    },
  };
}

export default async function HintPreviewPage({ params }) {
  const { hintId } = await params;
  return <HintPreviewClient hintId={hintId} />;
}
