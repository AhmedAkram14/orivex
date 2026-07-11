import { ValidationError } from '../../../../shared/errors/app-error.js';
import { TrustDomainError } from '../../domain/exceptions/trust-domain.error.js';

// Translates TrustModule domain exceptions into the shared, HTTP-mappable
// AppError types the global AllExceptionsFilter already understands (mirrors
// Identity/Doctor/Asset's exception-mapper pattern).
export function mapTrustError(error: unknown): unknown {
  if (error instanceof TrustDomainError) {
    return new ValidationError(error.message);
  }
  return error;
}
