import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { HealthPassportEntry } from '../../domain/entities/health-passport-entry.entity.js';
import type { HealthPassportEntryRepository } from '../../domain/repositories/health-passport-entry.repository.js';

import { toDomainHealthPassportEntry } from './health-passport-entry.mapper.js';
import { toPrismaHealthPassportEntryCategory } from './health-passport-entry-category.mapper.js';

@Injectable()
export class PrismaHealthPassportEntryRepository implements HealthPassportEntryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<HealthPassportEntry | null> {
    const row = await this.prisma.healthPassportEntry.findUnique({ where: { id } });
    return row ? toDomainHealthPassportEntry(row) : null;
  }

  async findByPatientId(patientId: string): Promise<HealthPassportEntry[]> {
    const rows = await this.prisma.healthPassportEntry.findMany({
      where: { patientId },
      orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
    });
    return rows.map(toDomainHealthPassportEntry);
  }

  async save(entry: HealthPassportEntry): Promise<void> {
    await this.prisma.healthPassportEntry.create({
      data: {
        id: entry.getId(),
        patientId: entry.getPatientId(),
        category: toPrismaHealthPassportEntryCategory(entry.getCategory()),
        title: entry.getTitle(),
        detail: entry.getDetail() ?? null,
        occurredAt: entry.getOccurredAt() ?? null,
        createdAt: entry.getCreatedAt(),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.healthPassportEntry.delete({ where: { id } });
  }
}
