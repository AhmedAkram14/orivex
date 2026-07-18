import * as Sentry from '@sentry/node';

/**
 * Sentry error reporting bootstrap (Production Readiness Audit). Optional --
 * if SENTRY_DSN is unset, Sentry.init() is never called and
 * captureUnexpectedError() below is a safe no-op, matching this codebase's
 * "no safe default for a thing that isn't provisioned yet" convention (see
 * REDIS_URL/OTEL_EXPORTER_OTLP_ENDPOINT in env.schema.ts).
 *
 * Only genuinely unexpected errors are ever reported -- see
 * AllExceptionsFilter, which calls captureUnexpectedError() only for the
 * 5xx branch. Every 4xx (validation failures, domain rule violations,
 * not-found, forbidden, etc.) is expected, documented API behavior, not an
 * incident, and would otherwise drown a real error budget in noise.
 */
let initialized = false;

export function bootstrapErrorReporting(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  });
  initialized = true;
}

export function captureUnexpectedError(error: unknown, context: { requestId: string; path: string }): void {
  if (!initialized) {
    return;
  }
  Sentry.captureException(error, { tags: { requestId: context.requestId, path: context.path } });
}
