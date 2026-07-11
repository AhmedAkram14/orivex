import { AIDomainError } from './ai-domain.error.js';

// Distinct subtype (mirrors Payment's PaymentAuthorizationFailedError
// precedent for a genuinely distinct, HTTP-status-relevant outcome) --
// docs/12-openapi.md's recordDoctorDecision documents "Settable exactly
// once; a second call returns 409", a different status than the generic
// 422 used for other domain violations in this module.
export class AISuggestionAlreadyDecidedError extends AIDomainError {}
