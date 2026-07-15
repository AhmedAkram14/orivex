import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';

import { LoggingEmailSender } from './logging-email-sender.js';

describe('LoggingEmailSender', () => {
  it('logs the intended send rather than silently no-op-ing or throwing', async () => {
    const logged: unknown[] = [];
    const fakeLogger = { log: (...args: unknown[]) => logged.push(args) } as unknown as PinoLoggerService;
    const sender = new LoggingEmailSender(fakeLogger);

    await sender.send('ada@example.com', 'email-verification', { token: 'abc' });

    assert.equal(logged.length, 1);
    const [message, context] = logged[0] as [string, { to: string; template: string }];
    assert.match(message, /email-verification/);
    assert.equal(context.to, 'ada@example.com');
    assert.equal(context.template, 'email-verification');
  });
});
