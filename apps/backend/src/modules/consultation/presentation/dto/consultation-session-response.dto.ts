import type { ConsultationSession } from '../../domain/entities/consultation-session.entity.js';
import type { ConsultationCompletionReason } from '../../domain/enums/consultation-completion-reason.enum.js';
import type { ConsultationState } from '../../domain/enums/consultation-state.enum.js';

// Matches docs/12-openapi.md's ConsultationSummary schema exactly, plus
// completionReason (consultation lifecycle completion follow-up,
// 2026-07-26) -- the field that actually distinguishes a genuinely
// Completed session from an Interrupted one, since both land in the same
// `Closed` state.
export class ConsultationSessionResponseDto {
  id!: string;
  appointmentId!: string;
  state!: ConsultationState;
  completionReason!: ConsultationCompletionReason | null;
  startedAt!: string | null;
  closedAt!: string | null;

  static fromDomain(session: ConsultationSession): ConsultationSessionResponseDto {
    const dto = new ConsultationSessionResponseDto();
    dto.id = session.getId();
    dto.appointmentId = session.getAppointmentId();
    dto.state = session.getState();
    dto.completionReason = session.getCompletionReason() ?? null;
    dto.startedAt = session.getStartedAt()?.toISOString() ?? null;
    dto.closedAt = session.getClosedAt()?.toISOString() ?? null;
    return dto;
  }
}
