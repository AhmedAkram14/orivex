// Onboarding Redesign (2026-07-21 proposal, Stage O.1/O.5): the real backend
// routes (ReferenceModule's ReferenceDirectoryController) -- a read-only
// directory any authenticated account can browse.
export const REFERENCE_PATHS = {
  specialties: '/reference/specialties',
  countries: '/reference/countries',
  insuranceProviders: '/reference/insurance-providers',
} as const;
