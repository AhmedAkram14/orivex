import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { MediaAsset } from '../../../domain/entities/media-asset.entity.js';
import type { MediaAssetRepository } from '../../../domain/repositories/media-asset.repository.js';
import type { ObjectStoragePort } from '../../ports/object-storage.port.js';

import type { ConfirmUploadCommand } from './confirm-upload.command.js';

export interface ConfirmUploadResult {
  asset: MediaAsset;
  signedUrl: string;
}

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// asset.module.ts only. Domain exceptions (e.g. confirming an
// already-confirmed asset) propagate untouched — translation belongs to the
// presentation layer.
export class ConfirmUploadUseCase {
  constructor(
    private readonly mediaAssetRepository: MediaAssetRepository,
    private readonly objectStorage: ObjectStoragePort,
  ) {}

  async execute(command: ConfirmUploadCommand): Promise<ConfirmUploadResult> {
    const asset = await this.mediaAssetRepository.findById(command.mediaAssetId);
    if (!asset) {
      throw new NotFoundError(`MediaAsset "${command.mediaAssetId}" not found.`);
    }

    asset.confirm();
    await this.mediaAssetRepository.save(asset);

    const signedUrl = await this.objectStorage.createPresignedDownloadUrl(asset.getStorageKey());

    return { asset, signedUrl };
  }
}
