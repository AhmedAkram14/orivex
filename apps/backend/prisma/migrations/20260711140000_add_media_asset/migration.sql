-- Sprint 3: AssetModule (docs/10-backend-architecture.md's AssetModule
-- entry: MediaAsset). Binary content lives in external S3-compatible
-- object storage; this table holds pointers/metadata only.

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeEstimate" INTEGER,
    "storageKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_storageKey_key" ON "MediaAsset"("storageKey");
