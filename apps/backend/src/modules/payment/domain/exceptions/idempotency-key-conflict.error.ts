import { PaymentDomainError } from './payment-domain.error.js';

// Raised when a caller reuses an idempotency key with a different
// consultationSessionId/amount/currency/paymentMethod than the original
// request that key was issued for. A genuine retry always resubmits the
// exact same payload; a mismatch means the key was reused incorrectly (a
// client bug), never a legitimate retry -- distinct from
// PaymentAuthorizationFailedError (402) since this is a client-request
// error (409), not a declined charge.
export class IdempotencyKeyConflictError extends PaymentDomainError {}
