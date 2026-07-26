// Onboarding Redesign (2026-07-21 proposal, §6): plain enum, not a reference
// table -- fixed, small, universally understood, never needs runtime
// extension (same rationale already applied to AccountRole/Language).
export enum Gender {
  Male = 'male',
  Female = 'female',
  Other = 'other',
}
