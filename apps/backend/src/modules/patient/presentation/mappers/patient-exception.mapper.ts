import { NotFoundError, ValidationError } from '../../../../shared/errors/app-error.js';
import { InsuranceProviderNotFoundError } from '../../domain/exceptions/insurance-provider-not-found.error.js';
import { PatientDomainError } from '../../domain/exceptions/patient-domain.error.js';

// Translates PatientModule domain exceptions into the shared, HTTP-mappable
// AppError types the global AllExceptionsFilter already understands (mirrors
// Doctor/Identity's own exception-mapper pattern). InsuranceProviderNotFoundError
// (Onboarding Redesign, 2026-07-21 proposal, Stage O.3) is a 404 -- a
// caller-supplied insuranceProviderId that doesn't exist references a
// missing resource, not an invalid-shape input.
export function mapPatientError(error: unknown): unknown {
  if (error instanceof InsuranceProviderNotFoundError) {
    return new NotFoundError(error.message);
  }
  if (error instanceof PatientDomainError) {
    return new ValidationError(error.message);
  }
  return error;
}
