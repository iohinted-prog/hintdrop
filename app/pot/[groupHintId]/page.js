import PotPageClient from "./PotPageClient";

// Deliberately generic metadata - not fetched from the pot itself, since
// the gift/title shouldn't leak into a link preview card that could land
// in the recipient's own chat or feed. Matches the same non-spoiler
// principle as get_pot_public_info() only ever sending safe fields to
// the client.
// Deliberately generic metadata - not fetched from the pot itself, since
// the gift/title shouldn't leak into a link preview card that could land
// in the recipient's own chat or feed. Matches the same non-spoiler
// principle as get_pot_public_info() only ever sending safe fields to
// the client. Still needs to be generateMetadata (not a static export)
// purely to read groupHintId for a correct per-pot canonical URL - no
// data is fetched, the actual title/description text stays hardcoded.
export async function generateMetadata({ params }) {
  const { groupHintId } = await params;
  return {
    title: "Chip in on a group gift",
    description: "You've been invited to help fund a group gift. Sign in to see how it's going and join in.",
    // noindex - a pot is private coordination between specific invited
    // people, same reasoning as /profile and /unsubscribe. Metadata
    // here is already deliberately generic, but there's no reason for
    // even that generic version to show up in search results.
    robots: { index: false, follow: false },
    alternates: {
      canonical: `https://hintdrop.app/pot/${groupHintId}`,
    },
  };
}

export default async function PotPage({ params }) {
  const { groupHintId } = await params;
  return <PotPageClient groupHintId={groupHintId} />;
}
