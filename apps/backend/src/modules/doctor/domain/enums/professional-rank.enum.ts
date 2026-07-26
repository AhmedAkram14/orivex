// Onboarding Redesign (2026-07-21 proposal, §6/Stage O.3): plain enum, not a
// reference table -- fixed, small (5 values), globally understood clinical
// taxonomy that doesn't vary by market, same rationale already applied to
// AccountRole/VerificationStatus.
export enum ProfessionalRank {
  Resident = 'resident',
  Registrar = 'registrar',
  Specialist = 'specialist',
  Consultant = 'consultant',
  Professor = 'professor',
}
