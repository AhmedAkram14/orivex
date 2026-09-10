import { ConsultationDomainError } from './consultation-domain.error.js';

// Distinct subtype, sibling of FreeTierMonthlyCapExceededError -- I8's
// no-show-strike consequence (MAX_NO_SHOWS_BEFORE_FREE_TIER_BLOCKED,
// book-appointment.use-case.ts) is a different rule from the monthly cap
// (it never expires/resets automatically -- a real, disclosed limitation),
// so it gets its own named code (NO_SHOW_BOOKING_RESTRICTED) rather than
// reusing FREE_TIER_CAP_EXCEEDED, following docs/11-api-contracts.md §7's
// same "Business Rule Error" (422) category and naming convention.
export class NoShowBookingRestrictedError extends ConsultationDomainError {}
