import { AISuggestionDecision as PrismaAISuggestionDecision } from '@prisma/client';

import { AISuggestionDecision } from '../../domain/enums/ai-suggestion-decision.enum.js';

// Prisma's enum is UPPER_SNAKE (database convention); the domain enum is
// lower_snake, matching docs/12-openapi.md's recordDoctorDecision decision
// exactly. This is the sole place the two vocabularies are translated.
const DOMAIN_TO_PRISMA: Record<AISuggestionDecision, PrismaAISuggestionDecision> = {
  [AISuggestionDecision.Approved]: PrismaAISuggestionDecision.APPROVED,
  [AISuggestionDecision.Edited]: PrismaAISuggestionDecision.EDITED,
  [AISuggestionDecision.Rejected]: PrismaAISuggestionDecision.REJECTED,
};

const PRISMA_TO_DOMAIN: Record<PrismaAISuggestionDecision, AISuggestionDecision> = {
  [PrismaAISuggestionDecision.APPROVED]: AISuggestionDecision.Approved,
  [PrismaAISuggestionDecision.EDITED]: AISuggestionDecision.Edited,
  [PrismaAISuggestionDecision.REJECTED]: AISuggestionDecision.Rejected,
};

export function toPrismaAISuggestionDecision(decision: AISuggestionDecision): PrismaAISuggestionDecision {
  return DOMAIN_TO_PRISMA[decision];
}

export function toDomainAISuggestionDecision(decision: PrismaAISuggestionDecision): AISuggestionDecision {
  return PRISMA_TO_DOMAIN[decision];
}
