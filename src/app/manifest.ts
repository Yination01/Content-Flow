import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ContentFlow — Creator Studio",
    short_name: "ContentFlow",
    description:
      "AI-powered content creation and cross-platform distribution platform for YouTube and TikTok creators.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f8f7f3",
    theme_color: "#5b4fe9",
    categories: ["productivity", "social", "business"],
    icons: [
      {
        src: "/favicon.svg",
        sizes: "192x192 512x512 any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/favicon.svg",
        sizes: "192x192 512x512 any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Create Content",
        short_name: "Create",
        description: "Generate a new script, image, or video storyboard",
        url: "/create",
      },
      {
        name: "Creator Dashboard",
        short_name: "Dashboard",
        description: "View live quotas and channel connections",
        url: "/dashboard",
      },
      {
        name: "Publishing Queue",
        short_name: "Jobs",
        description: "Manage scheduled YouTube and TikTok jobs",
        url: "/jobs",
      },
    ],
  };
}
