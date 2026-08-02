import { apiFetch } from '@/shared/lib/api/client';
import { DOCTOR_PATHS } from '@/features/doctor/api/paths';
import type {
  ApprovedAppointment,
  DepartmentOption,
  DoctorDashboardSummary,
  DoctorDirectoryResult,
  DoctorPatientListItem,
  DoctorProfile,
  DoctorProfileUpdateRequest,
  DoctorReportsSummary,
  HospitalOption,
  ListDoctorDirectoryParams,
  PendingApprovalAppointment,
  QueueResponse,
  RegisterDoctorProfileRequest,
  SubmitVerificationRequest,
  UpcomingWorkResponse,
  VerificationCase,
} from '@/features/doctor/api/types';

function buildListDoctorsQuery(params: ListDoctorDirectoryParams): string {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.specialty) query.set('specialty', params.specialty);
  if (params.specialtyId) query.set('specialtyId', params.specialtyId);
  if (params.hospitalId) query.set('hospitalId', params.hospitalId);
  const qs = query.toString();
  return qs ? `${DOCTOR_PATHS.list}?${qs}` : DOCTOR_PATHS.list;
}

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

  // Doctor-approval-workflow fix: every booking (Free or Paid) now lands
  // Requested and waits here until the doctor approves it.
  getPendingApproval: () => apiFetch<PendingApprovalAppointment[]>({ path: DOCTOR_PATHS.pendingApproval }),

  approveAppointment: (appointmentId: string) =>
    apiFetch<ApprovedAppointment>({ method: 'PATCH', path: DOCTOR_PATHS.approveAppointment(appointmentId) }),

  // Doctor Workspace dashboard redesign's Patients/Reports pages.
  getPatients: () => apiFetch<DoctorPatientListItem[]>({ path: DOCTOR_PATHS.patients }),

  getReportsSummary: () => apiFetch<DoctorReportsSummary>({ path: DOCTOR_PATHS.reportsSummary }),

  // Doctor Onboarding (Phase 4 continuation) -- real backend endpoints,
  // reused as-is (DoctorProfileController's POST /doctors,
  // DoctorVerificationController's /doctors/:id/verifications,
  // AdministrationModule's public /hospitals directory).
  registerProfile: (request: RegisterDoctorProfileRequest) =>
    apiFetch<DoctorProfile>({ method: 'POST', path: DOCTOR_PATHS.register, body: request }),

  listHospitals: () => apiFetch<HospitalOption[]>({ path: DOCTOR_PATHS.hospitals }),

  // Onboarding Redesign (2026-07-21 proposal, Stage O.6).
  listDepartments: (hospitalId: string) =>
    apiFetch<DepartmentOption[]>({ path: DOCTOR_PATHS.departmentsByHospital(hospitalId) }),

  submitVerification: (doctorId: string, request: SubmitVerificationRequest) =>
    apiFetch<VerificationCase>({ method: 'POST', path: DOCTOR_PATHS.verifications(doctorId), body: request }),

  listVerifications: (doctorId: string) =>
    apiFetch<VerificationCase[]>({ path: DOCTOR_PATHS.verifications(doctorId) }),

  // Onboarding Redesign (2026-07-21 proposal, Stage O.5): the Patient
  // Dashboard's Browse/Search Doctors screen + patient-facing profile view.
  listDoctors: (params: ListDoctorDirectoryParams = {}) =>
    apiFetch<DoctorDirectoryResult>({ path: buildListDoctorsQuery(params) }),

  getById: (doctorProfileId: string) => apiFetch<DoctorProfile>({ path: DOCTOR_PATHS.byId(doctorProfileId) }),

  getByAccountId: (accountId: string) => apiFetch<DoctorProfile>({ path: DOCTOR_PATHS.byAccountId(accountId) }),
};
