import type { ConsultationSession } from '../../domain/entities/consultation-session.entity.js';
import type { ConsultationState } from '../../domain/enums/consultation-state.enum.js';

// Matches docs/12-openapi.md's ConsultationSummary schema exactly.
export class ConsultationSessionResponseDto {
  id!: string;
  appointmentId!: string;
  state!: ConsultationState;
  startedAt!: string | null;
  closedAt!: string | null;

  static fromDomain(session: ConsultationSession): ConsultationSessionResponseDto {
    const dto = new ConsultationSessionResponseDto();
    dto.id = session.getId();
    dto.appointmentId = session.getAppointmentId();
    dto.state = session.getState();
    dto.startedAt = session.getStartedAt()?.toISOString() ?? null;
    dto.closedAt = session.getClosedAt()?.toISOString() ?? null;
    return dto;
  }
}
