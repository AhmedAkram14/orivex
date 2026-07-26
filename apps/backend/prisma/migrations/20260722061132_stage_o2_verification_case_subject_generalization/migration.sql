-- Onboarding Redesign (2026-07-21 proposal, Stage O.2): generalizes
-- VerificationCase from Doctor-only to any verification subject. Every
-- existing row is a Doctor case today -- backfilled explicitly below via a
-- join through DoctorProfile before doctorId is dropped, so no existing
-- verification history is lost.

-- CreateEnum
CREATE TYPE "VerificationSubjectType" AS ENUM ('DOCTOR', 'PATIENT');

-- AlterTable: add the new columns nullable first so existing rows survive
-- the ADD COLUMN step; backfilled below, then tightened to NOT NULL.
ALTER TABLE "VerificationCase"
  ADD COLUMN "subjectAccountId" TEXT,
  ADD COLUMN "subjectType" "VerificationSubjectType";

-- Backfill: every existing VerificationCase row is a Doctor case, referencing
-- doctorId (DoctorProfile.id). subjectAccountId becomes that profile's owning
-- Account -- the same translation PromoteDoctorRoleOnVerificationHandler used
-- to perform at read-time, now done once, here.
UPDATE "VerificationCase" vc
SET "subjectAccountId" = dp."accountId",
    "subjectType" = 'DOCTOR'
FROM "DoctorProfile" dp
WHERE vc."doctorId" = dp."id";

-- AlterTable: now safe to require both columns going forward.
ALTER TABLE "VerificationCase"
  ALTER COLUMN "subjectAccountId" SET NOT NULL,
  ALTER COLUMN "subjectType" SET NOT NULL,
  ALTER COLUMN "licenseNumber" DROP NOT NULL,
  ALTER COLUMN "specialtyCode" DROP NOT NULL;

-- DropForeignKey / DropIndex / drop doctorId -- nothing reads it anymore
-- (repository joins DoctorProfile.accountId = VerificationCase.subjectAccountId
-- at query time instead of storing a second identifier on this aggregate).
ALTER TABLE "VerificationCase" DROP CONSTRAINT "VerificationCase_doctorId_fkey";
DROP INDEX "VerificationCase_doctorId_idx";
ALTER TABLE "VerificationCase" DROP COLUMN "doctorId";

-- CreateIndex
CREATE INDEX "VerificationCase_subjectAccountId_idx" ON "VerificationCase"("subjectAccountId");
CREATE INDEX "VerificationCase_subjectType_idx" ON "VerificationCase"("subjectType");

-- AddForeignKey
ALTER TABLE "VerificationCase" ADD CONSTRAINT "VerificationCase_subjectAccountId_fkey" FOREIGN KEY ("subjectAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
