import type { AppointmentStatus } from '../../domain/enums/appointment-status.enum.js';
import type { AppointmentType } from '../../domain/enums/appointment-type.enum.js';

// Backs GET /appointments/doctor/schedule -- the Doctor Schedule redesign's
// weekly calendar grid, which needs a real end time and visit-type category
// per appointment to position and size blocks (neither `title` nor
// `description` are appropriate here -- this DTO exposes the patient's own
// identity fields directly, same precedent as DoctorPatientListItemResponseDto,
// since a doctor legitimately sees their own patients' names).
// endTime/appointmentType are optional -- undefined for appointments booked
// before these fields existed, never fabricated.
export class DoctorScheduleAppointmentResponseDto {
  id!: string;
  patientId!: string;
  patientName!: string;
  avatarUrl?: string;
  scheduledAt!: string;
  endTime?: string;
  appointmentType?: AppointmentType;
  status!: AppointmentStatus;
  reasonForVisit?: string;
}
