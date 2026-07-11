import type {
  VerificationCase as PrismaVerificationCaseRow,
  VerificationDocument as PrismaVerificationDocumentRow,
} from '@prisma/client';

import { VerificationCase } from '../../domain/entities/verification-case.entity.js';

import { toDomainVerificationStatus } from './verification-status.mapper.js';

export type PersistedVerificationCaseRow = PrismaVerificationCaseRow & {
  documents: PrismaVerificationDocumentRow[];
};

export function toDomainVerificationCase(row: PersistedVerificationCaseRow): VerificationCase {
  return VerificationCase.reconstitute({
    id: row.id,
    doctorId: row.doctorId,
    licenseNumber: row.licenseNumber,
    specialtyCode: row.specialtyCode,
    documentAssetIds: row.documents.map((document) => document.mediaAssetId),
    status: toDomainVerificationStatus(row.status),
    reason: row.reason ?? undefined,
    submittedAt: row.submittedAt,
    decidedAt: row.decidedAt ?? undefined,
  });
}
