import type { MetadataRoute } from "next";

// Canonical public launch domain. The apex pilarcalc.com 308-redirects to www;
// the prior Vercel preview host remains a valid fallback.
const SITE_URL = "https://www.pilarcalc.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep private / app-internal surfaces out of the index.
        disallow: ["/admin", "/api", "/innstillingar", "/mine", "/login", "/auth"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
