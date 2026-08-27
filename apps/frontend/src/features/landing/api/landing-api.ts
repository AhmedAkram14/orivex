import { apiFetch } from '@/shared/lib/api/client';
import { LANDING_PATHS } from '@/features/landing/api/paths';
import type { PublicDoctorListResult, PublicPatient, PublicSpecialty } from '@/features/landing/api/types';

/**
 * The only module that talks to `/public/*` — genuinely anonymous reads,
 * reachable with no session at all (unlike every other directory-style
 * endpoint in the app). Backs the public landing page only. Deliberately
 * stays minimal forever (Public/Protected Information Architecture split):
 * clinical patient data lives behind `doctorApi`'s `getPatientChart*`
 * methods (`/doctor/patients/:id/*`), never here.
 */
export const landingApi = {
  getSpecialties: () => apiFetch<PublicSpecialty[]>({ path: LANDING_PATHS.specialties }),

  getDoctors: (params: { specialtyId?: string; page?: number; limit?: number } = {}) =>
    apiFetch<PublicDoctorListResult>({ path: LANDING_PATHS.doctors(params) }),

  getPatient: (patientProfileId: string) => apiFetch<PublicPatient>({ path: LANDING_PATHS.patient(patientProfileId) }),
};
