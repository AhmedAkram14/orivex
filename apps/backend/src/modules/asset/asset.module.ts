import { Module } from '@nestjs/common';

import { AuthenticationGuardsModule } from '../authentication/authentication-guards.module.js';
import { TrustGuardsModule } from '../trust/trust-guards.module.js';

import type { ObjectStoragePort } from './application/ports/object-storage.port.js';
import { MEDIA_ASSET_REPOSITORY, OBJECT_STORAGE } from './application/ports/tokens.js';
import { ConfirmUploadUseCase } from './application/use-cases/confirm-upload/confirm-upload.use-case.js';
import { CreateUploadIntentUseCase } from './application/use-cases/create-upload-intent/create-upload-intent.use-case.js';
import { GetMediaAssetUseCase } from './application/use-cases/get-media-asset/get-media-asset.use-case.js';
import { ListMediaAssetsForOwnerUseCase } from './application/use-cases/list-media-assets-for-owner/list-media-assets-for-owner.use-case.js';
import type { MediaAssetRepository } from './domain/repositories/media-asset.repository.js';
import { PrismaMediaAssetRepository } from './infrastructure/prisma/prisma-media-asset.repository.js';
import { S3ObjectStorageAdapter } from './infrastructure/storage/s3-object-storage.adapter.js';
import { MediaAssetController } from './presentation/controllers/media-asset.controller.js';

// AssetModule "depends on nothing business-specific, only the storage
// adapter" (docs/10-backend-architecture.md) — no imports of other feature
// modules, unlike DoctorModule. TrustGuardsModule is the one exception
// (Onboarding Redesign, 2026-07-21 proposal, Stage O.4): a read-only
// identity-verification-status check for clinical uploads, same
// guard-module-only shape as AuthenticationGuardsModule, not a real
// feature-module dependency.
@Module({
  imports: [AuthenticationGuardsModule, TrustGuardsModule],
  controllers: [MediaAssetController],
  providers: [
    { provide: MEDIA_ASSET_REPOSITORY, useClass: PrismaMediaAssetRepository },
    { provide: OBJECT_STORAGE, useClass: S3ObjectStorageAdapter },
    {
      provide: CreateUploadIntentUseCase,
      useFactory: (repository: MediaAssetRepository, storage: ObjectStoragePort) =>
        new CreateUploadIntentUseCase(repository, storage),
      inject: [MEDIA_ASSET_REPOSITORY, OBJECT_STORAGE],
    },
    {
      provide: ConfirmUploadUseCase,
      useFactory: (repository: MediaAssetRepository, storage: ObjectStoragePort) =>
        new ConfirmUploadUseCase(repository, storage),
      inject: [MEDIA_ASSET_REPOSITORY, OBJECT_STORAGE],
    },
    {
      provide: GetMediaAssetUseCase,
      useFactory: (repository: MediaAssetRepository, storage: ObjectStoragePort) =>
        new GetMediaAssetUseCase(repository, storage),
      inject: [MEDIA_ASSET_REPOSITORY, OBJECT_STORAGE],
    },
    {
      provide: ListMediaAssetsForOwnerUseCase,
      useFactory: (repository: MediaAssetRepository, storage: ObjectStoragePort) =>
        new ListMediaAssetsForOwnerUseCase(repository, storage),
      inject: [MEDIA_ASSET_REPOSITORY, OBJECT_STORAGE],
    },
  ],
  // OBJECT_STORAGE is also exported for HealthModule's readiness probe --
  // the only other consumer of this port outside AssetModule's own
  // use cases (Production Readiness Audit -- "add S3 reachability").
  exports: [CreateUploadIntentUseCase, ConfirmUploadUseCase, ListMediaAssetsForOwnerUseCase, OBJECT_STORAGE],
})
export class AssetModule {}
