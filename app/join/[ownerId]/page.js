import { createClient } from "../../../lib/supabase/server";
import JoinCircleClient from "./JoinCircleClient";

export async function generateMetadata({ params }) {
  const { ownerId } = await params;
  const supabase = await createClient();
  const { data: owner } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", ownerId)
    .maybeSingle();

  const ownerName = owner?.full_name?.split(" ")[0] || "Someone";
  const title = `Join ${ownerName}'s Circle | HintDrop`;
  const description = `${ownerName} uses HintDrop to keep track of gift ideas for the people who matter. Join their Circle to see each other's Hints and never miss a birthday.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function JoinCirclePage({ params }) {
  const { ownerId } = await params;
  return <JoinCircleClient ownerId={ownerId} />;
}
