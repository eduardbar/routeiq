import { SettingsView } from "@/components/settings/settings-view";

export const metadata = {
  title: "Settings — RouteIQ",
  description: "Configure data sources and API connections",
};

export default function SettingsPage() {
  return <SettingsView />;
}
