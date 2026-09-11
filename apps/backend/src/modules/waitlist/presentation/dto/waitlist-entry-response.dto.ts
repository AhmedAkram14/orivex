import type { WaitlistEntry } from '../../domain/entities/waitlist-entry.entity.js';
import type { WaitlistEntryStatus } from '../../domain/enums/waitlist-entry-status.enum.js';
import type { ConsultationType } from '../../domain/enums/consultation-type.enum.js';

export class WaitlistEntryResponseDto {
  id!: string;
  doctorId!: string;
  consultationType!: ConsultationType | null;
  earliestAcceptableAt!: string;
  latestAcceptableAt!: string;
  status!: WaitlistEntryStatus;
  notifiedAt!: string | null;
  fulfilledAt!: string | null;
  cancelledAt!: string | null;
  createdAt!: string;

  static fromDomain(entry: WaitlistEntry): WaitlistEntryResponseDto {
    const dto = new WaitlistEntryResponseDto();
    dto.id = entry.getId();
    dto.doctorId = entry.getDoctorId();
    dto.consultationType = entry.getConsultationType() ?? null;
    dto.earliestAcceptableAt = entry.getEarliestAcceptableAt().toISOString();
    dto.latestAcceptableAt = entry.getLatestAcceptableAt().toISOString();
    dto.status = entry.getStatus();
    dto.notifiedAt = entry.getNotifiedAt()?.toISOString() ?? null;
    dto.fulfilledAt = entry.getFulfilledAt()?.toISOString() ?? null;
    dto.cancelledAt = entry.getCancelledAt()?.toISOString() ?? null;
    dto.createdAt = entry.getCreatedAt().toISOString();
    return dto;
  }
}
