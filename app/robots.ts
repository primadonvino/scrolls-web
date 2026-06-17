import type { MetadataRoute } from "next";

const baseURL = process.env.NEXT_PUBLIC_SCROLLS_WEB_BASE_URL ?? "https://scrolls.adastra.love";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Account is per-user and behind auth — no value in crawling it.
      disallow: ["/account"]
    },
    sitemap: `${baseURL}/sitemap.xml`,
    host: baseURL
  };
}
