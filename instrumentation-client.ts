import * as Sentry from "@sentry/nextjs";

/**
 * Client-side Sentry-init for Next.js 16.
 * Køyrer i nettlesaren når sida lastar.
 *
 * Sesjon-replay er deaktivert (sample-rate 0) — det er ein nice-to-have
 * for større produkt, men i pilot vil vi halde bundle-storleiken nede
 * og unngå å lagre brukar-input i Sentry.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  debug: false,
});

// Next.js 16-konvensjon: fang navigation-errors mellom routes
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;