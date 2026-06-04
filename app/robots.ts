import type { MetadataRoute } from "next";

// TEMPORARY base URL: no production launch domain is configured yet. Using the
// current Vercel host. Update this when the launch domain is set.
const SITE_URL = "https://pilar-mvp.vercel.app";

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
