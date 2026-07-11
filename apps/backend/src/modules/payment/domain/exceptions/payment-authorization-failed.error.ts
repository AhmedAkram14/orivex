import { PaymentDomainError } from './payment-domain.error.js';

// Distinct subtype (mirrors Identity's IdentityDomainError/AccountClosedError
// precedent for a genuinely distinct, HTTP-status-relevant outcome) --
// docs/12-openapi.md documents '402': "Payment failed" for initiateCharge,
// a different status than the generic 422 used for other domain
// violations in this module.
export class PaymentAuthorizationFailedError extends PaymentDomainError {}
