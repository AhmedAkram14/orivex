import type { Account } from '../../../identity/domain/entities/account.entity.js';
import type { Appointment } from '../../../consultation/domain/entities/appointment.entity.js';

// The Patient Portal dashboard's "next few appointments" preview
// (GET /patients/me/upcoming-appointments) -- a lighter shape than
// ConsultationModule's own AppointmentListItemResponseDto (no
// consultationType/reasonForVisit, and status is always 'upcoming' since
// only non-terminal appointments are ever returned here). `status` is a
// fixed literal, not the full AppointmentStatus enum -- there is no live
// "in-progress" detection wired for this lightweight preview yet (that would
// require checking each appointment's ConsultationSession state).
export class UpcomingAppointmentPreviewResponseDto {
  id!: string;
  scheduledAt!: string;
  doctorName!: string;
  specialization!: string;
  /** Localization fix: the Arabic specialty name, null until an admin has translated it -- the frontend picks whichever matches the caller's locale. */
  specializationAr!: string | null;
  status!: 'upcoming';

  static fromDomain(
    appointment: Appointment,
    doctorAccount: Account,
    specialization: string,
    specializationAr: string | null = null,
  ): UpcomingAppointmentPreviewResponseDto {
    const dto = new UpcomingAppointmentPreviewResponseDto();
    dto.id = appointment.getId();
    dto.scheduledAt = appointment.getScheduledAt().toISOString();
    dto.doctorName = doctorAccount.getUserProfile().getDisplayName().toString();
    dto.specialization = specialization;
    dto.specializationAr = specializationAr;
    dto.status = 'upcoming';
    return dto;
  }
}
