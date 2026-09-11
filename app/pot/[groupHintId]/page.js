import PotPageClient from "./PotPageClient";

// Deliberately generic metadata - not fetched from the pot itself, since
// the gift/title shouldn't leak into a link preview card that could land
// in the recipient's own chat or feed. Matches the same non-spoiler
// principle as get_pot_public_info() only ever sending safe fields to
// the client.
export const metadata = {
  title: "Chip in on a group gift | HintDrop",
  description: "You've been invited to help fund a group gift. Sign in to see how it's going and join in.",
};

export default async function PotPage({ params }) {
  const { groupHintId } = await params;
  return <PotPageClient groupHintId={groupHintId} />;
}
