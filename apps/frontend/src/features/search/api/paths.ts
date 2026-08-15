export const SEARCH_PATHS = {
  // The real backend route -- no module prefix (verified against the
  // finalized Phase 2 contract), matching `DOCTOR_PATHS`/`PATIENT_PATHS`'s
  // own "path is exactly the controller route" convention.
  search: '/search',
} as const;
