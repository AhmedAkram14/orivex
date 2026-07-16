import { ValidationError } from '../../../../shared/errors/app-error.js';
import { PatientDomainError } from '../../domain/exceptions/patient-domain.error.js';

// Translates PatientModule domain exceptions into the shared, HTTP-mappable
// AppError types the global AllExceptionsFilter already understands (mirrors
// Doctor/Identity's own exception-mapper pattern). Every PatientDomainError
// today is a structural-invariant violation (e.g. an emergency contact with
// no name), so all map to 422 -- no state-conflict subtype exists yet.
export function mapPatientError(error: unknown): unknown {
  if (error instanceof PatientDomainError) {
    return new ValidationError(error.message);
  }
  return error;
}
