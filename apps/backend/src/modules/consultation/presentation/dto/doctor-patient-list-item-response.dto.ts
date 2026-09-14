import type { AppointmentStatus } from '../../domain/enums/appointment-status.enum.js';

// Backs GET /appointments/doctor/patients, matching the frontend's
// `DoctorPatientListItem` shape (`apps/frontend/src/features/doctor/api/types.ts`)
// exactly. One row per distinct patient the doctor has ever had an
// appointment with.
//
// visitCount/lastVisitAt/lastVisitStatus are Completed-appointments only
// (see DoctorAppointmentsController.toPatientListItems) -- a Cancelled or
// still-pending appointment is not a visit that happened, so it must never
// inflate visitCount or be reported as the patient's "last visit". This
// mirrors the doctor-facing Patient Chart's own definition exactly
// (DoctorPatientChartController's appointments endpoint, filtered
// client-side to status === 'completed' for the same "last visit" concept)
// -- before this fix the two disagreed because this endpoint took the most
// recently *scheduled* appointment regardless of status. lastVisitAt/
// lastVisitStatus are both absent (never a fabricated date) when the
// patient has no completed appointment yet.
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
  lastVisitAt?: string;
  lastVisitStatus?: AppointmentStatus;
  nextAppointmentAt?: string;
  // Real -- reuses ClinicalModule's own FollowUpRecommendation (via
  // GetFollowUpRecommendationForSessionUseCase), never a guessed status.
  // Only meaningful when nextAppointmentAt is absent and lastVisitAt is
  // present; see DoctorAppointmentsController.toPatientListItems.
  hasFollowUpRecommendation!: boolean;
}
