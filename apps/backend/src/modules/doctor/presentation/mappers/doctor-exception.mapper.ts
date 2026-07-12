import { ConflictError, ValidationError } from '../../../../shared/errors/app-error.js';
import { AvailabilityWindowConflictError } from '../../domain/exceptions/availability-window-conflict.error.js';
import { DoctorDomainError } from '../../domain/exceptions/doctor-domain.error.js';

// Translates DoctorModule domain exceptions into the shared, HTTP-mappable
// AppError types the global AllExceptionsFilter already understands (mirrors
// Identity's identity-exception.mapper.ts pattern). AvailabilityWindowConflictError
// is checked first since it is a DoctorDomainError subtype -- an already-
// booked/already-held/not-held/expired-hold/concurrent-write state conflict
// is a 409, distinct from the generic 422 used for other domain violations
// in this module (e.g. invalid startTime/endTime).
export function mapDoctorError(error: unknown): unknown {
  if (error instanceof AvailabilityWindowConflictError) {
    return new ConflictError(error.message);
  }
  if (error instanceof DoctorDomainError) {
    return new ValidationError(error.message);
  }
  return error;
}
