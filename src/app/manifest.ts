import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ContentFlow — Creator Studio",
    short_name: "ContentFlow",
    description:
      "AI-powered content creation and cross-platform distribution platform for YouTube and TikTok creators.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f8f7f3",
    theme_color: "#5b4fe9",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
