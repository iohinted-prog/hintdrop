import { createClient } from "../../../lib/supabase/server";
import ProfileClient from "./ProfileClient";

// Same reasoning as /h/[hintId] and /b/[boardId] - a profile's name/
// avatar/bio can change, so this must regenerate per request rather
// than risk serving stale metadata.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, bio")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Profile metadata query error:", error);
  }

  if (!profile) {
    return { title: "Profile", robots: { index: false, follow: false } };
  }

  const name = profile.full_name?.split(" ")[0] || "Someone";
  const title = `${name}'s Hints`;
  const description = profile.bio || `See ${name}'s gift ideas and hints on HintDrop.`;
  // Proxied through Next's own image optimizer rather than linked
  // directly, same reasoning as the hint/board share pages - external
  // avatar hosts (Google/Apple OAuth photos, uploaded storage) can
  // block hotlinking or crawler user agents.
  const ogImage = profile.avatar_url
    ? `https://hintdrop.app/_next/image?url=${encodeURIComponent(profile.avatar_url)}&w=800&q=75`
    : undefined;

  return {
    title,
    description,
    // Individual profiles stay out of search results (matches
    // robots.js's /profile disallow) - this is purely for link
    // previews (WhatsApp, iMessage, Slack), which read these tags
    // regardless of robots.txt since that only governs crawling, not
    // unfurling a link someone was actually sent.
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
      type: "profile",
    },
    twitter: {
      card: ogImage ? "summary" : "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
    alternates: {
      canonical: `https://hintdrop.app/profile/${userId}`,
    },
  };
}

export default async function ProfilePage({ params }) {
  const { userId } = await params;
  return <ProfileClient userId={userId} />;
}
