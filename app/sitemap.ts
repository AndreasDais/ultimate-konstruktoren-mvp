import type { MetadataRoute } from "next";

// Canonical public launch domain. The apex pilarcalc.com 308-redirects to www;
// the prior Vercel preview host remains a valid fallback.
const SITE_URL = "https://www.pilarcalc.com";

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
