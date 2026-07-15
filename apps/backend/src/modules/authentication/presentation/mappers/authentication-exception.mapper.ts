import { ConflictError, ForbiddenError, UnauthorizedError, ValidationError } from '../../../../shared/errors/app-error.js';
import { AccountLockedError } from '../../domain/exceptions/account-locked.error.js';
import { AuthenticationDomainError } from '../../domain/exceptions/authentication-domain.error.js';
import { CredentialAlreadyExistsError } from '../../domain/exceptions/credential-already-exists.error.js';
import { EmailNotVerifiedError } from '../../domain/exceptions/email-not-verified.error.js';
import { InvalidCredentialsError } from '../../domain/exceptions/invalid-credentials.error.js';
import { TokenExpiredError } from '../../domain/exceptions/token-expired.error.js';
import { TokenInvalidError } from '../../domain/exceptions/token-invalid.error.js';
import { WeakPasswordError } from '../../domain/exceptions/weak-password.error.js';

// Translates Authentication domain exceptions into the shared, HTTP-mappable
// AppError types the global AllExceptionsFilter already understands. Use
// cases throw plain domain exceptions and stay framework-agnostic -- this
// mapper is the one place, in the presentation layer, that decides how those
// exceptions surface over HTTP. Codes match AUTH_ERROR_CODES in the
// frontend's features/auth/api/types.ts exactly, so the UI can branch on
// error.code without unusual HTTP-status-based branching.
export function mapAuthenticationError(error: unknown): unknown {
  if (error instanceof AccountLockedError) {
    return new UnauthorizedError(error.message, 'ACCOUNT_LOCKED');
  }

  if (error instanceof InvalidCredentialsError) {
    return new UnauthorizedError(error.message, 'INVALID_CREDENTIALS');
  }

  if (error instanceof EmailNotVerifiedError) {
    return new ForbiddenError(error.message, 'EMAIL_NOT_VERIFIED');
  }

  if (error instanceof TokenExpiredError) {
    return new UnauthorizedError(error.message, 'TOKEN_EXPIRED');
  }

  if (error instanceof TokenInvalidError) {
    return new UnauthorizedError(error.message, 'TOKEN_INVALID');
  }

  if (error instanceof CredentialAlreadyExistsError) {
    return new ConflictError(error.message);
  }

  if (error instanceof WeakPasswordError) {
    return new ValidationError(error.message);
  }

  if (error instanceof AuthenticationDomainError) {
    return new ValidationError(error.message);
  }

  return error;
}
