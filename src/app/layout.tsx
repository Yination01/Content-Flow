import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "../index.css";
import { StateProvider } from "./state";

const fontConfig = {
  display: "swap",
  variable: "--font-dm-sans",
} as const;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#17172a",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://content-flow-weld-one.vercel.app"),
  title: {
    default: "ContentFlow | Create Once, Shape It for Every Platform",
    template: "%s | ContentFlow",
  },
  description:
    "ContentFlow helps creators turn a single idea into polished, platform-ready content for YouTube and TikTok in one focused workspace.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ContentFlow | Create Once, Shape It for Every Platform",
    description:
      "AI-powered content creation, platform-specific adaptation, and distribution queue for YouTube and TikTok creators.",
    url: "https://content-flow-weld-one.vercel.app",
    siteName: "ContentFlow",
    type: "website",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontConfig.variable} data-font-display={fontConfig.display}>
      <body>
        <StateProvider>{children}</StateProvider>
      </body>
    </html>
  );
}
