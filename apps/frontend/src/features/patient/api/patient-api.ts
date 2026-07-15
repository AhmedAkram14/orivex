import { apiFetch } from '@/shared/lib/api/client';
import { PATIENT_PATHS } from '@/features/patient/api/paths';
import type {
  ActivePrescriptionsResponse,
  AppointmentsResponse,
  PatientDashboardSummary,
  PatientProfile,
  PatientProfileUpdateRequest,
  UpcomingAppointmentsResponse,
} from '@/features/patient/api/types';

/**
 * The only module that talks to `/patient/*` — mirrors `doctorApi`'s shape.
 * Backed by an MSW mock today (`src/mocks/handlers/patient.ts`); this phase
 * builds the Patient Portal architecture only, not real Scheduling/Clinical
 * business logic, so every endpoint reflects an honest "nothing yet"
 * reality rather than fabricated clinical data.
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
};
