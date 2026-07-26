import type {
  VerificationCase as PrismaVerificationCaseRow,
  VerificationDocument as PrismaVerificationDocumentRow,
} from '@prisma/client';

import { VerificationCase } from '../../domain/entities/verification-case.entity.js';
import { VerificationSubjectType } from '../../domain/enums/verification-subject-type.enum.js';
import { DoctorProfessionalDetails } from '../../domain/value-objects/doctor-professional-details.js';
import { PatientIdentityDetails } from '../../domain/value-objects/patient-identity-details.js';
import type { VerificationSubjectDetails } from '../../domain/value-objects/verification-subject-details.js';

import { toDomainVerificationStatus } from './verification-status.mapper.js';
import { toDomainVerificationSubjectType } from './verification-subject-type.mapper.js';

export type PersistedVerificationCaseRow = PrismaVerificationCaseRow & {
  documents: PrismaVerificationDocumentRow[];
};

// The one place that knows how a persisted row's subjectType picks which
// VerificationSubjectDetails implementation to reconstitute -- outside the
// domain layer entirely, matching Account.mapper's own "infrastructure
// reconstructs domain value objects from primitives" precedent.
function toDomainSubjectDetails(row: PrismaVerificationCaseRow): VerificationSubjectDetails {
  const subjectType = toDomainVerificationSubjectType(row.subjectType);
  if (subjectType === VerificationSubjectType.Doctor) {
    if (!row.licenseNumber || !row.specialtyCode) {
      throw new Error(`VerificationCase "${row.id}" is subjectType Doctor but is missing licenseNumber/specialtyCode.`);
    }
    return DoctorProfessionalDetails.create(row.licenseNumber, row.specialtyCode);
  }
  return PatientIdentityDetails.create();
}

export function toDomainVerificationCase(row: PersistedVerificationCaseRow): VerificationCase {
  return VerificationCase.reconstitute({
    id: row.id,
    subjectAccountId: row.subjectAccountId,
    subjectDetails: toDomainSubjectDetails(row),
    documentAssetIds: row.documents.map((document) => document.mediaAssetId),
    status: toDomainVerificationStatus(row.status),
    reason: row.reason ?? undefined,
    submittedAt: row.submittedAt,
    decidedAt: row.decidedAt ?? undefined,
  });
}
