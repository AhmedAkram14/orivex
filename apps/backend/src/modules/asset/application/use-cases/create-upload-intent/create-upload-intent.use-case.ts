import { MediaAsset } from '../../../domain/entities/media-asset.entity.js';
import type { MediaAssetRepository } from '../../../domain/repositories/media-asset.repository.js';
import type { ObjectStoragePort } from '../../ports/object-storage.port.js';

import type { CreateUploadIntentCommand } from './create-upload-intent.command.js';

export interface CreateUploadIntentResult {
  asset: MediaAsset;
  signedUrl: string;
}

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// asset.module.ts only.
//
// docs/11-api-contracts.md: direct-to-storage upload avoids routing binary
// payloads through the application server at all — this use case only ever
// issues a signed URL and records intent metadata.
export class CreateUploadIntentUseCase {
  constructor(
    private readonly mediaAssetRepository: MediaAssetRepository,
    private readonly objectStorage: ObjectStoragePort,
  ) {}

  async execute(command: CreateUploadIntentCommand): Promise<CreateUploadIntentResult> {
    const asset = MediaAsset.createIntent({
      ownerAccountId: command.ownerAccountId,
      purpose: command.purpose,
      contentType: command.contentType,
      sizeEstimate: command.sizeEstimate,
    });

    await this.mediaAssetRepository.save(asset);
    const signedUrl = await this.objectStorage.createPresignedUploadUrl(
      asset.getStorageKey(),
      asset.getContentType(),
    );

    return { asset, signedUrl };
  }
}
