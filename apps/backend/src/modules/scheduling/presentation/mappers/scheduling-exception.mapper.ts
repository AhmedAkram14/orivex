import { ValidationError } from '../../../../shared/errors/app-error.js';
import { SchedulingDomainError } from '../../domain/exceptions/scheduling-domain.error.js';

// Translates SchedulingModule domain exceptions into the shared,
// HTTP-mappable AppError types the global AllExceptionsFilter already
// understands (mirrors every other module's own *-exception.mapper.ts
// pattern, e.g. doctor-exception.mapper.ts). This module has only one
// domain exception type, so it's a single, generic 422.
export function mapSchedulingError(error: unknown): unknown {
  if (error instanceof SchedulingDomainError) {
    return new ValidationError(error.message);
  }
  return error;
}
