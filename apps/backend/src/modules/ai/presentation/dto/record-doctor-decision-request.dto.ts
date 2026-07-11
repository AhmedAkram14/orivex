import { IsEnum, IsOptional, IsString } from 'class-validator';

import { AISuggestionDecision } from '../../domain/enums/ai-suggestion-decision.enum.js';

// Matches docs/12-openapi.md's recordDoctorDecision request body.
export class RecordDoctorDecisionRequestDto {
  @IsEnum(AISuggestionDecision)
  decision!: AISuggestionDecision;

  @IsOptional()
  @IsString()
  justification?: string;
}
