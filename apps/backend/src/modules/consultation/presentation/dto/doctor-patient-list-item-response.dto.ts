import type { AppointmentStatus } from '../../domain/enums/appointment-status.enum.js';

// Backs GET /appointments/doctor/patients, matching the frontend's
// `DoctorPatientListItem` shape (`apps/frontend/src/features/doctor/api/types.ts`)
// exactly. One row per distinct patient the doctor has ever had an
// appointment with -- visitCount and lastVisit* are computed from every
// real appointment on record (see DoctorAppointmentsController's
// toPatientListItems), never a fabricated figure.
export class DoctorPatientListItemResponseDto {
  patientProfileId!: string;
  patientName!: string;
  visitCount!: number;
  lastVisitAt!: string;
  lastVisitStatus!: AppointmentStatus;
}
