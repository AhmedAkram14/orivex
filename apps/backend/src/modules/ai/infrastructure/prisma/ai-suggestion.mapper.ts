import type { AISuggestion as PrismaAISuggestionRow } from '@prisma/client';

import { AISuggestion } from '../../domain/entities/ai-suggestion.entity.js';

import { toDomainAISuggestionDecision } from './ai-suggestion-decision.mapper.js';
import { toDomainAISuggestionType } from './ai-suggestion-type.mapper.js';

export function toDomainAISuggestion(row: PrismaAISuggestionRow): AISuggestion {
  return AISuggestion.reconstitute({
    id: row.id,
    consultationSessionId: row.consultationSessionId,
    suggestionType: toDomainAISuggestionType(row.suggestionType),
    content: row.content,
    confidenceScore: row.confidenceScore ?? undefined,
    safetyFlags: Array.isArray(row.safetyFlags) ? (row.safetyFlags as string[]) : [],
    requiresAcknowledgment: row.requiresAcknowledgment,
    doctorDecision: row.doctorDecision ? toDomainAISuggestionDecision(row.doctorDecision) : undefined,
    decisionJustification: row.decisionJustification ?? undefined,
    generatedAt: row.generatedAt,
    decidedAt: row.decidedAt ?? undefined,
  });
}
