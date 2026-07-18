import type { MediaAsset as PrismaMediaAssetRow } from '@prisma/client';

import { MediaAsset } from '../../domain/entities/media-asset.entity.js';
import { MediaAssetPurpose } from '../../domain/enums/media-asset-purpose.enum.js';
import { MediaAssetStatus } from '../../domain/enums/media-asset-status.enum.js';

export function toDomainMediaAsset(row: PrismaMediaAssetRow): MediaAsset {
  return MediaAsset.reconstitute({
    id: row.id,
    ownerAccountId: row.ownerAccountId,
    purpose: row.purpose as MediaAssetPurpose,
    contentType: row.contentType,
    sizeEstimate: row.sizeEstimate ?? undefined,
    storageKey: row.storageKey,
    status: row.status as MediaAssetStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
