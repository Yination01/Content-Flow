import type { Metadata } from "next";
import { TermsScreen } from "../screens";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of service, content ownership, and billing policies for ContentFlow.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  return <TermsScreen />;
}
