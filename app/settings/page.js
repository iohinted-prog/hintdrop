import SettingsClient from "./SettingsClient";

export const metadata = {
  title: "Settings | HintDrop",
  description: "Manage reminder and app preferences.",
};

export default function SettingsPage() {
  return <SettingsClient />;
}
