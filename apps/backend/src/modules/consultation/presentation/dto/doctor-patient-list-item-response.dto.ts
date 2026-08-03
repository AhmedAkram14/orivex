import type { AppointmentStatus } from '../../domain/enums/appointment-status.enum.js';

// Backs GET /appointments/doctor/patients, matching the frontend's
// `DoctorPatientListItem` shape (`apps/frontend/src/features/doctor/api/types.ts`)
// exactly. One row per distinct patient the doctor has ever had an
// appointment with -- visitCount and lastVisit* are computed from every
// real appointment on record (see DoctorAppointmentsController's
// toPatientListItems), never a fabricated figure.
//
// Patients page redesign: email/phoneNumber/dateOfBirth/gender come straight
// off the patient's own Account (already fetched in toPatientListItems for
// patientName) -- no new query. nextAppointmentAt is the soonest
// Requested/Confirmed/Rescheduled appointment still in the future, or null
// when there isn't one -- never a fabricated "next visit". There is
// deliberately no "last diagnosis" field: that lives in ClinicalModule,
// which already imports ConsultationModule (Clean Architecture's one-way
// dependency rule), so ConsultationModule cannot import it back without a
// circular dependency -- omitted rather than forced.
export class DoctorPatientListItemResponseDto {
  patientProfileId!: string;
  patientName!: string;
  email!: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  visitCount!: number;
  lastVisitAt!: string;
  lastVisitStatus!: AppointmentStatus;
  nextAppointmentAt?: string;
}
