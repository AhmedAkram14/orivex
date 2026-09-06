import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { ConsentRecord } from '../../domain/entities/consent-record.entity.js';
import type { ConsentRecordRepository } from '../../domain/repositories/consent-record.repository.js';

import { toDomainConsentRecord, toPersistedConsentRecord } from './consent-record.mapper.js';

@Injectable()
export class PrismaConsentRecordRepository implements ConsentRecordRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCurrent(patientId: string, doctorId: string, scopeCategoryId: string): Promise<ConsentRecord | null> {
    const row = await this.prisma.consentRecord.findFirst({
      where: { patientId, doctorId, scopeCategoryId },
      orderBy: { versionNumber: 'desc' },
    });
    return row ? toDomainConsentRecord(row) : null;
  }

  // Table is bounded by (patient's doctor count) rows per patient -- small
  // enough that "load every row for this patient+scope, reduce to the
  // current version per doctor in memory" is simpler and just as correct as
  // a DISTINCT ON raw query, with no real performance cost at this scale.
  async findAllRevokedForPatient(patientId: string, scopeCategoryId: string): Promise<ConsentRecord[]> {
    const rows = await this.prisma.consentRecord.findMany({
      where: { patientId, scopeCategoryId },
      orderBy: { versionNumber: 'desc' },
    });

    const currentByDoctorId = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      if (!currentByDoctorId.has(row.doctorId)) {
        currentByDoctorId.set(row.doctorId, row);
      }
    }

    return [...currentByDoctorId.values()].filter((row) => row.state === 'REVOKED').map(toDomainConsentRecord);
  }

  async findAllForPatient(patientId: string): Promise<ConsentRecord[]> {
    const rows = await this.prisma.consentRecord.findMany({
      where: { patientId },
      orderBy: [{ createdAt: 'desc' }, { versionNumber: 'desc' }],
    });
    return rows.map(toDomainConsentRecord);
  }

  // Append-only: a plain create, never an upsert or update -- matches
  // AuditLogRepository.record()'s exact pattern. The unique constraint on
  // (patientId, doctorId, scopeCategoryId, versionNumber) is the database's
  // own backstop against two concurrent writers producing the same version.
  async save(record: ConsentRecord): Promise<void> {
    await this.prisma.consentRecord.create({ data: toPersistedConsentRecord(record) });
  }
}
