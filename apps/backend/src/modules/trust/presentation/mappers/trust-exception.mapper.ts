import { ConflictError, ValidationError } from '../../../../shared/errors/app-error.js';
import { TrustDomainError } from '../../domain/exceptions/trust-domain.error.js';
import { VerificationCaseAlreadyDecidedError } from '../../domain/exceptions/verification-case-already-decided.error.js';

// Translates TrustModule domain exceptions into the shared, HTTP-mappable
// AppError types the global AllExceptionsFilter already understands (mirrors
// Identity/Doctor/Asset's exception-mapper pattern). VerificationCaseAlreadyDecidedError
// is checked first since it is a TrustDomainError subtype -- a VerificationCase
// state conflict is a 409, distinct from the generic 422 used for other
// domain violations in this module.
export function mapTrustError(error: unknown): unknown {
  if (error instanceof VerificationCaseAlreadyDecidedError) {
    return new ConflictError(error.message);
  }
  if (error instanceof TrustDomainError) {
    return new ValidationError(error.message);
  }
  return error;
}
