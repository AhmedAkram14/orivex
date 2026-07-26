import { VerificationSubjectType as PrismaVerificationSubjectType } from '@prisma/client';

import { VerificationSubjectType } from '../../domain/enums/verification-subject-type.enum.js';

// Prisma's enum is UPPER_SNAKE (database convention); the domain enum is
// lowercase. This is the sole place the two vocabularies are translated
// (mirrors verification-status.mapper.ts's own precedent exactly).
const DOMAIN_TO_PRISMA: Record<VerificationSubjectType, PrismaVerificationSubjectType> = {
  [VerificationSubjectType.Doctor]: PrismaVerificationSubjectType.DOCTOR,
  [VerificationSubjectType.Patient]: PrismaVerificationSubjectType.PATIENT,
};

const PRISMA_TO_DOMAIN: Record<PrismaVerificationSubjectType, VerificationSubjectType> = {
  [PrismaVerificationSubjectType.DOCTOR]: VerificationSubjectType.Doctor,
  [PrismaVerificationSubjectType.PATIENT]: VerificationSubjectType.Patient,
};

export function toPrismaVerificationSubjectType(subjectType: VerificationSubjectType): PrismaVerificationSubjectType {
  return DOMAIN_TO_PRISMA[subjectType];
}

export function toDomainVerificationSubjectType(subjectType: PrismaVerificationSubjectType): VerificationSubjectType {
  return PRISMA_TO_DOMAIN[subjectType];
}
