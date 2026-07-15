import { SecurityEvent } from '../../../domain/entities/security-event.entity.js';
import type { SecurityEventRepository } from '../../../domain/repositories/security-event.repository.js';

import type { RecordSecurityEventCommand } from './record-security-event.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// trust.module.ts only. This is the exported port AuthenticationModule calls
// for every security-relevant outcome (login success/failure, lockout,
// password change/reset, refresh-token reuse) — a legitimate module-to-
// module use-case call, never a direct write to SecurityEvent from outside
// TrustModule.
export class RecordSecurityEventUseCase {
  constructor(private readonly securityEventRepository: SecurityEventRepository) {}

  async execute(command: RecordSecurityEventCommand): Promise<SecurityEvent> {
    const event = SecurityEvent.record({
      accountId: command.accountId,
      eventType: command.eventType,
      ipAddress: command.ipAddress,
      userAgent: command.userAgent,
      metadata: command.metadata,
    });

    await this.securityEventRepository.record(event);

    return event;
  }
}
