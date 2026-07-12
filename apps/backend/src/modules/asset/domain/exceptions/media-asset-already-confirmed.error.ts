import { AssetDomainError } from './asset-domain.error.js';

// Distinct subtype (mirrors Payment's PaymentAuthorizationFailedError
// precedent for a genuinely distinct, HTTP-status-relevant outcome) -- a
// MediaAsset that is not pending (already confirmed) is a state conflict,
// a 409, not the generic 422 used for other domain violations in this
// module (e.g. invalid contentType/sizeEstimate).
export class MediaAssetAlreadyConfirmedError extends AssetDomainError {}
