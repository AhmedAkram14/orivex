import { PaymentRequiredError, ValidationError } from '../../../../shared/errors/app-error.js';
import { PaymentAuthorizationFailedError } from '../../domain/exceptions/payment-authorization-failed.error.js';
import { PaymentDomainError } from '../../domain/exceptions/payment-domain.error.js';

// Translates this module's domain exceptions into the shared, HTTP-mappable
// AppError types (mirrors Identity/Doctor/Asset/Trust/Consultation's
// exception-mapper pattern). PaymentAuthorizationFailedError is checked
// first since it is a PaymentDomainError subtype -- docs/12-openapi.md
// documents '402' for initiateCharge's payment-declined case specifically,
// distinct from the generic 422 used for other domain violations here.
export function mapPaymentError(error: unknown): unknown {
  if (error instanceof PaymentAuthorizationFailedError) {
    return new PaymentRequiredError(error.message);
  }
  if (error instanceof PaymentDomainError) {
    return new ValidationError(error.message);
  }
  return error;
}
