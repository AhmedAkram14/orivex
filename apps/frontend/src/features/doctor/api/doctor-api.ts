import { apiFetch } from '@/shared/lib/api/client';
import { DOCTOR_PATHS } from '@/features/doctor/api/paths';
import type {
  DoctorDashboardSummary,
  DoctorProfile,
  DoctorProfileUpdateRequest,
  HospitalOption,
  QueueResponse,
  RegisterDoctorProfileRequest,
  SubmitVerificationRequest,
  UpcomingWorkResponse,
  VerificationCase,
} from '@/features/doctor/api/types';

/**
 * The only module that talks to `/doctor/*` and `/appointments/doctor/*` —
 * mirrors `notificationsApi`'s shape (Phase 6): thin typed wrappers over
 * `apiFetch`. `getDashboardSummary`/`getUpcomingWork`/`getProfile` are all
 * real backend endpoints now (ConsultationModule's AppointmentController /
 * DoctorModule's DoctorProfileController); `src/mocks/handlers/doctor.ts`
 * intercepts them only to keep the frontend test suite deterministic, same
 * precedent as `patientApi`. `getQueue`/`updateProfile`'s queue concept
 * remains MSW-only -- no live check-in/queue system exists on the backend yet.
 */
export const doctorApi = {
  getDashboardSummary: () => apiFetch<DoctorDashboardSummary>({ path: DOCTOR_PATHS.dashboardSummary }),

  getUpcomingWork: () => apiFetch<UpcomingWorkResponse>({ path: DOCTOR_PATHS.upcomingWork }),

  getProfile: () => apiFetch<DoctorProfile>({ path: DOCTOR_PATHS.profile }),

  updateProfile: (request: DoctorProfileUpdateRequest) =>
    apiFetch<DoctorProfile>({ method: 'PATCH', path: DOCTOR_PATHS.profile, body: request }),

  getQueue: () => apiFetch<QueueResponse>({ path: DOCTOR_PATHS.queue }),

  // Doctor Onboarding (Phase 4 continuation) -- real backend endpoints,
  // reused as-is (DoctorProfileController's POST /doctors,
  // DoctorVerificationController's /doctors/:id/verifications,
  // AdministrationModule's public /hospitals directory).
  registerProfile: (request: RegisterDoctorProfileRequest) =>
    apiFetch<DoctorProfile>({ method: 'POST', path: DOCTOR_PATHS.register, body: request }),

  listHospitals: () => apiFetch<HospitalOption[]>({ path: DOCTOR_PATHS.hospitals }),

  submitVerification: (doctorId: string, request: SubmitVerificationRequest) =>
    apiFetch<VerificationCase>({ method: 'POST', path: DOCTOR_PATHS.verifications(doctorId), body: request }),

  listVerifications: (doctorId: string) =>
    apiFetch<VerificationCase[]>({ path: DOCTOR_PATHS.verifications(doctorId) }),
};
