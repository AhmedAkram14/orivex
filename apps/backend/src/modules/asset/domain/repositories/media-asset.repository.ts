import type { MediaAsset } from '../entities/media-asset.entity.js';
import type { MediaAssetPurpose } from '../enums/media-asset-purpose.enum.js';

export interface MediaAssetRepository {
  findById(id: string): Promise<MediaAsset | null>;
  /** Newest first. `purposes` narrows to a subset (e.g. clinical-only, excluding identity-verification uploads) when provided. */
  findByOwner(ownerAccountId: string, purposes?: MediaAssetPurpose[]): Promise<MediaAsset[]>;
  save(asset: MediaAsset): Promise<void>;
}
