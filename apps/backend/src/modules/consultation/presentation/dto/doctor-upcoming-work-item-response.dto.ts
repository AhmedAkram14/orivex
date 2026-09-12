import type { AppointmentType } from '../../domain/enums/appointment-type.enum.js';

// Backs GET /appointments/doctor/upcoming-work, matching the frontend's
// `UpcomingWorkItem` shape (`apps/frontend/src/features/doctor/api/types.ts`)
// exactly. `title` is the patient's own display name -- a doctor legitimately
// sees their own patients' names (unlike a patient seeing another patient's
// name). `description` is the appointment's reasonForVisit, never fabricated.
// endTime/appointmentType (Doctor Schedule redesign) are additive and
// optional -- undefined for appointments booked before these fields existed.
export class DoctorUpcomingWorkItemResponseDto {
  id!: string;
  scheduledAt!: string;
  endTime?: string;
  title!: string;
  description?: string;
  appointmentType?: AppointmentType;
  status!: 'upcoming' | 'in-progress' | 'completed' | 'cancelled';
}
