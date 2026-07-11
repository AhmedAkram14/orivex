import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { AISuggestion } from '../../domain/entities/ai-suggestion.entity.js';
import type { AISuggestionRepository } from '../../domain/repositories/ai-suggestion.repository.js';

import { toPrismaAISuggestionDecision } from './ai-suggestion-decision.mapper.js';
import { toDomainAISuggestion } from './ai-suggestion.mapper.js';
import { toPrismaAISuggestionType } from './ai-suggestion-type.mapper.js';

@Injectable()
export class PrismaAISuggestionRepository implements AISuggestionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<AISuggestion | null> {
    const row = await this.prisma.aISuggestion.findUnique({ where: { id } });
    return row ? toDomainAISuggestion(row) : null;
  }

  // AISuggestion is created once (on generation) and mutated exactly once
  // more (recordDecision) -- no further changes after that
  // (docs/09-physical-database.md: "Generated -> actioned -> immutable").
  async save(suggestion: AISuggestion): Promise<void> {
    const id = suggestion.getId();
    const decision = suggestion.getDoctorDecision();

    const existing = await this.prisma.aISuggestion.findUnique({ where: { id }, select: { id: true } });

    if (!existing) {
      await this.prisma.aISuggestion.create({
        data: {
          id,
          consultationSessionId: suggestion.getConsultationSessionId(),
          suggestionType: toPrismaAISuggestionType(suggestion.getSuggestionType()),
          content: suggestion.getContent(),
          confidenceScore: suggestion.getConfidenceScore() ?? null,
          safetyFlags: suggestion.getSafetyFlags(),
          requiresAcknowledgment: suggestion.getRequiresAcknowledgment(),
          doctorDecision: decision ? toPrismaAISuggestionDecision(decision) : null,
          decisionJustification: suggestion.getDecisionJustification() ?? null,
          generatedAt: suggestion.getGeneratedAt(),
          decidedAt: suggestion.getDecidedAt() ?? null,
        },
      });
      return;
    }

    await this.prisma.aISuggestion.update({
      where: { id },
      data: {
        doctorDecision: decision ? toPrismaAISuggestionDecision(decision) : null,
        decisionJustification: suggestion.getDecisionJustification() ?? null,
        decidedAt: suggestion.getDecidedAt() ?? null,
      },
    });
  }
}
