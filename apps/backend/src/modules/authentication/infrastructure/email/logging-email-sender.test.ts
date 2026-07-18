import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ConfigService } from '@nestjs/config';

import type { EnvConfig } from '../../../../core/configuration/env.schema.js';
import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';

import { LoggingEmailSender } from './logging-email-sender.js';

function fakeConfigService(nodeEnv: string): ConfigService<EnvConfig, true> {
  return { get: () => nodeEnv } as unknown as ConfigService<EnvConfig, true>;
}

describe('LoggingEmailSender', () => {
  it('logs the intended send with the full payload outside production', async () => {
    const logged: unknown[] = [];
    const fakeLogger = { log: (...args: unknown[]) => logged.push(args) } as unknown as PinoLoggerService;
    const sender = new LoggingEmailSender(fakeLogger, fakeConfigService('development'));

    await sender.send('ada@example.com', 'email-verification', { token: 'abc' });

    assert.equal(logged.length, 1);
    const [message, context] = logged[0] as [string, { to: string; template: string; data: unknown }];
    assert.match(message, /email-verification/);
    assert.equal(context.to, 'ada@example.com');
    assert.equal(context.template, 'email-verification');
    assert.deepEqual(context.data, { token: 'abc' });
  });

  it('redacts the payload in production so tokens never reach production logs', async () => {
    const logged: unknown[] = [];
    const fakeLogger = { log: (...args: unknown[]) => logged.push(args) } as unknown as PinoLoggerService;
    const sender = new LoggingEmailSender(fakeLogger, fakeConfigService('production'));

    await sender.send('ada@example.com', 'password-reset', { token: 'super-secret-reset-token' });

    assert.equal(logged.length, 1);
    const [, context] = logged[0] as [string, { data: unknown }];
    assert.equal(context.data, '[redacted]');
  });
});
