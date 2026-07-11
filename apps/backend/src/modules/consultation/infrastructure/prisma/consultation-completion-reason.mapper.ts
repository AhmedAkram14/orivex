import { ConsultationCompletionReason as PrismaConsultationCompletionReason } from '@prisma/client';

import { ConsultationCompletionReason } from '../../domain/enums/consultation-completion-reason.enum.js';

// Prisma's enum is UPPER_SNAKE (database convention); the domain enum is
// lower_snake, matching docs/12-openapi.md's closeConsultation request enum
// exactly. This is the sole place the two vocabularies are translated.
const DOMAIN_TO_PRISMA: Record<ConsultationCompletionReason, PrismaConsultationCompletionReason> = {
  [ConsultationCompletionReason.Completed]: PrismaConsultationCompletionReason.COMPLETED,
  [ConsultationCompletionReason.InterruptedTechnical]: PrismaConsultationCompletionReason.INTERRUPTED_TECHNICAL,
  [ConsultationCompletionReason.InterruptedOther]: PrismaConsultationCompletionReason.INTERRUPTED_OTHER,
};

const PRISMA_TO_DOMAIN: Record<PrismaConsultationCompletionReason, ConsultationCompletionReason> = {
  [PrismaConsultationCompletionReason.COMPLETED]: ConsultationCompletionReason.Completed,
  [PrismaConsultationCompletionReason.INTERRUPTED_TECHNICAL]: ConsultationCompletionReason.InterruptedTechnical,
  [PrismaConsultationCompletionReason.INTERRUPTED_OTHER]: ConsultationCompletionReason.InterruptedOther,
};

export function toPrismaConsultationCompletionReason(
  reason: ConsultationCompletionReason,
): PrismaConsultationCompletionReason {
  return DOMAIN_TO_PRISMA[reason];
}

export function toDomainConsultationCompletionReason(
  reason: PrismaConsultationCompletionReason,
): ConsultationCompletionReason {
  return PRISMA_TO_DOMAIN[reason];
}
