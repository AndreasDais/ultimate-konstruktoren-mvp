/**
 * Server-side Sentry-init for Next.js 16.
 *
 * Sentry er valfri i PILAR. Vi importerer ikkje @sentry/nextjs på top-level,
 * slik at lokal build utan NEXT_PUBLIC_SENTRY_DSN ikkje får ekstra Sentry-
 * sideeffektar eller OpenTelemetry-warningar.
 */
export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn,
    tracesSampleRate: 1.0,
    debug: false,
  });
}

// Next.js 16-konvensjon: eksporter denne for å fange request-errors
// automatisk (server-side). Dynamisk import held Sentry valfri ved lokal build.
export async function onRequestError(...args: unknown[]) {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  const Sentry = await import("@sentry/nextjs");
  return (Sentry.captureRequestError as (...innerArgs: unknown[]) => unknown)(
    ...args
  );
}
