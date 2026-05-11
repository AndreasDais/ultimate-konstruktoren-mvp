import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
};

/**
 * Sentry-wrapper. Minimal config — kun silent for å unngå
 * build-output-støy. Source-map-upload skjer berre om SENTRY_AUTH_TOKEN
 * er sett (ikkje i pilot, så ingenting blir uploada).
 */
export default withSentryConfig(nextConfig, {
  silent: true,
});