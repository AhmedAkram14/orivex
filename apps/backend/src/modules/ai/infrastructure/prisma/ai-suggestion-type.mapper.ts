import { AISuggestionType as PrismaAISuggestionType } from '@prisma/client';

import { AISuggestionType } from '../../domain/enums/ai-suggestion-type.enum.js';

// Prisma's enum is UPPER_SNAKE (database convention); the domain enum is
// lower_snake, matching docs/12-openapi.md's requestAISuggestion
// suggestionType exactly. This is the sole place the two vocabularies are
// translated.
const DOMAIN_TO_PRISMA: Record<AISuggestionType, PrismaAISuggestionType> = {
  [AISuggestionType.SoapDraft]: PrismaAISuggestionType.SOAP_DRAFT,
  [AISuggestionType.PrescriptionDraft]: PrismaAISuggestionType.PRESCRIPTION_DRAFT,
  [AISuggestionType.InteractionFlag]: PrismaAISuggestionType.INTERACTION_FLAG,
  [AISuggestionType.SuggestedQuestion]: PrismaAISuggestionType.SUGGESTED_QUESTION,
  [AISuggestionType.Summary]: PrismaAISuggestionType.SUMMARY,
  [AISuggestionType.FollowUpPlan]: PrismaAISuggestionType.FOLLOW_UP_PLAN,
};

const PRISMA_TO_DOMAIN: Record<PrismaAISuggestionType, AISuggestionType> = {
  [PrismaAISuggestionType.SOAP_DRAFT]: AISuggestionType.SoapDraft,
  [PrismaAISuggestionType.PRESCRIPTION_DRAFT]: AISuggestionType.PrescriptionDraft,
  [PrismaAISuggestionType.INTERACTION_FLAG]: AISuggestionType.InteractionFlag,
  [PrismaAISuggestionType.SUGGESTED_QUESTION]: AISuggestionType.SuggestedQuestion,
  [PrismaAISuggestionType.SUMMARY]: AISuggestionType.Summary,
  [PrismaAISuggestionType.FOLLOW_UP_PLAN]: AISuggestionType.FollowUpPlan,
};

export function toPrismaAISuggestionType(type: AISuggestionType): PrismaAISuggestionType {
  return DOMAIN_TO_PRISMA[type];
}

export function toDomainAISuggestionType(type: PrismaAISuggestionType): AISuggestionType {
  return PRISMA_TO_DOMAIN[type];
}
