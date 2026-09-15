import { IsOptional, IsString, MaxLength } from 'class-validator';

// Doctor Patient Chart Phase 2's PATCH /appointments/:id/decline body --
// `reason` is optional, mirroring SubmitConsultationFeedbackRequestDto's
// own optional-string decorator convention.
export class DeclineAppointmentRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
