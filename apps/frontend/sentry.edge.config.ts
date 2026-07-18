import * as Sentry from '@sentry/nextjs';

// Edge-runtime counterpart (middleware.ts runs on the Edge runtime, not
// Node.js) -- same DSN, same no-op-when-unset behavior.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}
