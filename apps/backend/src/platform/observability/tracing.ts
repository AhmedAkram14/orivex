/**
 * Lightweight tracing bootstrap abstraction.
 *
 * Sprint 1.0 is infrastructure-only: no OpenTelemetry SDK is installed or
 * initialized yet, and no exporter/collector endpoint exists to send spans
 * to. This module exists so that wiring in a real NodeSDK later is a change
 * confined to this one file — callers only ever depend on the
 * TracingBootstrap shape, never on OpenTelemetry APIs directly.
 */
export interface TracingBootstrap {
  readonly enabled: boolean;
  shutdown(): Promise<void>;
}

const noopTracing: TracingBootstrap = {
  enabled: false,
  async shutdown(): Promise<void> {
    // No-op: no tracing provider has been initialized.
  },
};

export function bootstrapTracing(): TracingBootstrap {
  const enabled = process.env.OTEL_ENABLED === 'true';

  if (!enabled) {
    return noopTracing;
  }

  // Placeholder branch: once a real collector/exporter endpoint exists,
  // replace this with @opentelemetry/sdk-node's NodeSDK.start(), called
  // before any instrumented module is imported.
  console.warn('[tracing] OTEL_ENABLED=true but no tracing provider is implemented yet.');
  return noopTracing;
}
