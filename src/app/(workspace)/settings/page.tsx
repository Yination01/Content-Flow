import type { Metadata } from "next";
import { SettingsScreen } from "../../screens";

export const metadata: Metadata = {
  title: "Workspace Settings",
  description:
    "Manage profile details, BYOK AI keys, platform connections, billing, and security.",
  alternates: {
    canonical: "/settings",
  },
};

export default function SettingsPage({
  searchParams,
}: {
  searchParams?: { section?: string };
}) {
  return <SettingsScreen initialSection={searchParams?.section} />;
}
