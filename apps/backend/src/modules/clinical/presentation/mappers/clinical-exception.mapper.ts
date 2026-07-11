import { ValidationError } from '../../../../shared/errors/app-error.js';
import { ClinicalDomainError } from '../../domain/exceptions/clinical-domain.error.js';

// Translates this module's domain exceptions into the shared, HTTP-mappable
// AppError types (mirrors Identity/Doctor/Asset/Trust/Patient/Consultation/
// Payment's exception-mapper pattern).
export function mapClinicalError(error: unknown): unknown {
  if (error instanceof ClinicalDomainError) {
    return new ValidationError(error.message);
  }
  return error;
}
