import type { Metadata } from "next";
import { AdminScreen } from "../screens";

export const metadata: Metadata = {
  title: "Admin Control Center",
  description:
    "Protected superuser workspace for monitoring platform quotas, queue health, users, and moderation.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return <AdminScreen />;
}
