import BoardRedirectClient from "./BoardRedirectClient";
import { createClient } from "../../../lib/supabase/server";

// Board metadata (title, cover image) depends on the board's most
// recently added hint - genuinely dynamic data that changes as often
// as someone adds a hint. Without this, Next.js can statically cache
// the generated metadata from whenever this URL was first requested
// and never regenerate it, so a board's preview image could keep
// showing stale (or missing) data indefinitely regardless of later
// changes.
export const dynamic = "force-dynamic";

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

  // Deliberate product decision (confirmed explicitly, not a default):
  // a private board still gets its own title/description/cover image
  // in the preview card, same as a public one. The link itself is
  // already the access control (unguessable id, only reaches someone
  // because it was deliberately shared) - the earlier text-only
  // fallback here was extra caution beyond that, and the person
  // decided the richer preview is worth the tradeoff (anyone who sees
  // the link forwarded elsewhere also sees the image, not just the
  // intended recipient).
  const ownerName = board.profiles?.full_name?.split(" ")[0] || "Someone";
  const title = `${board.title} — ${ownerName}'s Hints 👀 | HintDrop`;
  const description = `Take a look at ${ownerName}'s "${board.title}" Hints on HintDrop.`;

  // Points og:image straight at the board's cover hint photo, proxied
  // through Next's own image optimizer (so it's served from
  // hintdrop.app rather than the retailer's own host) - and that's
  // it. This is deliberately the simple version: a custom-composited
  // image (branding + photo, via next/og's ImageResponse) required
  // this server to fetch the retailer image itself first, and real
  // Vercel logs confirmed that fetch genuinely hangs/aborts from this
  // function's environment regardless of timeout length, across
  // multiple unrelated retailers - a pattern consistent with bot-
  // protection on those CDNs treating datacenter IPs differently than
  // a real crawler. Pointing WhatsApp's own crawler at the image
  // directly sidesteps that entirely, since it isn't subject to the
  // same block. No HintDrop branding overlay as a result - trading
  // that off for an image that actually, reliably shows.
  const { data: coverHint } = await supabase
    .from("hints")
    .select("image_url")
    .eq("board_id", boardId)
    .eq("is_private", false)
    .not("image_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const ogImage = coverHint?.image_url
    ? `https://hintdrop.app/_next/image?url=${encodeURIComponent(coverHint.image_url)}&w=1200&q=75`
    : "https://hintdrop.app/og-default-v2.png";

  return {
    title,
    description,
    openGraph: { title, description, images: [ogImage], type: "website" },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
    alternates: {
      canonical: `https://hintdrop.app/b/${boardId}`,
    },
  };
}

// This previously used Next's server-side redirect() here, which
// turned out to be the actual bug behind the preview never showing
// real content: redirect() sends a genuine HTTP 307 response, so a
// crawler requesting this URL never receives the HTML this file's
// generateMetadata built at all - it just follows the redirect
// straight to /profile/...?board=..., a client page with no board-
// specific metadata of its own, and previews the generic fallback
// from there instead. Confirmed by testing a genuinely fresh,
// never-shared board and still getting the generic card.
//
// Rendering a real (if minimal) page here instead, with a client-
// side redirect, means the initial server response is the full HTML
// - metadata included - that a crawler actually reads and stops at,
// while a real browser's JS still carries it on to the profile page
// exactly as before.
export default async function BoardPreviewPage({ params }) {
  const { boardId } = await params;
  const supabase = await createClient();
  const { data: board } = await supabase
    .from("hint_boards")
    .select("user_id")
    .eq("id", boardId)
    .maybeSingle();

  return <BoardRedirectClient to={board ? `/profile/${board.user_id}?board=${boardId}` : "/"} />;
}

