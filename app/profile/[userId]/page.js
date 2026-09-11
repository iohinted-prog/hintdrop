import { createClient } from "../../../lib/supabase/server";
import ProfileClient from "./ProfileClient";

// Same reasoning as /h/[hintId] and /b/[boardId] - a profile's name/
// avatar/bio can change, so this must regenerate per request rather
// than risk serving stale metadata.
export const dynamic = "force-dynamic";

// Matches a standard UUID - lets the same [userId] route accept
// either an old-style id link (still works, already shared/bookmarked
// links must keep working) or the new vanity username, without two
// separate routes.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }) {
  const { userId } = await params;
  const supabase = await createClient();
  const lookupColumn = UUID_RE.test(userId) ? "id" : "username";
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, bio, username")
    .eq(lookupColumn, userId)
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
      // Always the vanity form once known, even if this particular
      // request arrived via the old id link - one canonical URL per
      // profile regardless of which form got shared.
      canonical: `https://hintdrop.app/profile/${profile.username || userId}`,
    },
  };
}

export default async function ProfilePage({ params }) {
  const { userId } = await params;
  // Resolve the vanity username to the real profile id here, once,
  // server-side - ProfileClient.jsx compares/queries against this id
  // in around 20 places (currentUser.id === userId checks, foreign
  // key filters, the RPC call), all of which need a real uuid
  // regardless of which URL form got clicked. Passing the resolved id
  // down means none of that internal logic has to change at all - it
  // keeps receiving exactly what it always received. The browser's
  // address bar still shows whichever form the person actually
  // visited; this only affects what gets fetched.
  let resolvedId = userId;
  if (!UUID_RE.test(userId)) {
    const supabase = await createClient();
    const { data } = await supabase.from("profiles").select("id").eq("username", userId).maybeSingle();
    resolvedId = data?.id || userId;
  }
  return <ProfileClient userId={resolvedId} />;
}
