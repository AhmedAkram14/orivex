import type { HealthPassportEntry as PrismaHealthPassportEntry } from '@prisma/client';

import { HealthPassportEntry } from '../../domain/entities/health-passport-entry.entity.js';

import { toDomainHealthPassportEntryCategory } from './health-passport-entry-category.mapper.js';

export function toDomainHealthPassportEntry(row: PrismaHealthPassportEntry): HealthPassportEntry {
  return HealthPassportEntry.reconstitute({
    id: row.id,
    patientId: row.patientId,
    category: toDomainHealthPassportEntryCategory(row.category),
    title: row.title,
    detail: row.detail ?? undefined,
    occurredAt: row.occurredAt ?? undefined,
    createdAt: row.createdAt,
  });
}
