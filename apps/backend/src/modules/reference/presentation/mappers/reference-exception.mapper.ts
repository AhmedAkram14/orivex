import { ConflictError, ValidationError } from '../../../../shared/errors/app-error.js';
import { CountryAlreadyExistsError } from '../../domain/exceptions/country-already-exists.error.js';
import { InsuranceProviderAlreadyExistsError } from '../../domain/exceptions/insurance-provider-already-exists.error.js';
import { MedicalSpecialtyAlreadyExistsError } from '../../domain/exceptions/medical-specialty-already-exists.error.js';
import { ReferenceDomainError } from '../../domain/exceptions/reference-domain.error.js';

// Translates ReferenceModule domain exceptions into the shared,
// HTTP-mappable AppError types the global AllExceptionsFilter already
// understands (mirrors Administration's/Identity's own exception-mapper
// pattern). NotFoundError-shaped failures pass through unchanged.
export function mapReferenceError(error: unknown): unknown {
  if (
    error instanceof MedicalSpecialtyAlreadyExistsError ||
    error instanceof CountryAlreadyExistsError ||
    error instanceof InsuranceProviderAlreadyExistsError
  ) {
    return new ConflictError(error.message);
  }
  if (error instanceof ReferenceDomainError) {
    return new ValidationError(error.message);
  }
  return error;
}
