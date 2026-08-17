import type { Country, InsuranceProvider, MedicalSpecialty } from '@/features/reference/api/types';
import { DEMO_SEED_ENABLED } from '@/mocks/demo-mode';

/**
 * Demo Data & Profile Avatar Pass: the six specialties `demo-people.ts`
 * references that weren't already seeded below. Additive only -- the three
 * original entries keep their exact ids (`specialty-cardiology` and friends
 * are referenced by `doctor-store.ts`'s legacy profile and by tests), so
 * nothing that already pointed at them breaks.
 */
function seedDemoSpecialties(): MedicalSpecialty[] {
  const timestamps = { isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };
  return [
    { id: 'specialty-psychiatry', name: 'Psychiatry', nameAr: 'الطب النفسي', ...timestamps },
    { id: 'specialty-internal-medicine', name: 'Internal Medicine', nameAr: 'الباطنة العامة', ...timestamps },
    { id: 'specialty-orthopedics', name: 'Orthopedics', nameAr: 'جراحة العظام', ...timestamps },
    { id: 'specialty-dentistry', name: 'Dentistry', nameAr: 'طب الأسنان', ...timestamps },
    { id: 'specialty-ent', name: 'Otolaryngology (ENT)', nameAr: 'الأنف والأذن والحنجرة', ...timestamps },
    { id: 'specialty-ophthalmology', name: 'Ophthalmology', nameAr: 'طب العيون', ...timestamps },
  ];
}

/**
 * In-memory mock "backend" state for `/reference/*` -- mirrors
 * `doctor-store.ts`'s pattern. `GET /reference/specialties` is a real
 * backend endpoint (ReferenceModule's ReferenceDirectoryController), so
 * this mock exists purely to keep the frontend test suite deterministic.
 */
function seedSpecialties(): MedicalSpecialty[] {
  const original: MedicalSpecialty[] = [
    { id: 'specialty-cardiology', name: 'Cardiology', nameAr: 'أمراض القلب', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'specialty-dermatology', name: 'Dermatology', nameAr: 'الأمراض الجلدية', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'specialty-pediatrics', name: 'Pediatrics', nameAr: 'طب الأطفال', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  ];
  if (!DEMO_SEED_ENABLED) return original;
  const existingNames = new Set(original.map((specialty) => specialty.name));
  return [...original, ...seedDemoSpecialties().filter((specialty) => !existingNames.has(specialty.name))];
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

/** Demo Data & Profile Avatar Pass: `demo-people.ts` carries specialty *names*; every store keys off the specialty *id*. */
export function findSpecialtyIdByName(name: string): string | undefined {
  return specialties.find((specialty) => specialty.name === name)?.id;
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
