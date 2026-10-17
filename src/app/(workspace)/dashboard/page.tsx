import type { Metadata } from "next";
import { DashboardScreen } from "../../screens";

export const metadata: Metadata = {
  title: "Creator Dashboard",
  description:
    "View your daily AI generation quota, monthly post usage, recent drafts, and publishing activity.",
  alternates: {
    canonical: "/dashboard",
  },
};

export default function DashboardPage() {
  return <DashboardScreen />;
}
