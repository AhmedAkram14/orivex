import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { MediaAsset } from '../../../domain/entities/media-asset.entity.js';
import { MediaAssetPurpose } from '../../../domain/enums/media-asset-purpose.enum.js';
import { MediaAssetStatus } from '../../../domain/enums/media-asset-status.enum.js';
import type { MediaAssetRepository } from '../../../domain/repositories/media-asset.repository.js';
import type { ObjectStoragePort } from '../../ports/object-storage.port.js';

import { CreateUploadIntentCommand } from './create-upload-intent.command.js';
import { CreateUploadIntentUseCase } from './create-upload-intent.use-case.js';

class FakeMediaAssetRepository implements MediaAssetRepository {
  public readonly saved: MediaAsset[] = [];
  async findById(): Promise<MediaAsset | null> {
    return null;
  }
  async save(asset: MediaAsset): Promise<void> {
    this.saved.push(asset);
  }
}

class FakeObjectStorage implements ObjectStoragePort {
  async createPresignedUploadUrl(storageKey: string): Promise<string> {
    return `https://storage.example.com/${storageKey}?upload=true`;
  }
  async createPresignedDownloadUrl(storageKey: string): Promise<string> {
    return `https://storage.example.com/${storageKey}?download=true`;
  }
}

describe('CreateUploadIntentUseCase', () => {
  it('creates a pending MediaAsset and returns a signed upload URL', async () => {
    const repo = new FakeMediaAssetRepository();
    const useCase = new CreateUploadIntentUseCase(repo, new FakeObjectStorage());

    const result = await useCase.execute(
      new CreateUploadIntentCommand({
        purpose: MediaAssetPurpose.DoctorCertificate,
        contentType: 'image/png',
      }),
    );

    assert.equal(result.asset.getStatus(), MediaAssetStatus.Pending);
    assert.equal(result.asset.getPurpose(), MediaAssetPurpose.DoctorCertificate);
    assert.ok(result.signedUrl.includes('upload=true'));
    assert.equal(repo.saved.length, 1);
    assert.ok(result.asset.getStorageKey().startsWith('doctor_certificate/'));
  });
});
