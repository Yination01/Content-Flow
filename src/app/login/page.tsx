import type { Metadata } from "next";
import { AuthScreen } from "../screens";

export const metadata: Metadata = {
  title: "Log In",
  description: "Sign in to your ContentFlow creator workspace.",
  alternates: {
    canonical: "/login",
  },
};

export default function LoginPage() {
  return <AuthScreen />;
}
