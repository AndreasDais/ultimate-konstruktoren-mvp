import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
};

/**
 * Sentry-wrapper. Konfigurasjonen under styrer build-tid-åtferd:
 * - silent: ikkje logge Sentry-build-output i CI
 * - hideSourceMaps: ikkje publiser source maps offentleg via /_next/static
 * - disableLogger: tree-shake ut Sentry sin console-logger (mindre bundle)
 *
 * Source maps blir uploada til Sentry berre viss SENTRY_AUTH_TOKEN er sett
 * — utan token blir build-en ferdig utan upload (forventa i pilot).
 */
export default withSentryConfig(nextConfig, {
  silent: true,
  hideSourceMaps: true,
  disableLogger: true,
});