import type { MediaAsset } from '../../../domain/entities/media-asset.entity.js';
import { MediaAssetStatus } from '../../../domain/enums/media-asset-status.enum.js';
import type { MediaAssetRepository } from '../../../domain/repositories/media-asset.repository.js';
import type { ObjectStoragePort } from '../../ports/object-storage.port.js';

import type { ListMediaAssetsForOwnerCommand } from './list-media-assets-for-owner.command.js';

export interface MediaAssetWithUrl {
  asset: MediaAsset;
  signedUrl: string | null;
}

// The first list-by-owner capability this module has ever exposed (previous
// reads were always by known asset id -- see GetMediaAssetUseCase's own
// comment). A still-Pending intent has no confirmed object in storage yet,
// same rule as GetMediaAssetUseCase: no signed URL, but it's still returned
// so a caller can see an in-progress upload rather than it silently vanishing.
export class ListMediaAssetsForOwnerUseCase {
  constructor(
    private readonly mediaAssetRepository: MediaAssetRepository,
    private readonly objectStorage: ObjectStoragePort,
  ) {}

  async execute(command: ListMediaAssetsForOwnerCommand): Promise<MediaAssetWithUrl[]> {
    const assets = await this.mediaAssetRepository.findByOwner(command.ownerAccountId, command.purposes);

    return Promise.all(
      assets.map(async (asset) => ({
        asset,
        signedUrl:
          asset.getStatus() === MediaAssetStatus.Confirmed
            ? await this.objectStorage.createPresignedDownloadUrl(asset.getStorageKey())
            : null,
      })),
    );
  }
}
