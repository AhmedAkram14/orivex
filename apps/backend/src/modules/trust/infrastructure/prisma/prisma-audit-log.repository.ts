import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { AuditLog } from '../../domain/entities/audit-log.entity.js';
import type { AuditLogRepository } from '../../domain/repositories/audit-log.repository.js';

import { toPersistedAuditLog } from './audit-log.mapper.js';

@Injectable()
export class PrismaAuditLogRepository implements AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Append-only: a plain create, never an upsert or update -- matches
  // SecurityEventRepository.record()'s exact pattern.
  async record(entry: AuditLog): Promise<void> {
    await this.prisma.auditLog.create({ data: toPersistedAuditLog(entry) });
  }
}
