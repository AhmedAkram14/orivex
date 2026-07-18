import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { bootstrapTracing } from './tracing.js';

const ORIGINAL_OTEL_ENABLED = process.env.OTEL_ENABLED;
const ORIGINAL_OTEL_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

describe('bootstrapTracing', () => {
  afterEach(() => {
    process.env.OTEL_ENABLED = ORIGINAL_OTEL_ENABLED;
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = ORIGINAL_OTEL_ENDPOINT;
  });

  it('stays disabled (no-op) when OTEL_ENABLED is not "true"', () => {
    delete process.env.OTEL_ENABLED;
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

    const tracing = bootstrapTracing();

    assert.equal(tracing.enabled, false);
  });

  it('stays disabled when OTEL_ENABLED=true but no OTLP endpoint is configured', () => {
    process.env.OTEL_ENABLED = 'true';
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

    const tracing = bootstrapTracing();

    assert.equal(tracing.enabled, false);
  });

  it('shutdown() resolves without throwing when tracing was never started', async () => {
    delete process.env.OTEL_ENABLED;
    const tracing = bootstrapTracing();

    await assert.doesNotReject(() => tracing.shutdown());
  });
});
