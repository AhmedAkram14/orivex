-- Production Readiness Audit finding: POST /media-assets/:id/confirm had no
-- ownership binding at all -- any authenticated caller who knew/guessed
-- another user's media asset id could mint a fresh presigned download URL
-- for it (IDOR on potentially sensitive documents/photos). MediaAsset never
-- recorded who requested the upload, so there was nothing to check against.
-- Added as NOT NULL, not backfilled -- no upload-intent producer has ever
-- gone to production yet (AssetModule's only consumer, doctor verification
-- document upload, has no confirmed rows outside local/dev testing), so
-- this is a safe, deliberate breaking change rather than a backfill problem.

-- AlterTable
ALTER TABLE "MediaAsset" ADD COLUMN "ownerAccountId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "MediaAsset_ownerAccountId_idx" ON "MediaAsset"("ownerAccountId");

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_ownerAccountId_fkey" FOREIGN KEY ("ownerAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
