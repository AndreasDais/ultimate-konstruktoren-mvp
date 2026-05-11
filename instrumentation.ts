import * as Sentry from "@sentry/nextjs";

/**
 * Server-side Sentry-init for Next.js 16.
 * Køyrer i både nodejs- og edge-runtime.
 *
 * Sample-rate 1.0 i pilot — vi vil fange alle errors og alle transactions.
 * Post-pilot, ved skala, set ned til 0.1-0.2.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 1.0,
      debug: false,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 1.0,
      debug: false,
    });
  }
}

// Next.js 16-konvensjon: eksporter denne for å fange request-errors
// automatisk (server-side).
export const onRequestError = Sentry.captureRequestError;