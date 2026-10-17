import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../index.css";
import { StateProvider } from "./state";

export const metadata: Metadata = {
  metadataBase: new URL("https://contentflow.app"),
  title: {
    default: "ContentFlow — Create Once, Shape It for Every Platform",
    template: "%s | ContentFlow",
  },
  description:
    "ContentFlow helps creators turn a single idea into polished, platform-ready content for YouTube and TikTok in one focused workspace.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ContentFlow — Create Once, Shape It for Every Platform",
    description:
      "AI-powered content creation, platform-specific adaptation, and distribution queue for YouTube and TikTok creators.",
    url: "https://contentflow.app",
    siteName: "ContentFlow",
    type: "website",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StateProvider>{children}</StateProvider>
      </body>
    </html>
  );
}
