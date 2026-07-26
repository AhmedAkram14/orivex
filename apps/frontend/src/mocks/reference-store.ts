import type { Country, InsuranceProvider, MedicalSpecialty } from '@/features/reference/api/types';

/**
 * In-memory mock "backend" state for `/reference/*` -- mirrors
 * `doctor-store.ts`'s pattern. `GET /reference/specialties` is a real
 * backend endpoint (ReferenceModule's ReferenceDirectoryController), so
 * this mock exists purely to keep the frontend test suite deterministic.
 */
function seedSpecialties(): MedicalSpecialty[] {
  return [
    { id: 'specialty-cardiology', name: 'Cardiology', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'specialty-dermatology', name: 'Dermatology', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'specialty-pediatrics', name: 'Pediatrics', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  ];
}

// Onboarding Redesign (2026-07-21 proposal, Stage O.6): the shared Personal
// Info step's nationality dropdown -- a nationality is a country reference,
// no separate table (§4).
function seedCountries(): Country[] {
  return [
    { id: 'country-eg', name: 'Egypt', iso2Code: 'EG', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'country-sa', name: 'Saudi Arabia', iso2Code: 'SA', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'country-ae', name: 'United Arab Emirates', iso2Code: 'AE', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  ];
}

// Onboarding Redesign (2026-07-21 proposal, Stage O.7): the Patient Medical
// Profile editor's insurance provider dropdown.
function seedInsuranceProviders(): InsuranceProvider[] {
  return [
    { id: 'insurance-allianz', name: 'Allianz Egypt', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'insurance-axa', name: 'AXA Egypt', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  ];
}

let specialties: MedicalSpecialty[] = seedSpecialties();
let countries: Country[] = seedCountries();
let insuranceProviders: InsuranceProvider[] = seedInsuranceProviders();

export function listSpecialties(): MedicalSpecialty[] {
  return specialties;
}

export function listCountries(): Country[] {
  return countries;
}

export function listInsuranceProviders(): InsuranceProvider[] {
  return insuranceProviders;
}

/** Test-only: restores the seed state. Never called from application code. */
export function resetReferenceStore(): void {
  specialties = seedSpecialties();
  countries = seedCountries();
  insuranceProviders = seedInsuranceProviders();
}
