import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
};

/**
 * Sentry-wrapper. I lokal/pilot-build utan Sentry-env returnerer vi rein
 * Next-config. Dette unngår at Sentry-pluginen påverkar build når han uansett
 * ikkje kan laste opp sourcemaps eller sende events.
 */
const sentryEnabled = Boolean(
  process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_AUTH_TOKEN
);

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      silent: true,
    })
  : nextConfig;
