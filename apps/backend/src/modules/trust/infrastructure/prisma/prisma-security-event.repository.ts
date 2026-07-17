import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { SecurityEvent } from '../../domain/entities/security-event.entity.js';
import type { SecurityEventRepository } from '../../domain/repositories/security-event.repository.js';

import { toDomainSecurityEvent, toPersistedSecurityEvent } from './security-event.mapper.js';

@Injectable()
export class PrismaSecurityEventRepository implements SecurityEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Append-only: a plain create, never an upsert -- every call records a new
  // event, there is no "same event again" concept to reconcile.
  async record(event: SecurityEvent): Promise<void> {
    await this.prisma.securityEvent.create({ data: toPersistedSecurityEvent(event) });
  }

  async findByAccountId(accountId: string): Promise<SecurityEvent[]> {
    const rows = await this.prisma.securityEvent.findMany({
      where: { accountId },
      orderBy: { detectedAt: 'desc' },
    });
    return rows.map(toDomainSecurityEvent);
  }
}
