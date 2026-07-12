import { ConflictError, ValidationError } from '../../../../shared/errors/app-error.js';
import { AccountAlreadyExistsError } from '../../domain/exceptions/account-already-exists.error.js';
import { AccountClosedError } from '../../domain/exceptions/account-closed.error.js';
import { IdentityDomainError } from '../../domain/exceptions/identity-domain.error.js';

// Translates Identity domain exceptions into the shared, HTTP-mappable
// AppError types the global AllExceptionsFilter already understands.
// Use cases throw plain domain exceptions and stay framework-agnostic —
// this mapper is the one place, in the presentation layer, that decides how
// those exceptions surface over HTTP.
export function mapIdentityError(error: unknown): unknown {
  if (error instanceof AccountClosedError || error instanceof AccountAlreadyExistsError) {
    return new ConflictError(error.message);
  }

  if (error instanceof IdentityDomainError) {
    return new ValidationError(error.message);
  }

  return error;
}
