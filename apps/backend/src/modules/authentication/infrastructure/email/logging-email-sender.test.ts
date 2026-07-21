import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ConfigService } from '@nestjs/config';

import type { EnvConfig } from '../../../../core/configuration/env.schema.js';
import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';

import { LoggingEmailSender } from './logging-email-sender.js';

function fakeConfigService(values: { NODE_ENV: string; FRONTEND_URL?: string }): ConfigService<EnvConfig, true> {
  return { get: (key: string) => values[key as keyof typeof values] } as unknown as ConfigService<EnvConfig, true>;
}

describe('LoggingEmailSender', () => {
  it('logs the intended send with the full payload outside production', async () => {
    const logged: unknown[] = [];
    const fakeLogger = { log: (...args: unknown[]) => logged.push(args) } as unknown as PinoLoggerService;
    const sender = new LoggingEmailSender(fakeLogger, fakeConfigService({ NODE_ENV: 'development' }));

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
    const sender = new LoggingEmailSender(fakeLogger, fakeConfigService({ NODE_ENV: 'production' }));

    await sender.send('ada@example.com', 'password-reset', { token: 'super-secret-reset-token' });

    assert.equal(logged.length, 1);
    const [, context] = logged[0] as [string, { data: unknown }];
    assert.equal(context.data, '[redacted]');
  });

  it('includes the real clickable verify-email link when FRONTEND_URL is set (outside production)', async () => {
    const logged: unknown[] = [];
    const fakeLogger = { log: (...args: unknown[]) => logged.push(args) } as unknown as PinoLoggerService;
    const sender = new LoggingEmailSender(
      fakeLogger,
      fakeConfigService({ NODE_ENV: 'development', FRONTEND_URL: 'http://localhost:3000' }),
    );

    await sender.send('ada@example.com', 'email-verification', { token: 'abc' });

    const [, context] = logged[0] as [string, { data: { link?: string } }];
    assert.equal(context.data.link, 'http://localhost:3000/verify-email?token=abc');
  });

  it('includes the real clickable reset-password link when FRONTEND_URL is set (outside production)', async () => {
    const logged: unknown[] = [];
    const fakeLogger = { log: (...args: unknown[]) => logged.push(args) } as unknown as PinoLoggerService;
    const sender = new LoggingEmailSender(
      fakeLogger,
      fakeConfigService({ NODE_ENV: 'development', FRONTEND_URL: 'http://localhost:3000' }),
    );

    await sender.send('ada@example.com', 'password-reset', { token: 'xyz' });

    const [, context] = logged[0] as [string, { data: { link?: string } }];
    assert.equal(context.data.link, 'http://localhost:3000/reset-password?token=xyz');
  });

  it('falls back to the bare token when FRONTEND_URL is unset', async () => {
    const logged: unknown[] = [];
    const fakeLogger = { log: (...args: unknown[]) => logged.push(args) } as unknown as PinoLoggerService;
    const sender = new LoggingEmailSender(fakeLogger, fakeConfigService({ NODE_ENV: 'development' }));

    await sender.send('ada@example.com', 'email-verification', { token: 'abc' });

    const [, context] = logged[0] as [string, { data: unknown }];
    assert.deepEqual(context.data, { token: 'abc' });
  });
});
