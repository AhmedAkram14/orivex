import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { LOG_REDACT_PATHS, PinoLoggerService } from './pino-logger.service.js';

describe('PinoLoggerService redaction', () => {
  it('lists every credential/token field this service is known to carry as context', () => {
    for (const field of ['context.password', 'context.currentPassword', 'context.newPassword', 'context.accessToken', 'context.refreshToken']) {
      assert.ok(LOG_REDACT_PATHS.includes(field), `expected LOG_REDACT_PATHS to include "${field}"`);
    }
  });

  it('redacts a sensitive field instead of writing its real value to the log line', () => {
    const originalWrite = process.stdout.write.bind(process.stdout);
    const lines: string[] = [];
    process.stdout.write = ((chunk: string) => {
      lines.push(chunk.toString());
      return true;
    }) as typeof process.stdout.write;

    try {
      const logger = new PinoLoggerService();
      logger.error('Login failed', undefined, { password: 'super-secret-value', requestId: 'req-1' });
    } finally {
      process.stdout.write = originalWrite;
    }

    const output = lines.join('');
    assert.ok(!output.includes('super-secret-value'), 'raw password value must never reach the log output');
    assert.ok(output.includes('[REDACTED]'), 'redacted field must be censored, not silently dropped');
  });
});
