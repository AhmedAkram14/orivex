import { ValidationError } from '../../../../shared/errors/app-error.js';
import { MessagingDomainError } from '../../domain/exceptions/messaging-domain.error.js';

// Translates MessagingModule domain exceptions into the shared, HTTP-mappable
// AppError types the global AllExceptionsFilter already understands (mirrors
// every other module's own exception-mapper pattern).
export function mapMessagingError(error: unknown): unknown {
  if (error instanceof MessagingDomainError) {
    return new ValidationError(error.message);
  }
  return error;
}
