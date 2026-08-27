import type { MediaAsset } from '../../domain/entities/media-asset.entity.js';
import type { MediaAssetPurpose } from '../../domain/enums/media-asset-purpose.enum.js';

// A list-item shape for ListMediaAssetsForOwnerUseCase's results -- distinct
// from MediaAssetResponseDto (the single-asset GET /:id shape, which also
// carries `status`) since every consumer of a list only ever wants Confirmed
// assets. storageKey stays excluded, same as MediaAssetResponseDto.
export class MediaAssetListItemResponseDto {
  id!: string;
  purpose!: MediaAssetPurpose;
  contentType!: string;
  createdAt!: string;
  signedUrl!: string | null;

  static fromDomain(asset: MediaAsset, signedUrl: string | null): MediaAssetListItemResponseDto {
    const dto = new MediaAssetListItemResponseDto();
    dto.id = asset.getId();
    dto.purpose = asset.getPurpose();
    dto.contentType = asset.getContentType();
    dto.createdAt = asset.getCreatedAt().toISOString();
    dto.signedUrl = signedUrl;
    return dto;
  }
}
