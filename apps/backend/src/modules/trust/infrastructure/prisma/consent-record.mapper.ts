import { ConsentState as PrismaConsentState } from '@prisma/client';
import type { ConsentRecord as PrismaConsentRecordRow } from '@prisma/client';

import { ConsentRecord } from '../../domain/entities/consent-record.entity.js';
import { ConsentState } from '../../domain/enums/consent-state.enum.js';

// Prisma's enum is UPPER_SNAKE (database convention); the domain enum is
// lower_snake. This is the sole place the two vocabularies are translated
// (mirrors audit-log.mapper.ts's established pattern).
const DOMAIN_TO_PRISMA_STATE: Record<ConsentState, PrismaConsentState> = {
  [ConsentState.Granted]: PrismaConsentState.GRANTED,
  [ConsentState.Revoked]: PrismaConsentState.REVOKED,
};

const PRISMA_TO_DOMAIN_STATE: Record<PrismaConsentState, ConsentState> = {
  [PrismaConsentState.GRANTED]: ConsentState.Granted,
  [PrismaConsentState.REVOKED]: ConsentState.Revoked,
};

export interface PersistedConsentRecord {
  id: string;
  patientId: string;
  doctorId: string;
  scopeCategoryId: string;
  state: PrismaConsentState;
  versionNumber: number;
  legalBasisVersion: string;
  effectiveAt: Date;
  createdAt: Date;
}

export function toPersistedConsentRecord(record: ConsentRecord): PersistedConsentRecord {
  return {
    id: record.getId(),
    patientId: record.getPatientId(),
    doctorId: record.getDoctorId(),
    scopeCategoryId: record.getScopeCategoryId(),
    state: DOMAIN_TO_PRISMA_STATE[record.getState()],
    versionNumber: record.getVersionNumber(),
    legalBasisVersion: record.getLegalBasisVersion(),
    effectiveAt: record.getEffectiveAt(),
    createdAt: record.getCreatedAt(),
  };
}

export function toDomainConsentRecord(row: PrismaConsentRecordRow): ConsentRecord {
  return ConsentRecord.reconstitute({
    id: row.id,
    patientId: row.patientId,
    doctorId: row.doctorId,
    scopeCategoryId: row.scopeCategoryId,
    state: PRISMA_TO_DOMAIN_STATE[row.state],
    versionNumber: row.versionNumber,
    legalBasisVersion: row.legalBasisVersion,
    effectiveAt: row.effectiveAt,
    createdAt: row.createdAt,
  });
}
