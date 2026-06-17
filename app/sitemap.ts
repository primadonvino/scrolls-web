import type { MetadataRoute } from "next";

const baseURL = process.env.NEXT_PUBLIC_SCROLLS_WEB_BASE_URL ?? "https://scrolls.adastra.love";

// Static public routes. Per-profile (/user/<username>) and per-post
// (/scroll/<id>) URLs are crawlable and carry their own Open Graph metadata;
// they're discovered via shared links and inbound references rather than
// enumerated here, since there's no public "list everything" endpoint.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${baseURL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${baseURL}/feed`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${baseURL}/search`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${baseURL}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.3 }
  ];
}
