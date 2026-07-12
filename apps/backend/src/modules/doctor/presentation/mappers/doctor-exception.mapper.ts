import { ConflictError, ValidationError } from '../../../../shared/errors/app-error.js';
import { AvailabilityWindowConflictError } from '../../domain/exceptions/availability-window-conflict.error.js';
import { DoctorDomainError } from '../../domain/exceptions/doctor-domain.error.js';
import { DoctorProfileAlreadyExistsError } from '../../domain/exceptions/doctor-profile-already-exists.error.js';

// Translates DoctorModule domain exceptions into the shared, HTTP-mappable
// AppError types the global AllExceptionsFilter already understands (mirrors
// Identity's identity-exception.mapper.ts pattern). AvailabilityWindowConflictError
// and DoctorProfileAlreadyExistsError are checked first since both are
// DoctorDomainError subtypes -- state conflicts (already-booked/already-
// held/not-held/expired-hold/concurrent-write, or a raced duplicate
// registration) are a 409, distinct from the generic 422 used for other
// domain violations in this module (e.g. invalid startTime/endTime).
export function mapDoctorError(error: unknown): unknown {
  if (error instanceof AvailabilityWindowConflictError || error instanceof DoctorProfileAlreadyExistsError) {
    return new ConflictError(error.message);
  }
  if (error instanceof DoctorDomainError) {
    return new ValidationError(error.message);
  }
  return error;
}
