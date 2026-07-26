import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { MediaAsset } from '../../../domain/entities/media-asset.entity.js';
import { MediaAssetPurpose } from '../../../domain/enums/media-asset-purpose.enum.js';
import type { MediaAssetRepository } from '../../../domain/repositories/media-asset.repository.js';
import type { ObjectStoragePort } from '../../ports/object-storage.port.js';

import { GetMediaAssetCommand } from './get-media-asset.command.js';
import { GetMediaAssetUseCase } from './get-media-asset.use-case.js';

class FakeMediaAssetRepository implements MediaAssetRepository {
  constructor(private readonly asset: MediaAsset | null) {}
  async findById(): Promise<MediaAsset | null> {
    return this.asset;
  }
  async save(): Promise<void> {}
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
const ADMIN_ACCOUNT_ID = '99999999-9999-4999-8999-999999999999';
const STRANGER_ACCOUNT_ID = '22222222-2222-4222-8222-222222222222';

function buildConfirmedAsset(): MediaAsset {
  const asset = MediaAsset.createIntent({
    ownerAccountId: OWNER_ACCOUNT_ID,
    purpose: MediaAssetPurpose.NationalIdFront,
    contentType: 'image/jpeg',
  });
  asset.confirm();
  return asset;
}

describe('GetMediaAssetUseCase', () => {
  it("lets the owner fetch their own confirmed asset's signed download URL", async () => {
    const asset = buildConfirmedAsset();
    const useCase = new GetMediaAssetUseCase(new FakeMediaAssetRepository(asset), new FakeObjectStorage());

    const result = await useCase.execute(
      new GetMediaAssetCommand({ mediaAssetId: asset.getId(), callerAccountId: OWNER_ACCOUNT_ID, callerIsAdmin: false }),
    );

    assert.ok(result.signedUrl?.includes('download=true'));
  });

  // Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8): a
  // SuperAdmin reviewing a verification case did not upload the document
  // themselves -- they must still be able to open it.
  it('lets a SuperAdmin fetch a confirmed asset they do not own', async () => {
    const asset = buildConfirmedAsset();
    const useCase = new GetMediaAssetUseCase(new FakeMediaAssetRepository(asset), new FakeObjectStorage());

    const result = await useCase.execute(
      new GetMediaAssetCommand({ mediaAssetId: asset.getId(), callerAccountId: ADMIN_ACCOUNT_ID, callerIsAdmin: true }),
    );

    assert.ok(result.signedUrl?.includes('download=true'));
  });

  it('throws NotFoundError for a non-owner, non-admin caller (never leaks existence)', async () => {
    const asset = buildConfirmedAsset();
    const useCase = new GetMediaAssetUseCase(new FakeMediaAssetRepository(asset), new FakeObjectStorage());

    await assert.rejects(
      () =>
        useCase.execute(
          new GetMediaAssetCommand({ mediaAssetId: asset.getId(), callerAccountId: STRANGER_ACCOUNT_ID, callerIsAdmin: false }),
        ),
      NotFoundError,
    );
  });

  it('throws NotFoundError when the asset does not exist, even for an admin', async () => {
    const useCase = new GetMediaAssetUseCase(new FakeMediaAssetRepository(null), new FakeObjectStorage());

    await assert.rejects(
      () =>
        useCase.execute(
          new GetMediaAssetCommand({ mediaAssetId: 'missing-id', callerAccountId: ADMIN_ACCOUNT_ID, callerIsAdmin: true }),
        ),
      NotFoundError,
    );
  });

  it('returns a null signedUrl for a still-Pending asset instead of minting one', async () => {
    const asset = MediaAsset.createIntent({
      ownerAccountId: OWNER_ACCOUNT_ID,
      purpose: MediaAssetPurpose.NationalIdFront,
      contentType: 'image/jpeg',
    });
    const useCase = new GetMediaAssetUseCase(new FakeMediaAssetRepository(asset), new FakeObjectStorage());

    const result = await useCase.execute(
      new GetMediaAssetCommand({ mediaAssetId: asset.getId(), callerAccountId: OWNER_ACCOUNT_ID, callerIsAdmin: false }),
    );

    assert.equal(result.signedUrl, null);
  });
});
