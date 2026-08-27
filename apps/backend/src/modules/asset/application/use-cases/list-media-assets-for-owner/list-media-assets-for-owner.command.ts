import type { MediaAssetPurpose } from '../../../domain/enums/media-asset-purpose.enum.js';

export interface ListMediaAssetsForOwnerCommand {
  ownerAccountId: string;
  purposes?: MediaAssetPurpose[];
}
