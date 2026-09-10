import { ConsultationDomainError } from './consultation-domain.error.js';

// Distinct subtype (mirrors DoctorModule's AvailabilityWindowConflictError
// precedent) -- I8's patient monthly free-consultation cap
// (MAX_FREE_CONSULTATIONS_PER_MONTH, book-appointment.use-case.ts) is a
// named "Business Rule Error" per docs/11-api-contracts.md §7
// (FREE_TIER_CAP_EXCEEDED, 422), distinguishable by the presentation-layer
// mapper from every other generic ConsultationDomainError.
export class FreeTierMonthlyCapExceededError extends ConsultationDomainError {}
