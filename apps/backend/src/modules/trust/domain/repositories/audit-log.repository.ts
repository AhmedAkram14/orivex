import type { AuditAction } from '../enums/audit-action.enum.js';
import type { AuditLog } from '../entities/audit-log.entity.js';

export interface FindAuditLogEntriesFilter {
  actorAccountId?: string;
  subjectType?: string;
  subjectId?: string;
  action?: AuditAction;
  offset: number;
  limit: number;
}

export interface FindAuditLogEntriesResult {
  entries: AuditLog[];
  total: number;
}

// I11 -- Admin audit-log viewer (ORIVEX Remaining Work Audit): the read
// side C2's own comment named as a separate, not-yet-built feature.
// `findMany` is deliberately the only read method -- a single flexible
// filter, newest-first, rather than one method per filter combination
// (matches ListPaymentTransactionsUseCase's own single-query-shape
// precedent).
export interface AuditLogRepository {
  record(entry: AuditLog): Promise<void>;
  findMany(filter: FindAuditLogEntriesFilter): Promise<FindAuditLogEntriesResult>;
}
