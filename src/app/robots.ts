import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/signup", "/privacy", "/terms", "/notes", "/llms.txt"],
        disallow: ["/admin", "/api/"],
      },
    ],
    sitemap: "https://contentflow.app/sitemap.xml",
  };
}
