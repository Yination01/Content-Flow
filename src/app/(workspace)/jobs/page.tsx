import type { Metadata } from "next";
import { JobsScreen } from "../../screens";

export const metadata: Metadata = {
  title: "Distribution Queue & Jobs",
  description:
    "Monitor scheduled and recent cross-posting jobs across YouTube and TikTok.",
  alternates: {
    canonical: "/jobs",
  },
};

export default function JobsPage() {
  return <JobsScreen />;
}
