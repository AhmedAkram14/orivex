import { apiFetch } from '@/shared/lib/api/client';
import { REFERENCE_PATHS } from '@/features/reference/api/paths';
import type { Country, InsuranceProvider, MedicalSpecialty } from '@/features/reference/api/types';

/**
 * Thin typed wrapper over `apiFetch`, mirroring `doctorApi`/`patientApi`'s
 * shape. `listSpecialties` (Stage O.5's Browse Specialties screen),
 * `listCountries` (Stage O.6's shared Personal Info step's nationality
 * dropdown); `insurance-providers` lands with the Patient Medical Profile
 * editor (a later stage).
 */
export const referenceApi = {
  listSpecialties: () => apiFetch<MedicalSpecialty[]>({ path: REFERENCE_PATHS.specialties }),

  listCountries: () => apiFetch<Country[]>({ path: REFERENCE_PATHS.countries }),

  listInsuranceProviders: () => apiFetch<InsuranceProvider[]>({ path: REFERENCE_PATHS.insuranceProviders }),
};
