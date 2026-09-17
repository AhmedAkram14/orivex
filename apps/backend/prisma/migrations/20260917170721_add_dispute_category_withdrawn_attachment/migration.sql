-- CreateEnum
CREATE TYPE "DisputeCategory" AS ENUM ('NO_SHOW', 'PAYMENT_REFUND', 'CONDUCT', 'TECHNICAL_ISSUE', 'OTHER');

-- AlterEnum
ALTER TYPE "DisputeStatus" ADD VALUE 'WITHDRAWN';

-- AlterTable
ALTER TABLE "Dispute" ADD COLUMN     "attachmentAssetId" TEXT,
ADD COLUMN     "category" "DisputeCategory";
