import { ValidationError } from '../../../../shared/errors/app-error.js';
import { DoctorDomainError } from '../../domain/exceptions/doctor-domain.error.js';

// Translates DoctorModule domain exceptions into the shared, HTTP-mappable
// AppError types the global AllExceptionsFilter already understands (mirrors
// Identity's identity-exception.mapper.ts pattern).
export function mapDoctorError(error: unknown): unknown {
  if (error instanceof DoctorDomainError) {
    return new ValidationError(error.message);
  }
  return error;
}
