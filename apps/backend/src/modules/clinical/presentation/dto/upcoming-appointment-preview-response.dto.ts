import type { Account } from '../../../identity/domain/entities/account.entity.js';
import type { DoctorProfile } from '../../../doctor/domain/entities/doctor-profile.entity.js';
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
  status!: 'upcoming';

  static fromDomain(
    appointment: Appointment,
    doctorProfile: DoctorProfile,
    doctorAccount: Account,
  ): UpcomingAppointmentPreviewResponseDto {
    const dto = new UpcomingAppointmentPreviewResponseDto();
    dto.id = appointment.getId();
    dto.scheduledAt = appointment.getScheduledAt().toISOString();
    dto.doctorName = doctorAccount.getUserProfile().getDisplayName().toString();
    dto.specialization = doctorProfile.getSpecialty();
    dto.status = 'upcoming';
    return dto;
  }
}
