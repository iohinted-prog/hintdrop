import { redirect } from "next/navigation";

export const metadata = {
  title: "Circles",
  description: "Build gifting circles, invite contacts, and fund shared gift goals together.",
};

export default function CirclesPage() {
  // Deactivated for now — group-pot circles feature paused. Code preserved
  // in this folder (renamed from /circles to /circles-legacy) for a
  // possible future return. Remove this redirect to reactivate.
  redirect("/feed");
}
