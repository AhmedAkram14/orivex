import { VerificationStatus as PrismaVerificationStatus } from '@prisma/client';

import { VerificationStatus } from '../../domain/enums/verification-status.enum.js';

// Prisma's enum is UPPER_SNAKE (database convention); the domain/API enum is
// lower_snake (matches docs/12-openapi.md's VerificationCase.status exactly).
// This is the sole place the two vocabularies are translated.
const DOMAIN_TO_PRISMA: Record<VerificationStatus, PrismaVerificationStatus> = {
  [VerificationStatus.Submitted]: PrismaVerificationStatus.SUBMITTED,
  [VerificationStatus.UnderReview]: PrismaVerificationStatus.UNDER_REVIEW,
  [VerificationStatus.Approved]: PrismaVerificationStatus.APPROVED,
  [VerificationStatus.Rejected]: PrismaVerificationStatus.REJECTED,
  [VerificationStatus.MoreInfoNeeded]: PrismaVerificationStatus.MORE_INFO_NEEDED,
  [VerificationStatus.ReVerificationDue]: PrismaVerificationStatus.RE_VERIFICATION_DUE,
  [VerificationStatus.Suspended]: PrismaVerificationStatus.SUSPENDED,
};

const PRISMA_TO_DOMAIN: Record<PrismaVerificationStatus, VerificationStatus> = {
  [PrismaVerificationStatus.SUBMITTED]: VerificationStatus.Submitted,
  [PrismaVerificationStatus.UNDER_REVIEW]: VerificationStatus.UnderReview,
  [PrismaVerificationStatus.APPROVED]: VerificationStatus.Approved,
  [PrismaVerificationStatus.REJECTED]: VerificationStatus.Rejected,
  [PrismaVerificationStatus.MORE_INFO_NEEDED]: VerificationStatus.MoreInfoNeeded,
  [PrismaVerificationStatus.RE_VERIFICATION_DUE]: VerificationStatus.ReVerificationDue,
  [PrismaVerificationStatus.SUSPENDED]: VerificationStatus.Suspended,
};

export function toPrismaVerificationStatus(status: VerificationStatus): PrismaVerificationStatus {
  return DOMAIN_TO_PRISMA[status];
}

export function toDomainVerificationStatus(status: PrismaVerificationStatus): VerificationStatus {
  return PRISMA_TO_DOMAIN[status];
}
