-- CreateEnum
CREATE TYPE "ReviewModerationStatus" AS ENUM ('VISIBLE', 'FLAGGED', 'HIDDEN');

-- AlterTable
ALTER TABLE "ConsultationFeedback" ADD COLUMN     "moderationStatus" "ReviewModerationStatus" NOT NULL DEFAULT 'VISIBLE',
ADD COLUMN     "moderationReason" TEXT,
ADD COLUMN     "moderatedByAccountId" TEXT,
ADD COLUMN     "moderatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ConsultationFeedback_moderationStatus_idx" ON "ConsultationFeedback"("moderationStatus");
