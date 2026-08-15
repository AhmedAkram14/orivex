import { apiFetch } from '@/shared/lib/api/client';
import { PATIENT_PATHS } from '@/features/patient/api/paths';
import type {
  ActivePrescriptionsResponse,
  AppointmentsResponse,
  BookAppointmentRequest,
  BookedAppointment,
  CancelledAppointment,
  HealthDashboardResponse,
  IdentityVerificationStatus,
  MedicalRecordsResponse,
  PatientDashboardSummary,
  PatientProfile,
  PatientProfileExistsResponse,
  PatientProfileUpdateRequest,
  PrescriptionsResponse,
  RescheduledAppointment,
  SubmitPatientVerificationRequest,
  UpcomingAppointmentsResponse,
} from '@/features/patient/api/types';
import type { VerificationCase } from '@/shared/verification/types';

/**
 * The only module that talks to `/patients/*`/`/appointments/*` — mirrors
 * `doctorApi`'s shape. Every endpoint here is a real backend endpoint;
 * `src/mocks/handlers/patient.ts` intercepts them only to keep the frontend
 * test suite deterministic, same precedent as `doctorApi`.
 */
export const patientApi = {
  getDashboardSummary: () => apiFetch<PatientDashboardSummary>({ path: PATIENT_PATHS.dashboardSummary }),

  getUpcomingAppointments: () =>
    apiFetch<UpcomingAppointmentsResponse>({ path: PATIENT_PATHS.upcomingAppointments }),

  getActivePrescriptions: () =>
    apiFetch<ActivePrescriptionsResponse>({ path: PATIENT_PATHS.activePrescriptions }),

  getProfile: () => apiFetch<PatientProfile>({ path: PATIENT_PATHS.profile }),

  updateProfile: (request: PatientProfileUpdateRequest) =>
    apiFetch<PatientProfile>({ method: 'PATCH', path: PATIENT_PATHS.profile, body: request }),

  getAppointments: () => apiFetch<AppointmentsResponse>({ path: PATIENT_PATHS.appointments }),

  // Onboarding Redesign integration-gap closure (2026-07-25): the real
  // production booking endpoint -- RequiresIdentityVerificationGuard-gated.
  bookAppointment: (request: BookAppointmentRequest) =>
    apiFetch<BookedAppointment>({ method: 'POST', path: PATIENT_PATHS.createAppointment, body: request }),

  // Patient-Facing Reschedule (Phase 3 Step 2): the real production
  // reschedule endpoint.
  rescheduleAppointment: (appointmentId: string, newAvailabilityWindowId: string) =>
    apiFetch<RescheduledAppointment>({
      method: 'PATCH',
      path: PATIENT_PATHS.appointment(appointmentId),
      body: { action: 'reschedule', newAvailabilityWindowId },
    }),

  // Demo Readiness P0: the real production cancel endpoint -- same
  // PATCH /appointments/:id the reschedule call above uses, different action
  // value. Valid from Requested/Confirmed status only (matches the backend
  // exactly); cancelling a paid Confirmed appointment triggers a real,
  // already-working, unconditional auto-refund entirely server-side
  // (AutoRefundOnAppointmentCancellationHandler in PaymentModule) -- this
  // call alone is enough to trigger it, nothing else for the frontend to do.
  cancelAppointment: (appointmentId: string) =>
    apiFetch<CancelledAppointment>({
      method: 'PATCH',
      path: PATIENT_PATHS.appointment(appointmentId),
      body: { action: 'cancel' },
    }),

  getMedicalRecords: () => apiFetch<MedicalRecordsResponse>({ path: PATIENT_PATHS.medicalRecords }),

  getPrescriptions: () => apiFetch<PrescriptionsResponse>({ path: PATIENT_PATHS.prescriptions }),

  getHealthDashboard: () => apiFetch<HealthDashboardResponse>({ path: PATIENT_PATHS.healthDashboard }),

  // Onboarding Redesign (2026-07-21 proposal, Stage O.5): the Choose-Your-
  // Journey gate's side-effect-free existence check -- never call
  // `getProfile()` for this purpose, it lazily creates a profile.
  checkProfileExists: () => apiFetch<PatientProfileExistsResponse>({ path: PATIENT_PATHS.exists }),

  // Onboarding Redesign (2026-07-21 proposal, Stage O.4/O.7).
  getMyIdentityVerificationStatus: () =>
    apiFetch<IdentityVerificationStatus>({ path: PATIENT_PATHS.identityVerificationStatus }),

  submitVerification: (patientProfileId: string, request: SubmitPatientVerificationRequest) =>
    apiFetch<VerificationCase>({ method: 'POST', path: PATIENT_PATHS.verifications(patientProfileId), body: request }),

  listVerifications: (patientProfileId: string) =>
    apiFetch<VerificationCase[]>({ path: PATIENT_PATHS.verifications(patientProfileId) }),
};
