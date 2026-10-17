import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://contentflow.app";
  const lastModified = new Date("2026-10-17T00:00:00.000Z");

  return [
    { url: `${baseUrl}/`, lastModified, changeFrequency: "weekly", priority: 1.0 },
    { url: `${baseUrl}/login`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/signup`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/privacy`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/terms`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/notes`, lastModified, changeFrequency: "monthly", priority: 0.6 },
  ];
}
