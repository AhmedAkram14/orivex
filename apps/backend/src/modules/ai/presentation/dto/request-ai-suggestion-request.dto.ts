import { IsEnum, IsUUID } from 'class-validator';

import { AISuggestionType } from '../../domain/enums/ai-suggestion-type.enum.js';

// Matches docs/12-openapi.md's requestAISuggestion request body.
// requestingDoctorId is an additive field -- Authentication isn't built yet
// (mirrors SignPrescriptionRequestDto's authoringDoctorId precedent).
export class RequestAISuggestionRequestDto {
  @IsUUID()
  requestingDoctorId!: string;

  @IsUUID()
  consultationSessionId!: string;

  @IsEnum(AISuggestionType)
  suggestionType!: AISuggestionType;
}
