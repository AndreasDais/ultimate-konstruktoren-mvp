import type { MetadataRoute } from "next";

// TEMPORARY base URL: no production launch domain is configured yet. Using the
// current Vercel host. Update this when the launch domain is set.
const SITE_URL = "https://pilar-mvp.vercel.app";

// Conservative, public-only route set. Private/app routes are excluded.
const PUBLIC_PATHS = [
  "/home",
  "/heim",
  "/about",
  "/guide",
  "/safety",
  "/roadmap",
  "/terms",
  "/vilkar",
  "/privacy",
  "/contact",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "monthly",
    priority: path === "/home" ? 1 : 0.6,
  }));
}
