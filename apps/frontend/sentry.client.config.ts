import * as Sentry from '@sentry/nextjs';

// Production Readiness Audit: error reporting for the browser runtime.
// Optional -- if NEXT_PUBLIC_SENTRY_DSN is unset, Sentry.init() is a no-op
// (matches the backend's own "no safe default for a thing that isn't
// provisioned yet" convention). See docs/15-observability.md.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}
