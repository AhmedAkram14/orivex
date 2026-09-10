import type { Dispute } from '../../domain/entities/dispute.entity.js';
import type { DisputeStatus } from '../../domain/enums/dispute-status.enum.js';

export class DisputeResponseDto {
  id!: string;
  appointmentId!: string;
  raisedByAccountId!: string;
  reason!: string;
  status!: DisputeStatus;
  resolutionNotes!: string | null;
  resolvedByAccountId!: string | null;
  resolvedAt!: string | null;
  createdAt!: string;

  static fromDomain(dispute: Dispute): DisputeResponseDto {
    const dto = new DisputeResponseDto();
    dto.id = dispute.getId();
    dto.appointmentId = dispute.getAppointmentId();
    dto.raisedByAccountId = dispute.getRaisedByAccountId();
    dto.reason = dispute.getReason();
    dto.status = dispute.getStatus();
    dto.resolutionNotes = dispute.getResolutionNotes() ?? null;
    dto.resolvedByAccountId = dispute.getResolvedByAccountId() ?? null;
    dto.resolvedAt = dispute.getResolvedAt()?.toISOString() ?? null;
    dto.createdAt = dispute.getCreatedAt().toISOString();
    return dto;
  }
}
