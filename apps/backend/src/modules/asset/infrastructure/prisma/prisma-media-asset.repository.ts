import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { MediaAsset } from '../../domain/entities/media-asset.entity.js';
import type { MediaAssetRepository } from '../../domain/repositories/media-asset.repository.js';

import { toDomainMediaAsset } from './media-asset.mapper.js';

@Injectable()
export class PrismaMediaAssetRepository implements MediaAssetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<MediaAsset | null> {
    const row = await this.prisma.mediaAsset.findUnique({ where: { id } });
    return row ? toDomainMediaAsset(row) : null;
  }

  async save(asset: MediaAsset): Promise<void> {
    const data = {
      purpose: asset.getPurpose(),
      contentType: asset.getContentType(),
      sizeEstimate: asset.getSizeEstimate() ?? null,
      storageKey: asset.getStorageKey(),
      status: asset.getStatus(),
    };

    await this.prisma.mediaAsset.upsert({
      where: { id: asset.getId() },
      create: { id: asset.getId(), ...data },
      update: data,
    });
  }
}
