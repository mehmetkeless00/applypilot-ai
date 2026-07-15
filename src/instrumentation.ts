import * as Sentry from "@sentry/nextjs";

// Server-side error monitoring. Inert unless SENTRY_DSN is set, so local
// dev and forks work without any Sentry account.
export async function register() {
  if (!process.env.SENTRY_DSN) return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    // Resume/job content must never leave in error payloads.
    sendDefaultPii: false,
  });
}

export const onRequestError = Sentry.captureRequestError;
