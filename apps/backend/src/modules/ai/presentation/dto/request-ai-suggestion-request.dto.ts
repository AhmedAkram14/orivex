import { IsEnum, IsUUID } from 'class-validator';

import { AISuggestionType } from '../../domain/enums/ai-suggestion-type.enum.js';

// Matches docs/12-openapi.md's requestAISuggestion request body, minus
// requestingDoctorId -- the controller derives it from the authenticated
// caller's JWT (CurrentUser).
export class RequestAISuggestionRequestDto {
  @IsUUID()
  consultationSessionId!: string;

  @IsEnum(AISuggestionType)
  suggestionType!: AISuggestionType;
}
