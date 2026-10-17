import type { Metadata } from "next";
import { LandingScreen } from "./screens";

export const metadata: Metadata = {
  title: "ContentFlow — Create Once, Shape It for Every Platform",
  description:
    "Turn a single idea into polished, platform-ready content for YouTube and TikTok in one calm creator workspace.",
  alternates: {
    canonical: "/",
  },
};

export default function HomePage() {
  return <LandingScreen />;
}
