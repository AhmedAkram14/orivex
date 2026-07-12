import { ConflictError, ValidationError } from '../../../../shared/errors/app-error.js';
import { AssetDomainError } from '../../domain/exceptions/asset-domain.error.js';
import { MediaAssetAlreadyConfirmedError } from '../../domain/exceptions/media-asset-already-confirmed.error.js';

// Mirrors Identity/Doctor's exception-mapper pattern: translates this
// module's domain exceptions into the shared, HTTP-mappable AppError types
// the global AllExceptionsFilter already understands. MediaAssetAlreadyConfirmedError
// is checked first since it is an AssetDomainError subtype -- a MediaAsset
// state conflict is a 409, distinct from the generic 422 used for other
// domain violations in this module.
export function mapAssetError(error: unknown): unknown {
  if (error instanceof MediaAssetAlreadyConfirmedError) {
    return new ConflictError(error.message);
  }
  if (error instanceof AssetDomainError) {
    return new ValidationError(error.message);
  }
  return error;
}
