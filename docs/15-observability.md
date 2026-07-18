# 15 — Observability

Production Readiness Audit follow-up (Phase 1, item 2). Replaces the previous
`OTEL_ENABLED` no-op placeholder with a real tracing pipeline, adds Sentry
error reporting to both apps, and documents the logging setup already in
place.

## 1. Structured logging

Already production-ready before this doc existed:

- Backend: `apps/backend/src/platform/logging/pino-logger.service.ts` emits
  structured JSON in every environment except local `development` (which gets
  a human-readable `pino-pretty` transport instead). Every line now carries
  `service: "orivex-backend"` and `env` base fields so a log aggregator can
  filter/group without parsing message text.
- Every request is tagged with a `requestId` (see
  `shared/correlation/correlation-context.ts`) that also appears in the
  `{ error: { requestId } }` response envelope — grep production logs by the
  `requestId` a user/support ticket reports to find the exact request.
- Sensitive-field redaction is tracked separately as a Phase 3 item (the
  Production Readiness Audit's "improve logger redaction" finding) — logging
  itself already avoids request bodies/tokens (see `request-logging.interceptor.ts`
  and `logging-email-sender.ts`'s production redaction).

## 2. Distributed tracing (OpenTelemetry)

`apps/backend/src/platform/observability/tracing.ts` now boots a real
`@opentelemetry/sdk-node` instance with auto-instrumentation for HTTP,
Express, and `@prisma/client` calls, exported via OTLP/HTTP.

**Enabling it** (all optional — the app boots identically with tracing off):

```bash
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=https://<your-collector>/v1/traces
```

Any OTLP/HTTP-compatible backend works: a self-hosted `otel-collector`,
Grafana Tempo/Cloud, Honeycomb, etc. There is no vendor lock-in in the code —
only the endpoint URL changes.

If `OTEL_ENABLED=true` but the endpoint is unset, the app logs a warning at
boot and tracing stays disabled rather than crashing — matching every other
optional integration in this codebase (Redis, S3-in-dev, etc.).

**Local smoke test**: run a local `otel-collector` (or Jaeger's all-in-one
image, which accepts OTLP) and point `OTEL_EXPORTER_OTLP_ENDPOINT` at it;
requests through the API should show up as traces within a few seconds.

## 3. Error reporting (Sentry)

Both apps ship an optional Sentry integration — unset the DSN and it's a
no-op; nothing else about local dev changes.

### Backend

`apps/backend/src/platform/observability/error-reporting.ts` calls
`Sentry.init()` once at boot if `SENTRY_DSN` is set.
`AllExceptionsFilter` reports **only 5xx failures** to Sentry — every
documented 4xx (validation errors, domain rule violations, not-found,
forbidden, etc.) is expected API behavior, not an incident, and reporting it
would drown a real error budget in noise.

```bash
SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
SENTRY_TRACES_SAMPLE_RATE=0.1   # optional, defaults to 0.1
```

### Frontend

Standard Next.js App Router Sentry setup: `sentry.client.config.ts`,
`sentry.server.config.ts`, `sentry.edge.config.ts` at the repo root, wired
through `src/instrumentation.ts`'s `register()` hook and
`next.config.ts`'s `withSentryConfig` wrapper (source-map upload only runs
when `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT` are set — omit them
locally). `src/app/global-error.tsx` (the App Router's last-resort error
boundary, catching anything the root layout itself throws) explicitly calls
`Sentry.captureException(error)`.

```bash
NEXT_PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
```

DSNs are not secrets — Sentry designs them to be safe to ship in a public
client bundle (they only allow *sending* events to that project, not reading
them back).

## 4. What to alert on (once a Sentry project exists)

Recommended minimum alert rules once this is wired to a real Sentry project:

- **New issue in `orivex-backend`, `production` environment** — page
  immediately. A 5xx is never expected in normal operation.
- **Issue frequency spike** (e.g. >10 events/min for any single issue) — a
  bad deploy or a downstream dependency (Neon, S3) outage cascading through
  the app.
- **Frontend issue in `production`** — lower urgency than backend (a
  rendering bug doesn't take the API down), but still worth a daily digest.

## 5. What's intentionally still out of scope

- **Metrics/dashboards** (request-rate, p50/p95/p99 latency, error-rate
  panels) are not part of this pass — tracing gives you the raw spans to
  build them from once a collector/backend (e.g. Grafana) is actually
  provisioned; wiring an actual dashboard is deployment-specific and belongs
  in the infra repo/runbook, not this codebase.
- **Log aggregation** (shipping Pino's stdout JSON to a central store) is a
  platform/infra concern (Render's own log stream, or a sidecar shipping to
  Datadog/Loki/etc.) — the application's job, already done, is to emit
  well-structured JSON; where it goes next is an operations decision.
