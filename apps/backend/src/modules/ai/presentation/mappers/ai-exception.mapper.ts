import { ConflictError, ValidationError } from '../../../../shared/errors/app-error.js';
import { AIDomainError } from '../../domain/exceptions/ai-domain.error.js';
import { AISuggestionAlreadyDecidedError } from '../../domain/exceptions/ai-suggestion-already-decided.error.js';

// Translates this module's domain exceptions into the shared, HTTP-mappable
// AppError types (mirrors Identity/Doctor/Asset/Trust/Patient/Consultation/
// Clinical/Payment's exception-mapper pattern). AISuggestionAlreadyDecidedError
// is checked first since it is an AIDomainError subtype -- docs/12-openapi.md
// documents '409' for recordDoctorDecision's already-decided case
// specifically, distinct from the generic 422 used for other domain
// violations here.
export function mapAIError(error: unknown): unknown {
  if (error instanceof AISuggestionAlreadyDecidedError) {
    return new ConflictError(error.message);
  }
  if (error instanceof AIDomainError) {
    return new ValidationError(error.message);
  }
  return error;
}
