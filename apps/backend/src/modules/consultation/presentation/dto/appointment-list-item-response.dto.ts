import type { Account } from '../../../identity/domain/entities/account.entity.js';
import type { DoctorProfile } from '../../../doctor/domain/entities/doctor-profile.entity.js';
import type { Appointment } from '../../domain/entities/appointment.entity.js';
import type { AppointmentStatus } from '../../domain/enums/appointment-status.enum.js';
import type { ConsultationType } from '../../domain/enums/consultation-type.enum.js';

// The patient's own appointment list (GET /appointments/me). Composes
// DoctorModule's DoctorProfile + IdentityModule's Account for display name/
// specialty -- module-to-module calls through exported use cases only, same
// pattern BookAppointmentUseCase already established. Deliberately no
// `type`/`location` fields (in-person vs. video, physical address) -- no
// backend concept of either exists yet, only `consultationType` (free/paid).
export class AppointmentListItemResponseDto {
  id!: string;
  scheduledAt!: string;
  doctorName!: string;
  specialization!: string;
  status!: AppointmentStatus;
  consultationType!: ConsultationType;
  reasonForVisit!: string | null;

  static fromDomain(appointment: Appointment, doctorProfile: DoctorProfile, doctorAccount: Account): AppointmentListItemResponseDto {
    const dto = new AppointmentListItemResponseDto();
    dto.id = appointment.getId();
    dto.scheduledAt = appointment.getScheduledAt().toISOString();
    dto.doctorName = doctorAccount.getUserProfile().getDisplayName().toString();
    dto.specialization = doctorProfile.getSpecialty();
    dto.status = appointment.getStatus();
    dto.consultationType = appointment.getConsultationType();
    dto.reasonForVisit = appointment.getReasonForVisit() ?? null;
    return dto;
  }
}
