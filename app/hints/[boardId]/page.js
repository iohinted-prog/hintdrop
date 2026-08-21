import HintsClient from "./HintsClient";

export const metadata = {
  title: "Hints",
  description: "Collect, organise, and move gift ideas around a visual hints board.",
};

export default async function BoardHintsPage({ params }) {
  const { boardId } = await params;
  return <HintsClient boardId={boardId} />;
}
