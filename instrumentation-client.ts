/**
 * Client-side Sentry-init for Next.js 16.
 *
 * Sentry er deaktivert når NEXT_PUBLIC_SENTRY_DSN manglar. Dette held pilot-
 * bundle/build enklare og unngår at vi initialiserer observability utan DSN.
 */
const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (sentryDsn) {
  void import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn: sentryDsn,
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      debug: false,
    });
  });
}

// Next.js 16-konvensjon: fang navigation-errors mellom routes.
export function onRouterTransitionStart(...args: unknown[]) {
  if (!sentryDsn) return;

  void import("@sentry/nextjs").then((Sentry) => {
    (Sentry.captureRouterTransitionStart as (...innerArgs: unknown[]) => unknown)(
      ...args
    );
  });
}
