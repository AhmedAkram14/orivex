import { IsEnum } from 'class-validator';

import { ConsultationCompletionReason } from '../../domain/enums/consultation-completion-reason.enum.js';

// Matches docs/12-openapi.md's closeConsultation request body exactly.
export class CloseConsultationRequestDto {
  @IsEnum(ConsultationCompletionReason)
  completionReason!: ConsultationCompletionReason;
}
