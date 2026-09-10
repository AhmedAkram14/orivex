import type { AuditLog } from '../../../domain/entities/audit-log.entity.js';
import type { AuditLogRepository } from '../../../domain/repositories/audit-log.repository.js';

import type { ListAuditLogEntriesQuery } from './list-audit-log-entries.query.js';

export interface ListAuditLogEntriesResult {
  entries: AuditLog[];
  total: number;
}

// I11 -- Admin audit-log viewer (ORIVEX Remaining Work Audit): the real
// global, cross-account audit feed AdministrationController's own
// getSecurityEventsForAccount comment named as deferred -- a SuperAdmin can
// now search every PHI access/clinical write by actor, subject, or action,
// not just one account's authentication events at a time.
export class ListAuditLogEntriesUseCase {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  async execute(query: ListAuditLogEntriesQuery): Promise<ListAuditLogEntriesResult> {
    const { entries, total } = await this.auditLogRepository.findMany({
      actorAccountId: query.actorAccountId,
      subjectType: query.subjectType,
      subjectId: query.subjectId,
      action: query.action,
      offset: (query.page - 1) * query.limit,
      limit: query.limit,
    });
    return { entries, total };
  }
}
