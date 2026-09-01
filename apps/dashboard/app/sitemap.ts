import type { MetadataRoute } from "next";

const SITE_URL = process.env.SITE_URL ?? "http://localhost:3001";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${SITE_URL}/docs`, lastModified: new Date(), changeFrequency: "weekly", priority: 1 }];
}
