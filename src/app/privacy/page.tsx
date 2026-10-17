import type { Metadata } from "next";
import { PrivacyScreen } from "../screens";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How ContentFlow protects creator drafts, BYOK keys, and OAuth credentials.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return <PrivacyScreen />;
}
