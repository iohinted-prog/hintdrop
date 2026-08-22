import JoinCircleClient from "./JoinCircleClient";

export const metadata = {
  title: "You're invited",
  description: "Join someone's Circle on HintDrop.",
};

export default async function JoinCirclePage({ params }) {
  const { ownerId } = await params;
  return <JoinCircleClient ownerId={ownerId} />;
}
