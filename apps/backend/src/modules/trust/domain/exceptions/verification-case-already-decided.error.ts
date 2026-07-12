import { TrustDomainError } from './trust-domain.error.js';

// Distinct subtype (mirrors Payment's PaymentAuthorizationFailedError
// precedent for a genuinely distinct, HTTP-status-relevant outcome) -- a
// VerificationCase that has already been decided is a state conflict, a
// 409, not the generic 422 used for other domain violations in this
// module (e.g. missing licenseNumber/documentAssetId).
export class VerificationCaseAlreadyDecidedError extends TrustDomainError {}
