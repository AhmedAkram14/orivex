import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { MediaAsset } from '../../../domain/entities/media-asset.entity.js';
import { MediaAssetStatus } from '../../../domain/enums/media-asset-status.enum.js';
import type { MediaAssetRepository } from '../../../domain/repositories/media-asset.repository.js';
import type { ObjectStoragePort } from '../../ports/object-storage.port.js';

import type { GetMediaAssetCommand } from './get-media-asset.command.js';

export interface GetMediaAssetResult {
  asset: MediaAsset;
  signedUrl: string | null;
}

// Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8): the
// first read/download capability this module has ever exposed --
// `ObjectStoragePort.createPresignedDownloadUrl` already existed (used
// internally by ConfirmUploadUseCase to hand the uploader their own asset
// back) but nothing let anyone, owner or admin, re-fetch it later. Same
// "never leak existence to a non-owner" 404 pattern as ConfirmUploadUseCase
// -- a SuperAdmin reviewing a verification case is the one caller allowed to
// bypass the ownership check, since verification documents must be
// reviewable by the admin who didn't upload them.
export class GetMediaAssetUseCase {
  constructor(
    private readonly mediaAssetRepository: MediaAssetRepository,
    private readonly objectStorage: ObjectStoragePort,
  ) {}

  async execute(command: GetMediaAssetCommand): Promise<GetMediaAssetResult> {
    const asset = await this.mediaAssetRepository.findById(command.mediaAssetId);
    const isOwner = asset?.getOwnerAccountId() === command.callerAccountId;
    if (!asset || (!isOwner && !command.callerIsAdmin)) {
      throw new NotFoundError(`MediaAsset "${command.mediaAssetId}" not found.`);
    }

    // A still-Pending intent has no confirmed object in storage yet -- no
    // signed URL to hand back, but the caller may still legitimately query
    // its metadata (e.g. an admin checking upload progress).
    const signedUrl =
      asset.getStatus() === MediaAssetStatus.Confirmed
        ? await this.objectStorage.createPresignedDownloadUrl(asset.getStorageKey())
        : null;

    return { asset, signedUrl };
  }
}
