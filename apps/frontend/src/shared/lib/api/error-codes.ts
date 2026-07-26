/**
 * Onboarding Redesign (2026-07-21 proposal, Stage O.4/O.7): the one
 * `ApiError.code` four otherwise-unrelated features (scheduling,
 * telemedicine, payment, patient/media) all need to branch on -- unlike
 * `AUTH_ERROR_CODES` (feature-scoped, only ever consumed inside
 * `features/auth`), this has no single natural feature owner, so it lives
 * here instead of being duplicated per call site.
 */
export const SHARED_ERROR_CODES = {
  identityVerificationRequired: 'IDENTITY_VERIFICATION_REQUIRED',
} as const;
