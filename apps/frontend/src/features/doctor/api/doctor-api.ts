import { apiFetch } from '@/shared/lib/api/client';
import { DOCTOR_PATHS } from '@/features/doctor/api/paths';
import type {
  DoctorDashboardSummary,
  DoctorProfile,
  DoctorProfileUpdateRequest,
  QueueResponse,
  UpcomingWorkResponse,
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
};
