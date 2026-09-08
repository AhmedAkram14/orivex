-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'LAB_REQUEST_ORDERED';

-- AlterTable
-- (kept in the same migration as the enum add above -- no INSERT in this
-- file references the new enum value, so PostgreSQL 12+ allows both in one
-- transaction, matching this repo's prior AI-suggestion audit-action
-- migration precedent.)
ALTER TABLE "ConsultationFeedback" ADD COLUMN     "communicationRating" INTEGER,
ADD COLUMN     "punctualityRating" INTEGER,
ADD COLUMN     "thoroughnessRating" INTEGER;

-- CreateEnum
CREATE TYPE "LabRequestStatus" AS ENUM ('ORDERED', 'CANCELLED');

-- CreateTable
CREATE TABLE "LabRequest" (
    "id" TEXT NOT NULL,
    "consultationSessionId" TEXT NOT NULL,
    "authoringDoctorId" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "clinicalReason" TEXT,
    "instructions" TEXT,
    "status" "LabRequestStatus" NOT NULL DEFAULT 'ORDERED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LabRequest_consultationSessionId_idx" ON "LabRequest"("consultationSessionId");

-- CreateIndex
CREATE INDEX "LabRequest_authoringDoctorId_idx" ON "LabRequest"("authoringDoctorId");

-- AddForeignKey
ALTER TABLE "LabRequest" ADD CONSTRAINT "LabRequest_consultationSessionId_fkey" FOREIGN KEY ("consultationSessionId") REFERENCES "ConsultationSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabRequest" ADD CONSTRAINT "LabRequest_authoringDoctorId_fkey" FOREIGN KEY ("authoringDoctorId") REFERENCES "DoctorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
