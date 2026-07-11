import type { MediaAsset } from '../entities/media-asset.entity.js';

export interface MediaAssetRepository {
  findById(id: string): Promise<MediaAsset | null>;
  save(asset: MediaAsset): Promise<void>;
}
