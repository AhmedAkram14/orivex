import { ConflictError, ValidationError } from '../../../../shared/errors/app-error.js';
import { AdministrationDomainError } from '../../domain/exceptions/administration-domain.error.js';
import { DepartmentAlreadyExistsError } from '../../domain/exceptions/department-already-exists.error.js';

// Translates AdministrationModule domain exceptions into the shared,
// HTTP-mappable AppError types the global AllExceptionsFilter already
// understands (mirrors Identity's/Doctor's own exception-mapper pattern).
// NotFoundError/AccountClosedError-shaped failures from delegated calls
// into IdentityModule/TrustModule pass through unchanged -- this mapper only
// ever needs to translate errors AdministrationModule itself can raise.
export function mapAdministrationError(error: unknown): unknown {
  if (error instanceof DepartmentAlreadyExistsError) {
    return new ConflictError(error.message);
  }
  if (error instanceof AdministrationDomainError) {
    return new ValidationError(error.message);
  }
  return error;
}
