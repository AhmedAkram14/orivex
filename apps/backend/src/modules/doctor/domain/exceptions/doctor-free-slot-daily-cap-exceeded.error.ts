import { DoctorDomainError } from './doctor-domain.error.js';

// Distinct subtype, sibling of AvailabilityWindowConflictError -- I8's
// doctor-configured daily free-slot cap (maxFreeSlotsPerDay,
// define-availability-window.use-case.ts) is a named "Business Rule Error"
// per docs/11-api-contracts.md §7, distinguishable by the presentation-layer
// mapper from the generic 422 used for other DoctorModule domain violations
// (e.g. invalid startTime/endTime).
export class DoctorFreeSlotDailyCapExceededError extends DoctorDomainError {}
