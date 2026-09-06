import { AuditLog } from '../../../domain/entities/audit-log.entity.js';
import type { AuditLogRepository } from '../../../domain/repositories/audit-log.repository.js';

import type { RecordAuditLogCommand } from './record-audit-log.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// trust.module.ts only. This is the exported port every other module calls
// for every PHI read and clinical/administrative write (a legitimate
// module-to-module use-case call, never a direct write to AuditLog from
// outside TrustModule) -- mirrors RecordSecurityEventUseCase's exact shape
// and role, but for clinical/administrative access instead of
// authentication outcomes.
export class RecordAuditLogUseCase {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  async execute(command: RecordAuditLogCommand): Promise<AuditLog> {
    const entry = AuditLog.record({
      actorAccountId: command.actorAccountId,
      actorRole: command.actorRole,
      action: command.action,
      subjectType: command.subjectType,
      subjectId: command.subjectId,
      reason: command.reason,
      metadata: command.metadata,
    });

    await this.auditLogRepository.record(entry);

    return entry;
  }
}
