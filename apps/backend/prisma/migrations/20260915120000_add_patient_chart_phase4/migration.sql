-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'PATIENT_CHART_CONDITION_ADDED';
ALTER TYPE "AuditAction" ADD VALUE 'PATIENT_CHART_DOCUMENT_UPLOAD_INTENT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PATIENT_CHART_DOCUMENT_UPLOADED';
ALTER TYPE "AuditAction" ADD VALUE 'PATIENT_ALLERGIES_CONFIRMED_NONE';

-- AlterTable
ALTER TABLE "PatientProfile" ADD COLUMN     "allergiesConfirmedNoneAt" TIMESTAMP(3);
