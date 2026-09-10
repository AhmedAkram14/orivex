import type { ListAuditLogEntriesResult } from '../../../trust/application/use-cases/list-audit-log-entries/list-audit-log-entries.use-case.js';

import { AuditLogEntryResponseDto } from './audit-log-entry-response.dto.js';

// Mirrors ListAdminPaymentTransactionsResponseDto's own {items, total, page, limit} shape.
export class ListAuditLogResponseDto {
  entries!: AuditLogEntryResponseDto[];
  total!: number;
  page!: number;
  limit!: number;

  static fromResult(result: ListAuditLogEntriesResult, page: number, limit: number): ListAuditLogResponseDto {
    const dto = new ListAuditLogResponseDto();
    dto.entries = result.entries.map((entry) => AuditLogEntryResponseDto.fromDomain(entry));
    dto.total = result.total;
    dto.page = page;
    dto.limit = limit;
    return dto;
  }
}
