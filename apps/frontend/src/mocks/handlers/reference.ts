import { http, HttpResponse } from 'msw';
import { env } from '@/shared/lib/env';
import { REFERENCE_PATHS } from '@/features/reference/api/paths';
import { listCountries, listInsuranceProviders, listSpecialties } from '@/mocks/reference-store';

const base = () => env.apiBaseUrl;

// GET /reference/specialties, /reference/countries, /reference/insurance-
// providers are real backend endpoints (ReferenceModule's
// ReferenceDirectoryController) -- these handlers exist purely to keep the
// frontend test suite deterministic, matching `doctor.ts`/`patient.ts`.
export const referenceHandlers = [
  http.get(`${base()}${REFERENCE_PATHS.specialties}`, () => HttpResponse.json({ data: listSpecialties() })),

  http.get(`${base()}${REFERENCE_PATHS.countries}`, () => HttpResponse.json({ data: listCountries() })),

  http.get(`${base()}${REFERENCE_PATHS.insuranceProviders}`, () => HttpResponse.json({ data: listInsuranceProviders() })),
];
