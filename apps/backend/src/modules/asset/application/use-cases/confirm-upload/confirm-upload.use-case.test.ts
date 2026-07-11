import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { MediaAsset } from '../../../domain/entities/media-asset.entity.js';
import { MediaAssetPurpose } from '../../../domain/enums/media-asset-purpose.enum.js';
import { MediaAssetStatus } from '../../../domain/enums/media-asset-status.enum.js';
import { AssetDomainError } from '../../../domain/exceptions/asset-domain.error.js';
import type { MediaAssetRepository } from '../../../domain/repositories/media-asset.repository.js';
import type { ObjectStoragePort } from '../../ports/object-storage.port.js';

import { ConfirmUploadCommand } from './confirm-upload.command.js';
import { ConfirmUploadUseCase } from './confirm-upload.use-case.js';

class FakeMediaAssetRepository implements MediaAssetRepository {
  public readonly saved: MediaAsset[] = [];
  constructor(private readonly asset: MediaAsset | null) {}
  async findById(): Promise<MediaAsset | null> {
    return this.asset;
  }
  async save(asset: MediaAsset): Promise<void> {
    this.saved.push(asset);
  }
}

class FakeObjectStorage implements ObjectStoragePort {
  async createPresignedUploadUrl(): Promise<string> {
    return 'unused';
  }
  async createPresignedDownloadUrl(storageKey: string): Promise<string> {
    return `https://storage.example.com/${storageKey}?download=true`;
  }
}

function buildPendingAsset(): MediaAsset {
  return MediaAsset.createIntent({ purpose: MediaAssetPurpose.LabReport, contentType: 'application/pdf' });
}

describe('ConfirmUploadUseCase', () => {
  it('confirms a pending asset and returns a signed download URL', async () => {
    const asset = buildPendingAsset();
    const repo = new FakeMediaAssetRepository(asset);
    const useCase = new ConfirmUploadUseCase(repo, new FakeObjectStorage());

    const result = await useCase.execute(new ConfirmUploadCommand({ mediaAssetId: asset.getId() }));

    assert.equal(result.asset.getStatus(), MediaAssetStatus.Confirmed);
    assert.ok(result.signedUrl.includes('download=true'));
    assert.equal(repo.saved.length, 1);
  });

  it('throws NotFoundError when the asset does not exist', async () => {
    const repo = new FakeMediaAssetRepository(null);
    const useCase = new ConfirmUploadUseCase(repo, new FakeObjectStorage());

    await assert.rejects(
      () => useCase.execute(new ConfirmUploadCommand({ mediaAssetId: 'missing-id' })),
      NotFoundError,
    );
  });

  it('throws AssetDomainError when the asset is already confirmed', async () => {
    const asset = buildPendingAsset();
    asset.confirm();
    const repo = new FakeMediaAssetRepository(asset);
    const useCase = new ConfirmUploadUseCase(repo, new FakeObjectStorage());

    await assert.rejects(
      () => useCase.execute(new ConfirmUploadCommand({ mediaAssetId: asset.getId() })),
      AssetDomainError,
    );
    assert.equal(repo.saved.length, 0);
  });
});
