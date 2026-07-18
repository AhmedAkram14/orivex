import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { EnvConfig } from '../../../../core/configuration/env.schema.js';
import { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import type { EmailSenderPort } from '../../application/ports/email-sender.port.js';

// No real email/SMS integration exists anywhere in this backend yet. This
// adapter structured-logs the intended send instead of silently no-op'ing,
// so the verification/reset link is visible (in server logs) for manual
// testing and honestly documents that delivery is not yet real -- never
// faked as delivered. Swapping in a real provider (e.g. SES) later is a new
// adapter bound to EMAIL_SENDER in authentication.module.ts, not a change
// to any use case that depends on EmailSenderPort.
//
// `data` always carries a raw, single-use password-reset/email-verification
// token (the whole point of this stub is to expose it for local testing).
// Logging that token in production would let anyone with log-read access
// take over any account, so the token payload is redacted whenever
// NODE_ENV=production -- only non-production environments get the full
// payload this stub exists for.
@Injectable()
export class LoggingEmailSender implements EmailSenderPort {
  constructor(
    private readonly logger: PinoLoggerService,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  async send(to: string, template: string, data: Record<string, unknown>): Promise<void> {
    const isProduction = this.configService.get('NODE_ENV', { infer: true }) === 'production';
    const loggedData = isProduction ? '[redacted]' : data;
    this.logger.log(`Email (stub, not actually delivered): ${template} -> ${to}`, { template, to, data: loggedData });
  }
}
