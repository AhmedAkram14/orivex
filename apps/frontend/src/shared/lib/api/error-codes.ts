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
  // I8 -- Free-tier abuse controls (docs/11-api-contracts.md §7's named
  // Business Rule Error codes -- FREE_TIER_CAP_EXCEEDED is documented
  // there exactly; the other two extend the same naming convention).
  freeTierMonthlyCapExceeded: 'FREE_TIER_CAP_EXCEEDED',
  noShowBookingRestricted: 'NO_SHOW_BOOKING_RESTRICTED',
  doctorFreeTierDailyCapExceeded: 'DOCTOR_FREE_TIER_DAILY_CAP_EXCEEDED',
} as const;
