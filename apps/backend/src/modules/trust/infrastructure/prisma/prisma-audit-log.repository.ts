import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { AuditLog } from '../../domain/entities/audit-log.entity.js';
import type {
  AuditLogRepository,
  FindAuditLogEntriesFilter,
  FindAuditLogEntriesResult,
} from '../../domain/repositories/audit-log.repository.js';

import { DOMAIN_TO_PRISMA_ACTION, toDomainAuditLog, toPersistedAuditLog } from './audit-log.mapper.js';

@Injectable()
export class PrismaAuditLogRepository implements AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Append-only: a plain create, never an upsert or update -- matches
  // SecurityEventRepository.record()'s exact pattern.
  async record(entry: AuditLog): Promise<void> {
    await this.prisma.auditLog.create({ data: toPersistedAuditLog(entry) });
  }

  // I11 -- Admin audit-log viewer: newest-first, matching every other
  // admin list read in this codebase (ListPaymentTransactionsUseCase etc.).
  async findMany(filter: FindAuditLogEntriesFilter): Promise<FindAuditLogEntriesResult> {
    const where = {
      actorAccountId: filter.actorAccountId,
      subjectType: filter.subjectType,
      subjectId: filter.subjectId,
      action: filter.action ? DOMAIN_TO_PRISMA_ACTION[filter.action] : undefined,
    };

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: filter.offset,
        take: filter.limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { entries: rows.map((row) => toDomainAuditLog(row)), total };
  }
}
