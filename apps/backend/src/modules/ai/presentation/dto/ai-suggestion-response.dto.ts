import type { AISuggestion } from '../../domain/entities/ai-suggestion.entity.js';
import type { AISuggestionDecision } from '../../domain/enums/ai-suggestion-decision.enum.js';
import type { AISuggestionType } from '../../domain/enums/ai-suggestion-type.enum.js';

// Matches docs/12-openapi.md's AISuggestion schema exactly.
export class AISuggestionResponseDto {
  id!: string;
  consultationSessionId!: string;
  suggestionType!: AISuggestionType;
  content!: string;
  confidenceScore!: number | null;
  safetyFlags!: string[];
  requiresAcknowledgment!: boolean;
  doctorDecision!: AISuggestionDecision | null;
  decisionJustification!: string | null;
  generatedAt!: string;

  static fromDomain(suggestion: AISuggestion): AISuggestionResponseDto {
    const dto = new AISuggestionResponseDto();
    dto.id = suggestion.getId();
    dto.consultationSessionId = suggestion.getConsultationSessionId();
    dto.suggestionType = suggestion.getSuggestionType();
    dto.content = suggestion.getContent();
    dto.confidenceScore = suggestion.getConfidenceScore() ?? null;
    dto.safetyFlags = suggestion.getSafetyFlags();
    dto.requiresAcknowledgment = suggestion.getRequiresAcknowledgment();
    dto.doctorDecision = suggestion.getDoctorDecision() ?? null;
    dto.decisionJustification = suggestion.getDecisionJustification() ?? null;
    dto.generatedAt = suggestion.getGeneratedAt().toISOString();
    return dto;
  }
}
