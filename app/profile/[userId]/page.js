import ProfileClient from "./ProfileClient";

export default function ProfilePage({ params }) {
  return <ProfileClient userId={params.userId} />;
}
