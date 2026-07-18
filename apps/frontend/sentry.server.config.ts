import * as Sentry from '@sentry/nextjs';

// Server-runtime counterpart of sentry.client.config.ts -- same DSN, same
// no-op-when-unset behavior. Node.js runtime (SSR, route handlers, server
// actions).
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}
