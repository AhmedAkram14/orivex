import type { MediaAsset } from '../../domain/entities/media-asset.entity.js';
import type { MediaAssetPurpose } from '../../domain/enums/media-asset-purpose.enum.js';
import type { MediaAssetStatus } from '../../domain/enums/media-asset-status.enum.js';

// Matches docs/12-openapi.md's MediaAsset schema exactly. storageKey is
// deliberately excluded — an internal object-storage reference, never
// client-facing (the signedUrl is how clients actually access the object).
export class MediaAssetResponseDto {
  id!: string;
  purpose!: MediaAssetPurpose;
  contentType!: string;
  status!: MediaAssetStatus;
  signedUrl!: string | null;

  static fromDomain(asset: MediaAsset, signedUrl: string | null): MediaAssetResponseDto {
    const dto = new MediaAssetResponseDto();
    dto.id = asset.getId();
    dto.purpose = asset.getPurpose();
    dto.contentType = asset.getContentType();
    dto.status = asset.getStatus();
    dto.signedUrl = signedUrl;
    return dto;
  }
}
