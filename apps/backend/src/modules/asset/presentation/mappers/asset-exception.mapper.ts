import { ValidationError } from '../../../../shared/errors/app-error.js';
import { AssetDomainError } from '../../domain/exceptions/asset-domain.error.js';

// Mirrors Identity/Doctor's exception-mapper pattern: translates this
// module's domain exceptions into the shared, HTTP-mappable AppError types
// the global AllExceptionsFilter already understands.
export function mapAssetError(error: unknown): unknown {
  if (error instanceof AssetDomainError) {
    return new ValidationError(error.message);
  }
  return error;
}
