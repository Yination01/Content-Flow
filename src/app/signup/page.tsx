import type { Metadata } from "next";
import { AuthScreen } from "../screens";

export const metadata: Metadata = {
  title: "Create Your Workspace",
  description:
    "Start with the ContentFlow Free plan (10 AI generations/day). No credit card required.",
  alternates: {
    canonical: "/signup",
  },
};

export default function SignupPage() {
  return <AuthScreen signup />;
}
