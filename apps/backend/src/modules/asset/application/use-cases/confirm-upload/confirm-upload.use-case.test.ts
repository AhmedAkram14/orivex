import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { MediaAsset } from '../../../domain/entities/media-asset.entity.js';
import { MediaAssetPurpose } from '../../../domain/enums/media-asset-purpose.enum.js';
import { MediaAssetStatus } from '../../../domain/enums/media-asset-status.enum.js';
import { MediaAssetAlreadyConfirmedError } from '../../../domain/exceptions/media-asset-already-confirmed.error.js';
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
  async findByOwner(): Promise<MediaAsset[]> {
    return this.asset ? [this.asset] : [];
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
  async checkConnectivity(): Promise<void> {}
}

const OWNER_ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';

function buildPendingAsset(ownerAccountId: string = OWNER_ACCOUNT_ID): MediaAsset {
  return MediaAsset.createIntent({
    ownerAccountId,
    purpose: MediaAssetPurpose.LabReport,
    contentType: 'application/pdf',
  });
}

describe('ConfirmUploadUseCase', () => {
  it('confirms a pending asset and returns a signed download URL', async () => {
    const asset = buildPendingAsset();
    const repo = new FakeMediaAssetRepository(asset);
    const useCase = new ConfirmUploadUseCase(repo, new FakeObjectStorage());

    const result = await useCase.execute(
      new ConfirmUploadCommand({ mediaAssetId: asset.getId(), callerAccountId: OWNER_ACCOUNT_ID }),
    );

    assert.equal(result.asset.getStatus(), MediaAssetStatus.Confirmed);
    assert.ok(result.signedUrl.includes('download=true'));
    assert.equal(repo.saved.length, 1);
  });

  it('throws NotFoundError when the asset does not exist', async () => {
    const repo = new FakeMediaAssetRepository(null);
    const useCase = new ConfirmUploadUseCase(repo, new FakeObjectStorage());

    await assert.rejects(
      () => useCase.execute(new ConfirmUploadCommand({ mediaAssetId: 'missing-id', callerAccountId: OWNER_ACCOUNT_ID })),
      NotFoundError,
    );
  });

  it('throws NotFoundError when a different account attempts to confirm someone else\'s asset', async () => {
    const asset = buildPendingAsset();
    const repo = new FakeMediaAssetRepository(asset);
    const useCase = new ConfirmUploadUseCase(repo, new FakeObjectStorage());

    await assert.rejects(
      () =>
        useCase.execute(
          new ConfirmUploadCommand({
            mediaAssetId: asset.getId(),
            callerAccountId: '99999999-9999-4999-8999-999999999999',
          }),
        ),
      NotFoundError,
    );
  });

  it('throws MediaAssetAlreadyConfirmedError when the asset is already confirmed', async () => {
    const asset = buildPendingAsset();
    asset.confirm();
    const repo = new FakeMediaAssetRepository(asset);
    const useCase = new ConfirmUploadUseCase(repo, new FakeObjectStorage());

    await assert.rejects(
      () => useCase.execute(new ConfirmUploadCommand({ mediaAssetId: asset.getId(), callerAccountId: OWNER_ACCOUNT_ID })),
      MediaAssetAlreadyConfirmedError,
    );
    assert.equal(repo.saved.length, 0);
  });
});
