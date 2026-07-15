import { Injectable } from '@nestjs/common';

import { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import type { EmailSenderPort } from '../../application/ports/email-sender.port.js';

// No real email/SMS integration exists anywhere in this backend yet. This
// adapter structured-logs the intended send instead of silently no-op'ing,
// so the verification/reset link is visible (in server logs) for manual
// testing and honestly documents that delivery is not yet real -- never
// faked as delivered. Swapping in a real provider (e.g. SES) later is a new
// adapter bound to EMAIL_SENDER in authentication.module.ts, not a change
// to any use case that depends on EmailSenderPort.
@Injectable()
export class LoggingEmailSender implements EmailSenderPort {
  constructor(private readonly logger: PinoLoggerService) {}

  async send(to: string, template: string, data: Record<string, unknown>): Promise<void> {
    this.logger.log(`Email (stub, not actually delivered): ${template} -> ${to}`, { template, to, data });
  }
}
