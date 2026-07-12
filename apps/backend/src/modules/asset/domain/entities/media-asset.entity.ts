import { randomUUID } from 'node:crypto';

import { MediaAssetPurpose } from '../enums/media-asset-purpose.enum.js';
import { MediaAssetStatus } from '../enums/media-asset-status.enum.js';
import { AssetDomainError } from '../exceptions/asset-domain.error.js';
import { MediaAssetAlreadyConfirmedError } from '../exceptions/media-asset-already-confirmed.error.js';

export interface CreateUploadIntentProps {
  purpose: MediaAssetPurpose;
  contentType: string;
  sizeEstimate?: number;
}

export interface ReconstituteMediaAssetProps {
  id: string;
  purpose: MediaAssetPurpose;
  contentType: string;
  sizeEstimate?: number;
  storageKey: string;
  status: MediaAssetStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Aggregate root of AssetModule (docs/10-backend-architecture.md's
// AssetModule entry: "Owned entities: MediaAsset"). Binary content lives in
// external object storage — this entity only ever holds metadata + the
// storage key, never the file itself.
export class MediaAsset {
  private constructor(
    private readonly id: string,
    private readonly purpose: MediaAssetPurpose,
    private readonly contentType: string,
    private readonly sizeEstimate: number | undefined,
    private readonly storageKey: string,
    private status: MediaAssetStatus,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  // Represents the upload-intent step (docs/11-api-contracts.md §on Media
  // Assets): an intent is created, then confirmed once the direct-to-storage
  // upload actually completes. An unconfirmed intent is never treated as a
  // real, linked asset.
  static createIntent(props: CreateUploadIntentProps): MediaAsset {
    if (!props.contentType || props.contentType.trim().length === 0) {
      throw new AssetDomainError('contentType must not be empty.');
    }
    if (props.sizeEstimate !== undefined && props.sizeEstimate < 0) {
      throw new AssetDomainError('sizeEstimate must not be negative.');
    }

    const id = randomUUID();
    const now = new Date();

    return new MediaAsset(
      id,
      props.purpose,
      props.contentType.trim(),
      props.sizeEstimate,
      `${props.purpose}/${id}`,
      MediaAssetStatus.Pending,
      now,
      now,
    );
  }

  static reconstitute(props: ReconstituteMediaAssetProps): MediaAsset {
    return new MediaAsset(
      props.id,
      props.purpose,
      props.contentType,
      props.sizeEstimate,
      props.storageKey,
      props.status,
      props.createdAt,
      props.updatedAt,
    );
  }

  // Confirms a completed upload. Only a pending intent can be confirmed —
  // there is no re-confirmation or un-rejecting path.
  confirm(): void {
    if (this.status !== MediaAssetStatus.Pending) {
      throw new MediaAssetAlreadyConfirmedError(`MediaAsset "${this.id}" is not pending and cannot be confirmed.`);
    }
    this.status = MediaAssetStatus.Confirmed;
    this.updatedAt = new Date();
  }

  getId(): string {
    return this.id;
  }

  getPurpose(): MediaAssetPurpose {
    return this.purpose;
  }

  getContentType(): string {
    return this.contentType;
  }

  getSizeEstimate(): number | undefined {
    return this.sizeEstimate;
  }

  getStorageKey(): string {
    return this.storageKey;
  }

  getStatus(): MediaAssetStatus {
    return this.status;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }
}
