import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { NodeSDK } from '@opentelemetry/sdk-node';

/**
 * Real OpenTelemetry tracing bootstrap (Production Readiness Audit --
 * replaces the previous no-op placeholder). Auto-instruments HTTP/Express/
 * Prisma calls and exports spans via OTLP/HTTP to whatever collector
 * OTEL_EXPORTER_OTLP_ENDPOINT points at (Grafana Tempo, Honeycomb, a local
 * otel-collector -- anything OTLP-compatible). See docs/15-observability.md
 * for the full setup guide.
 *
 * Must be called before any instrumented module (http, express, @prisma/client)
 * is imported -- main.ts calls this as its very first statement.
 */
export interface TracingBootstrap {
  readonly enabled: boolean;
  shutdown(): Promise<void>;
}

const noopTracing: TracingBootstrap = {
  enabled: false,
  async shutdown(): Promise<void> {
    // No-op: no tracing provider was initialized.
  },
};

export function bootstrapTracing(): TracingBootstrap {
  const enabled = process.env.OTEL_ENABLED === 'true';
  if (!enabled) {
    return noopTracing;
  }

  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) {
    console.warn('[tracing] OTEL_ENABLED=true but OTEL_EXPORTER_OTLP_ENDPOINT is unset; tracing stays disabled.');
    return noopTracing;
  }

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'orivex-backend',
      [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? 'unknown',
    }),
    traceExporter: new OTLPTraceExporter({ url: endpoint }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // The filesystem instrumentation is extremely noisy (a span per fs
        // call) and adds little value for an HTTP API service -- every other
        // default instrumentation (http, express, @prisma/client, etc.)
        // stays on.
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();

  return {
    enabled: true,
    shutdown: () => sdk.shutdown(),
  };
}
