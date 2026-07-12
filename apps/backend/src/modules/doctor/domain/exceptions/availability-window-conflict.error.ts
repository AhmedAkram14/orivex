import { DoctorDomainError } from './doctor-domain.error.js';

// Distinct subtype (mirrors Payment's PaymentAuthorizationFailedError /
// AIModule's AISuggestionAlreadyDecidedError precedent for a genuinely
// distinct, HTTP-status-relevant outcome) -- an AvailabilityWindow state
// conflict (already booked, already held, not currently held, hold
// expired, or a concurrent optimistic-lock write) means the request
// itself was well-formed but the resource's current state prevents it,
// which is a 409 Conflict, not the generic 422 used for other domain
// violations in this module (e.g. invalid startTime/endTime).
export class AvailabilityWindowConflictError extends DoctorDomainError {}
