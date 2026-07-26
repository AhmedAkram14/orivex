// Onboarding Redesign (2026-07-21 proposal, Stage O.2): an explicit domain
// concept, not merely a technical discriminator -- every VerificationCase
// states which kind of subject it verifies, queryable and persisted
// directly. Behavior differences between subject types are expressed via
// each type's own VerificationSubjectDetails value object (polymorphism),
// never via branching on this enum inside the aggregate's own methods.
export enum VerificationSubjectType {
  Doctor = 'doctor',
  Patient = 'patient',
}
