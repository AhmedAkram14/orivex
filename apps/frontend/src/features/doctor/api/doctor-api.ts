import { apiFetch } from '@/shared/lib/api/client';
import { DOCTOR_PATHS } from '@/features/doctor/api/paths';
import type {
  DoctorDashboardSummary,
  DoctorProfile,
  DoctorProfileUpdateRequest,
  UpcomingWorkResponse,
} from '@/features/doctor/api/types';

/**
 * The only module that talks to `/doctor/*` — mirrors `notificationsApi`'s
 * shape (Phase 6): thin typed wrappers over `apiFetch`. Backed by an MSW
 * mock today (`src/mocks/handlers/doctor.ts`); this phase builds the
 * Doctor Workspace architecture only, not real Consultation/Appointment
 * business logic, so both endpoints reflect an honest "nothing scheduled
 * yet" reality rather than fabricated clinical data.
 */
export const doctorApi = {
  getDashboardSummary: () => apiFetch<DoctorDashboardSummary>({ path: DOCTOR_PATHS.dashboardSummary }),

  getUpcomingWork: () => apiFetch<UpcomingWorkResponse>({ path: DOCTOR_PATHS.upcomingWork }),

  getProfile: () => apiFetch<DoctorProfile>({ path: DOCTOR_PATHS.profile }),

  updateProfile: (request: DoctorProfileUpdateRequest) =>
    apiFetch<DoctorProfile>({ method: 'PATCH', path: DOCTOR_PATHS.profile, body: request }),
};
