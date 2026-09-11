import { ValidationError } from '../../../../shared/errors/app-error.js';
import { WaitlistDomainError } from '../../domain/exceptions/waitlist-domain.error.js';

// Translates WaitlistModule domain exceptions into the shared, HTTP-mappable
// AppError types the global AllExceptionsFilter already understands
// (mirrors every other module's own exception-mapper pattern).
export function mapWaitlistError(error: unknown): unknown {
  if (error instanceof WaitlistDomainError) {
    return new ValidationError(error.message);
  }
  return error;
}
