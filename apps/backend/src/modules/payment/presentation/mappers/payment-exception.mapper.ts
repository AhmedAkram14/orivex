import { ConflictError, PaymentRequiredError, ValidationError } from '../../../../shared/errors/app-error.js';
import { IdempotencyKeyConflictError } from '../../domain/exceptions/idempotency-key-conflict.error.js';
import { PaymentAuthorizationFailedError } from '../../domain/exceptions/payment-authorization-failed.error.js';
import { PaymentDomainError } from '../../domain/exceptions/payment-domain.error.js';

// Translates this module's domain exceptions into the shared, HTTP-mappable
// AppError types (mirrors Identity/Doctor/Asset/Trust/Consultation's
// exception-mapper pattern). Both subtypes are checked before the generic
// PaymentDomainError case: PaymentAuthorizationFailedError maps to '402'
// (docs/12-openapi.md's documented payment-declined status, distinct from
// the generic 422 used elsewhere in this module); IdempotencyKeyConflictError
// maps to '409' (a client reused a key with a different request payload).
export function mapPaymentError(error: unknown): unknown {
  if (error instanceof PaymentAuthorizationFailedError) {
    return new PaymentRequiredError(error.message);
  }
  if (error instanceof IdempotencyKeyConflictError) {
    return new ConflictError(error.message);
  }
  if (error instanceof PaymentDomainError) {
    return new ValidationError(error.message);
  }
  return error;
}
